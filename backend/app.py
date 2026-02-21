import os
from flask import Flask, jsonify, send_from_directory, session, redirect, request
from sqlalchemy import text
from config import Config
from extensions import db, cors
from routes import auth_bp, categories_bp, menu_bp, orders_bp, stats_bp, users_bp, payments_bp


def _sqlite_column_exists(table_name, column_name):
    query = text(f'PRAGMA table_info("{table_name}")')
    rows = db.session.execute(query).fetchall()
    return any(row[1] == column_name for row in rows)


def _apply_sqlite_compat_migrations():
    # Lightweight migration path for existing sqlite files without Alembic.
    if not str(db.engine.url).startswith('sqlite'):
        return
    if not _sqlite_column_exists('menu_item', 'stock'):
        db.session.execute(text("ALTER TABLE menu_item ADD COLUMN stock INTEGER DEFAULT 0 NOT NULL"))
    if not _sqlite_column_exists('menu_item', 'category_id'):
        db.session.execute(text("ALTER TABLE menu_item ADD COLUMN category_id INTEGER"))
    if not _sqlite_column_exists('order', 'validated_at'):
        db.session.execute(text("ALTER TABLE 'order' ADD COLUMN validated_at DATETIME"))
    if not _sqlite_column_exists('order', 'payment_provider'):
        db.session.execute(text("ALTER TABLE 'order' ADD COLUMN payment_provider VARCHAR(20) DEFAULT 'none' NOT NULL"))
    if not _sqlite_column_exists('order', 'payment_status'):
        db.session.execute(text("ALTER TABLE 'order' ADD COLUMN payment_status VARCHAR(20) DEFAULT 'not_required' NOT NULL"))
    if not _sqlite_column_exists('order', 'payment_reference'):
        db.session.execute(text("ALTER TABLE 'order' ADD COLUMN payment_reference VARCHAR(255)"))
    db.session.commit()

def create_app():
    app = Flask(__name__, static_folder='../frontend', static_url_path='/')
    app.config.from_object(Config)

    cors.init_app(app)
    db.init_app(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(categories_bp)
    app.register_blueprint(menu_bp)
    app.register_blueprint(orders_bp)
    app.register_blueprint(payments_bp)
    app.register_blueprint(stats_bp)
    app.register_blueprint(users_bp)

    with app.app_context():
        db.create_all()
        _apply_sqlite_compat_migrations()

    def _is_authenticated():
        return bool(session.get('user_id'))

    @app.get('/login')
    def login_page():
        if _is_authenticated():
            return redirect('/dashboard')
        return send_from_directory(app.static_folder, 'index.html')

    @app.get('/dashboard')
    def dashboard_page():
        if not _is_authenticated():
            return redirect('/login')
        return send_from_directory(app.static_folder, 'index.html')

    @app.get('/')
    def index():
        if not _is_authenticated():
            return redirect('/login')
        return redirect('/dashboard')

    @app.get('/<path:path>')
    def static_proxy(path):
        if path.startswith('api/'):
            return jsonify({'message': 'Ressource API introuvable.'}), 404
        file_path = os.path.join(app.static_folder, path)
        if os.path.exists(file_path):
            return send_from_directory(app.static_folder, path)
        if not _is_authenticated():
            return redirect('/login')
        return send_from_directory(app.static_folder, 'index.html')

    @app.errorhandler(404)
    def not_found(error):
        if request.path.startswith('/api/'):
            return jsonify({'message': 'Ressource introuvable.'}), 404
        if not _is_authenticated():
            return redirect('/login')
        return jsonify({'message': 'Ressource introuvable.'}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'message': 'Erreur interne du serveur.'}), 500

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)
