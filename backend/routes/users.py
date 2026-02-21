from flask import Blueprint, request, jsonify
from extensions import db
from models import User
from utils.auth import login_required, role_required, ROLE_ADMIN

bp = Blueprint('users', __name__, url_prefix='/api/users')

@bp.get('')
@login_required
@role_required(ROLE_ADMIN)
def list_users():
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify([user.to_dict() for user in users])

@bp.put('/<int:user_id>/role')
@login_required
@role_required(ROLE_ADMIN)
def update_role(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json() or {}
    role = data.get('role', '').strip()
    if role not in ['admin', 'staff', 'server', 'client']:
        return jsonify({'message': 'Rôle invalide.'}), 400
    user.role = role
    db.session.commit()
    return jsonify(user.to_dict())
