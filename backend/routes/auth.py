from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db
from models import User
from utils.auth import login_required

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@bp.post('/register')
def register():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    if not name or not email or not password:
        return jsonify({'message': 'Champs requis manquants.'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'message': 'Email déjà utilisé.'}), 409

    user = User(
        name=name,
        email=email,
        password_hash=generate_password_hash(password),
        role='client'
    )
    db.session.add(user)
    db.session.commit()

    session['user_id'] = user.id
    session['user_role'] = user.role
    return jsonify({'user': user.to_dict()})

@bp.post('/login')
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'message': 'Identifiants invalides.'}), 401

    session['user_id'] = user.id
    session['user_role'] = user.role
    return jsonify({'user': user.to_dict()})

@bp.get('/me')
@login_required
def me():
    user = User.query.get(session.get('user_id'))
    if not user:
        return jsonify({'message': 'Utilisateur introuvable.'}), 404
    return jsonify(user.to_dict())


@bp.post('/logout')
def logout():
    session.clear()
    return jsonify({'message': 'Déconnexion réussie.'})
