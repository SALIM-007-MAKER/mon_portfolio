from functools import wraps
from flask import jsonify, session

ROLE_ADMIN = 'admin'
ROLE_STAFF = 'staff'
ROLE_SERVER = 'server'
ROLE_CLIENT = 'client'

ROLE_LABELS = {
    'admin': 'Administrateur',
    'staff': 'Personnel',
    'server': 'Serveur',
    'client': 'Client'
}

def role_required(*roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            role = session.get('user_role')
            if not session.get('user_id'):
                return jsonify({'message': 'Authentification requise.'}), 401
            if role not in roles:
                return jsonify({'message': 'Accès refusé.'}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not session.get('user_id'):
            return jsonify({'message': 'Authentification requise.'}), 401
        return fn(*args, **kwargs)
    return wrapper


def get_current_identity():
    user_id = session.get('user_id')
    role = session.get('user_role')
    if not user_id:
        return None
    return {'id': user_id, 'role': role}
