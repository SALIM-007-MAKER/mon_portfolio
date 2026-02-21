from flask import Blueprint, request, jsonify
from extensions import db
from models import Category, MenuItem
from utils.auth import login_required, role_required, ROLE_ADMIN, ROLE_STAFF, ROLE_SERVER

bp = Blueprint('categories', __name__, url_prefix='/api/categories')


@bp.get('')
@login_required
@role_required(ROLE_ADMIN, ROLE_STAFF, ROLE_SERVER)
def list_categories():
    categories = Category.query.order_by(Category.name.asc()).all()
    return jsonify([category.to_dict() for category in categories])


@bp.post('')
@login_required
@role_required(ROLE_ADMIN)
def create_category():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'message': 'Nom de catégorie requis.'}), 400
    existing = Category.query.filter(db.func.lower(Category.name) == name.lower()).first()
    if existing:
        return jsonify({'message': 'Cette catégorie existe déjà.'}), 409
    category = Category(name=name)
    db.session.add(category)
    db.session.commit()
    return jsonify(category.to_dict()), 201


@bp.put('/<int:category_id>')
@login_required
@role_required(ROLE_ADMIN)
def update_category(category_id):
    category = Category.query.get_or_404(category_id)
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'message': 'Nom de catégorie requis.'}), 400
    existing = Category.query.filter(db.func.lower(Category.name) == name.lower(), Category.id != category.id).first()
    if existing:
        return jsonify({'message': 'Cette catégorie existe déjà.'}), 409
    category.name = name
    db.session.commit()
    return jsonify(category.to_dict())


@bp.delete('/<int:category_id>')
@login_required
@role_required(ROLE_ADMIN)
def delete_category(category_id):
    category = Category.query.get_or_404(category_id)
    if MenuItem.query.filter_by(category_id=category.id).first():
        return jsonify({'message': 'Impossible de supprimer: des plats utilisent cette catégorie.'}), 400
    db.session.delete(category)
    db.session.commit()
    return jsonify({'message': 'Catégorie supprimée.'})
