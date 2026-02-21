from flask import Blueprint, request, jsonify
from extensions import db
from models import MenuItem, Category
from utils.auth import login_required, role_required, ROLE_ADMIN

bp = Blueprint('menu', __name__, url_prefix='/api/menu')


def _get_default_category():
    category = Category.query.filter(db.func.lower(Category.name) == 'plats').first()
    if category:
        return category
    category = Category(name='Plats')
    db.session.add(category)
    db.session.flush()
    return category


def _parse_price_and_stock(data, current_price=None, current_stock=None):
    raw_price = data.get('price', current_price)
    raw_stock = data.get('stock', current_stock if current_stock is not None else 0)
    try:
        price_value = float(raw_price)
    except (TypeError, ValueError):
        return None, None, jsonify({'message': 'Prix invalide.'}), 400
    try:
        stock_value = int(raw_stock)
    except (TypeError, ValueError):
        return None, None, jsonify({'message': 'Stock invalide.'}), 400
    if price_value < 100:
        return None, None, jsonify({'message': 'Le prix minimum est 100 FCFA.'}), 400
    if stock_value < 0:
        return None, None, jsonify({'message': 'Le stock ne peut pas être négatif.'}), 400
    return price_value, stock_value, None, None


def _resolve_category_id(raw_category_id):
    if raw_category_id is None:
        return _get_default_category().id
    try:
        category_id = int(raw_category_id)
    except (TypeError, ValueError):
        return None
    if not Category.query.get(category_id):
        return None
    return category_id

@bp.get('')
def list_menu():
    items = MenuItem.query.order_by(MenuItem.created_at.desc()).all()
    return jsonify([item.to_dict() for item in items])

@bp.post('')
@login_required
@role_required(ROLE_ADMIN)
def create_menu_item():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    description = data.get('description', '').strip()
    price = data.get('price')
    image_url = data.get('image_url', '').strip()
    category_id = data.get('category_id')

    if not name or not description or price is None:
        return jsonify({'message': 'Champs requis manquants.'}), 400
    price_value, stock_value, error_response, status_code = _parse_price_and_stock(data)
    if error_response:
        return error_response, status_code
    category_id_value = _resolve_category_id(category_id)
    if category_id_value is None:
        return jsonify({'message': 'Catégorie invalide.'}), 400

    item = MenuItem(
        name=name,
        description=description,
        price=price_value,
        stock=stock_value,
        category_id=category_id_value,
        image_url=image_url
    )
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201

@bp.put('/<int:item_id>')
@login_required
@role_required(ROLE_ADMIN)
def update_menu_item(item_id):
    item = MenuItem.query.get_or_404(item_id)
    data = request.get_json() or {}

    item.name = data.get('name', item.name).strip()
    item.description = data.get('description', item.description).strip()
    new_price, new_stock, error_response, status_code = _parse_price_and_stock(
        data,
        current_price=item.price,
        current_stock=item.stock
    )
    if error_response:
        return error_response, status_code
    item.price = new_price
    item.stock = new_stock
    if 'category_id' in data:
        category_id_value = _resolve_category_id(data.get('category_id'))
        if category_id_value is None:
            return jsonify({'message': 'Catégorie invalide.'}), 400
        item.category_id = category_id_value
    item.image_url = data.get('image_url', item.image_url).strip() if data.get('image_url') is not None else item.image_url

    db.session.commit()
    return jsonify(item.to_dict())

@bp.delete('/<int:item_id>')
@login_required
@role_required(ROLE_ADMIN)
def delete_menu_item(item_id):
    item = MenuItem.query.get_or_404(item_id)
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'Plat supprimé.'})
