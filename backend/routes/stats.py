from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request
from sqlalchemy import func
from extensions import db
from models import Order, OrderItem, MenuItem
from utils.auth import login_required, role_required, ROLE_ADMIN, ROLE_STAFF, ROLE_SERVER

bp = Blueprint('stats', __name__, url_prefix='/api/stats')

@bp.get('/sales')
@login_required
@role_required(ROLE_ADMIN, ROLE_STAFF, ROLE_SERVER)
def sales_by_day():
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    rows = (
        db.session.query(
            func.date(Order.created_at).label('day'),
            func.sum(OrderItem.quantity * OrderItem.unit_price).label('total')
        )
        .join(OrderItem, Order.id == OrderItem.order_id)
        .filter(Order.status != 'draft')
    )
    if date_from:
        try:
            rows = rows.filter(Order.created_at >= datetime.fromisoformat(date_from))
        except ValueError:
            return jsonify({'message': 'date_from invalide (format attendu: YYYY-MM-DD).'}), 400
    if date_to:
        try:
            rows = rows.filter(Order.created_at <= datetime.fromisoformat(date_to) + timedelta(days=1))
        except ValueError:
            return jsonify({'message': 'date_to invalide (format attendu: YYYY-MM-DD).'}), 400
    rows = rows.group_by(func.date(Order.created_at)).order_by(func.date(Order.created_at).desc()).limit(14).all()
    return jsonify([{'day': row.day, 'total': float(row.total or 0)} for row in rows])

@bp.get('/popular')
@login_required
@role_required(ROLE_ADMIN, ROLE_STAFF, ROLE_SERVER)
def popular_items():
    rows = (
        db.session.query(
            MenuItem.name,
            func.sum(OrderItem.quantity).label('quantity')
        )
        .join(OrderItem, MenuItem.id == OrderItem.menu_item_id)
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Order.status != 'draft')
        .group_by(MenuItem.name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(10)
        .all()
    )
    return jsonify([{'name': row.name, 'quantity': int(row.quantity or 0)} for row in rows])


@bp.get('/revenue')
@login_required
@role_required(ROLE_ADMIN)
def revenue():
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')

    query = (
        db.session.query(func.sum(OrderItem.quantity * OrderItem.unit_price).label('total'))
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Order.status != 'draft')
    )
    if date_from:
        try:
            query = query.filter(Order.created_at >= datetime.fromisoformat(date_from))
        except ValueError:
            return jsonify({'message': 'date_from invalide (format attendu: YYYY-MM-DD).'}), 400
    if date_to:
        try:
            query = query.filter(Order.created_at <= datetime.fromisoformat(date_to) + timedelta(days=1))
        except ValueError:
            return jsonify({'message': 'date_to invalide (format attendu: YYYY-MM-DD).'}), 400
    total = float(query.scalar() or 0)
    return jsonify({'revenue': total, 'currency': 'FCFA'})
