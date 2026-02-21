from datetime import datetime
from flask import Blueprint, request, jsonify
from extensions import db
from models import Order, OrderItem, MenuItem
from utils.auth import login_required, role_required, get_current_identity, ROLE_ADMIN, ROLE_STAFF, ROLE_SERVER, ROLE_CLIENT

bp = Blueprint('orders', __name__, url_prefix='/api/orders')

ALLOWED_STATUSES = ['draft', 'en_preparation', 'prete', 'livree']


def _can_access_order(identity, order):
    role = identity.get('role')
    return role in [ROLE_ADMIN, ROLE_STAFF, ROLE_SERVER] or order.user_id == identity.get('id')


def _validate_status_value(status):
    return status in ['en_preparation', 'prete', 'livree']


def _build_order_from_payload(order, items_payload):
    if not items_payload:
        return jsonify({'message': 'Aucun article dans la commande.'}), 400
    order.items = []
    aggregated = {}
    for row in items_payload:
        try:
            menu_item_id = int(row.get('menu_item_id'))
            quantity = int(row.get('quantity', 1))
        except (TypeError, ValueError):
            continue
        if quantity < 1:
            continue
        aggregated[menu_item_id] = aggregated.get(menu_item_id, 0) + quantity
    if not aggregated:
        return jsonify({'message': 'Aucun article valide dans la commande.'}), 400
    menu_items = {item.id: item for item in MenuItem.query.filter(MenuItem.id.in_(aggregated.keys())).all()}
    for menu_item_id, quantity in aggregated.items():
        menu_item = menu_items.get(menu_item_id)
        if not menu_item:
            continue
        order.items.append(
            OrderItem(
                order=order,
                menu_item=menu_item,
                quantity=quantity,
                unit_price=menu_item.price
            )
        )
    if not order.items:
        return jsonify({'message': 'Aucun article valide dans la commande.'}), 400
    return None, None


def _validate_and_decrease_stock(order):
    for item in order.items:
        if item.menu_item.stock < item.quantity:
            return jsonify({
                'message': f"Stock insuffisant pour {item.menu_item.name}. Stock actuel: {item.menu_item.stock}."
            }), 400
    for item in order.items:
        item.menu_item.stock -= item.quantity
    order.status = 'en_preparation'
    order.validated_at = datetime.utcnow()
    return None, None


@bp.post('')
@login_required
@role_required(ROLE_CLIENT, ROLE_ADMIN, ROLE_STAFF, ROLE_SERVER)
def create_order():
    identity = get_current_identity()
    data = request.get_json() or {}
    items = data.get('items', [])

    order = Order(user_id=identity['id'], status='draft')
    db.session.add(order)
    error_response, status_code = _build_order_from_payload(order, items)
    if error_response:
        db.session.rollback()
        return error_response, status_code

    error_response, status_code = _validate_and_decrease_stock(order)
    if error_response:
        db.session.rollback()
        return error_response, status_code

    db.session.commit()
    return jsonify(order.to_dict()), 201


@bp.post('/draft')
@login_required
@role_required(ROLE_CLIENT, ROLE_ADMIN, ROLE_STAFF, ROLE_SERVER)
def create_draft_order():
    identity = get_current_identity()
    order = Order(user_id=identity['id'], status='draft')
    db.session.add(order)
    db.session.commit()
    return jsonify(order.to_dict()), 201


@bp.post('/<int:order_id>/items')
@login_required
@role_required(ROLE_CLIENT, ROLE_ADMIN, ROLE_STAFF, ROLE_SERVER)
def add_item_to_draft(order_id):
    identity = get_current_identity()
    order = Order.query.get_or_404(order_id)
    if not _can_access_order(identity, order):
        return jsonify({'message': 'Accès refusé.'}), 403
    if order.status != 'draft':
        return jsonify({'message': 'La commande est déjà validée.'}), 400

    data = request.get_json() or {}
    try:
        menu_item_id = int(data.get('menu_item_id'))
        quantity = int(data.get('quantity', 1))
    except (TypeError, ValueError):
        return jsonify({'message': 'Paramètres invalides.'}), 400
    if quantity < 1:
        return jsonify({'message': 'Quantité invalide.'}), 400

    menu_item = MenuItem.query.get(menu_item_id)
    if not menu_item:
        return jsonify({'message': 'Plat introuvable.'}), 404

    existing = OrderItem.query.filter_by(order_id=order.id, menu_item_id=menu_item_id).first()
    if existing:
        existing.quantity += quantity
    else:
        db.session.add(OrderItem(order=order, menu_item=menu_item, quantity=quantity, unit_price=menu_item.price))
    db.session.commit()
    return jsonify(order.to_dict())


@bp.put('/<int:order_id>/items/<int:item_id>')
@login_required
@role_required(ROLE_CLIENT, ROLE_ADMIN, ROLE_STAFF, ROLE_SERVER)
def update_item_quantity(order_id, item_id):
    identity = get_current_identity()
    order = Order.query.get_or_404(order_id)
    if not _can_access_order(identity, order):
        return jsonify({'message': 'Accès refusé.'}), 403
    if order.status != 'draft':
        return jsonify({'message': 'La commande est déjà validée.'}), 400

    order_item = OrderItem.query.filter_by(order_id=order.id, id=item_id).first_or_404()
    data = request.get_json() or {}
    try:
        quantity = int(data.get('quantity'))
    except (TypeError, ValueError):
        return jsonify({'message': 'Quantité invalide.'}), 400

    if quantity < 1:
        db.session.delete(order_item)
    else:
        order_item.quantity = quantity
    db.session.commit()
    return jsonify(order.to_dict())


@bp.delete('/<int:order_id>/items/<int:item_id>')
@login_required
@role_required(ROLE_CLIENT, ROLE_ADMIN, ROLE_STAFF, ROLE_SERVER)
def remove_item_from_order(order_id, item_id):
    identity = get_current_identity()
    order = Order.query.get_or_404(order_id)
    if not _can_access_order(identity, order):
        return jsonify({'message': 'Accès refusé.'}), 403
    if order.status != 'draft':
        return jsonify({'message': 'La commande est déjà validée.'}), 400

    order_item = OrderItem.query.filter_by(order_id=order.id, id=item_id).first_or_404()
    db.session.delete(order_item)
    db.session.commit()
    return jsonify(order.to_dict())


@bp.post('/<int:order_id>/validate')
@login_required
@role_required(ROLE_CLIENT, ROLE_ADMIN, ROLE_STAFF, ROLE_SERVER)
def validate_order(order_id):
    identity = get_current_identity()
    order = Order.query.get_or_404(order_id)
    if not _can_access_order(identity, order):
        return jsonify({'message': 'Accès refusé.'}), 403
    if order.status != 'draft':
        return jsonify({'message': 'La commande est déjà validée.'}), 400
    if not order.items:
        return jsonify({'message': 'La commande ne contient aucun plat.'}), 400

    error_response, status_code = _validate_and_decrease_stock(order)
    if error_response:
        db.session.rollback()
        return error_response, status_code
    db.session.commit()
    return jsonify(order.to_dict())


@bp.get('')
@login_required
def list_orders():
    identity = get_current_identity()
    role = identity.get('role')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')

    query = Order.query
    if role not in [ROLE_ADMIN, ROLE_STAFF, ROLE_SERVER]:
        query = query.filter_by(user_id=identity['id'])
    if date_from:
        try:
            query = query.filter(Order.created_at >= datetime.fromisoformat(date_from))
        except ValueError:
            return jsonify({'message': 'date_from invalide (format attendu: YYYY-MM-DD).'}), 400
    if date_to:
        try:
            date_to_value = datetime.fromisoformat(date_to)
            query = query.filter(Order.created_at <= date_to_value)
        except ValueError:
            return jsonify({'message': 'date_to invalide (format attendu: YYYY-MM-DD).'}), 400
    orders = query.order_by(Order.created_at.desc()).all()
    return jsonify([order.to_dict() for order in orders])


@bp.put('/<int:order_id>/status')
@login_required
@role_required(ROLE_ADMIN, ROLE_STAFF, ROLE_SERVER)
def update_status(order_id):
    order = Order.query.get_or_404(order_id)
    data = request.get_json() or {}
    status = data.get('status', '').strip()
    if not _validate_status_value(status):
        return jsonify({'message': 'Statut invalide.'}), 400
    if order.status == 'draft':
        return jsonify({'message': 'Valider d’abord la commande avant de changer son statut.'}), 400
    order.status = status
    db.session.commit()
    return jsonify(order.to_dict())
