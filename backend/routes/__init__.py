from .auth import bp as auth_bp
from .categories import bp as categories_bp
from .menu import bp as menu_bp
from .orders import bp as orders_bp
from .payments import bp as payments_bp
from .stats import bp as stats_bp
from .users import bp as users_bp

__all__ = ['auth_bp', 'categories_bp', 'menu_bp', 'orders_bp', 'payments_bp', 'stats_bp', 'users_bp']
