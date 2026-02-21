from app import create_app
from extensions import db
from models import MenuItem, User, Category
from werkzeug.security import generate_password_hash

SEED_MENU = [
    {
        'name': 'Pastels au thon',
        'description': 'Chaussons frits farcis au thon épicé (4 pièces).',
        'price': 2000,
        'stock': 35,
        'category': 'Entrées',
        'image_url': 'https://source.unsplash.com/1200x800/?empanadas,fish'
    },
    {
        'name': 'Salade sahélienne',
        'description': 'Salade fraîche de saison, tomates, concombre, oignons et vinaigrette citronnée.',
        'price': 1800,
        'stock': 28,
        'category': 'Entrées',
        'image_url': 'https://source.unsplash.com/1200x800/?african,salad'
    },
    {
        'name': 'Brochettes de foie',
        'description': 'Petites brochettes de foie marinées aux épices, servies chaudes.',
        'price': 2500,
        'stock': 22,
        'category': 'Entrées',
        'image_url': 'https://source.unsplash.com/1200x800/?liver,skewers,grill'
    },
    {
        'name': 'Dambou',
        'description': 'Couscous de mil léger avec légumes et épices nigériennes.',
        'price': 6500,
        'stock': 30,
        'category': 'Plats',
        'image_url': '/assets/dambou.svg'
    },
    {
        'name': 'Tô de mil & sauce arachide',
        'description': 'Pâte de mil servie avec une sauce arachide onctueuse.',
        'price': 7000,
        'stock': 24,
        'category': 'Plats',
        'image_url': '/assets/to_mil.svg'
    },
    {
        'name': 'Riz gras nigérien',
        'description': 'Riz parfumé cuisiné avec légumes, tomates et épices.',
        'price': 8000,
        'stock': 28,
        'category': 'Plats',
        'image_url': '/assets/riz_gras.svg'
    },
    {
        'name': 'Sauce gombo & poulet',
        'description': 'Sauce gombo relevée servie avec du poulet tendre.',
        'price': 9500,
        'stock': 20,
        'category': 'Spécialités',
        'image_url': '/assets/gombo_poulet.svg'
    },
    {
        'name': 'Poulet bicyclette',
        'description': 'Poulet rôti lentement, mariné aux épices locales.',
        'price': 11000,
        'stock': 15,
        'category': 'Spécialités',
        'image_url': '/assets/poulet_bicyclette.svg'
    },
    {
        'name': 'Sauce feuilles & mil',
        'description': 'Feuilles locales mijotées, accompagnées de mil.',
        'price': 7500,
        'stock': 22,
        'category': 'Plats',
        'image_url': '/assets/sauce_feuilles.svg'
    },
    {
        'name': 'Jus de Bissap',
        'description': "Boisson traditionnelle à l'hibiscus, fraîche et désaltérante.",
        'price': 1500,
        'stock': 45,
        'category': 'Boissons',
        'image_url': 'https://source.unsplash.com/1200x800/?hibiscus,drink,cold'
    },
    {
        'name': 'Jus de Gingembre',
        'description': 'Boisson épicée au gingembre frais, parfumée à la menthe.',
        'price': 1500,
        'stock': 38,
        'category': 'Boissons',
        'image_url': 'https://source.unsplash.com/1200x800/?ginger,juice,drink'
    },
    {
        'name': 'Fura da Nono',
        'description': 'Boisson lactée traditionnelle au mil fermenté.',
        'price': 2000,
        'stock': 25,
        'category': 'Boissons',
        'image_url': 'https://source.unsplash.com/1200x800/?fermented,milk,drink'
    },
    {
        'name': 'Jus de Tamarin',
        'description': 'Boisson acidulée et sucrée au fruit de tamarinier.',
        'price': 1500,
        'stock': 32,
        'category': 'Boissons',
        'image_url': 'https://source.unsplash.com/1200x800/?tamarind,juice'
    },
    {
        'name': 'Zomkom (Eau de mil)',
        'description': 'Boisson rafraîchissante à base de mil fermenté.',
        'price': 1000,
        'stock': 50,
        'category': 'Boissons',
        'image_url': 'https://source.unsplash.com/1200x800/?millet,drink'
    },
    {
        'name': 'Beignets de Mil',
        'description': 'Beignets croustillants à la farine de mil, légèrement sucrés (3 pièces).',
        'price': 500,
        'stock': 60,
        'category': 'Desserts',
        'image_url': 'https://source.unsplash.com/1200x800/?fritters,dessert'
    },
    {
        'name': 'Galettes de Niébé',
        'description': 'Galettes frites à base de haricots niébé (4 pièces).',
        'price': 1000,
        'stock': 35,
        'category': 'Desserts',
        'image_url': 'https://source.unsplash.com/1200x800/?bean,cakes,fried'
    },
    {
        'name': 'Dambou Sucré',
        'description': 'Couscous sucré aux fruits secs et épices douces.',
        'price': 2500,
        'stock': 18,
        'category': 'Desserts',
        'image_url': 'https://source.unsplash.com/1200x800/?sweet,couscous,dessert'
    },
    {
        'name': 'Kuli-kuli',
        'description': "Beignets croquants d'arachides grillées.",
        'price': 800,
        'stock': 42,
        'category': 'Desserts',
        'image_url': 'https://source.unsplash.com/1200x800/?peanut,snack'
    },
    {
        'name': 'Masa (Crêpes de riz)',
        'description': 'Crêpes moelleuses de riz accompagnées de miel (5 pièces).',
        'price': 1500,
        'stock': 28,
        'category': 'Desserts',
        'image_url': 'https://source.unsplash.com/1200x800/?rice,pancakes'
    }
]

DEFAULT_USERS = [
    {
        'name': 'Admin',
        'email': 'admin@restaurant.local',
        'password': 'admin123',
        'role': 'admin'
    },
    {
        'name': 'Client Demo',
        'email': 'client@restaurant.local',
        'password': 'client123',
        'role': 'client'
    }
]

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        db.create_all()
        categories_by_name = {}
        for name in ['Entrées', 'Plats', 'Spécialités', 'Desserts', 'Boissons']:
            category = Category.query.filter_by(name=name).first()
            if not category:
                category = Category(name=name)
                db.session.add(category)
                db.session.flush()
            categories_by_name[name] = category

        for user_data in DEFAULT_USERS:
            if User.query.filter_by(email=user_data['email']).first():
                continue
            db.session.add(User(
                name=user_data['name'],
                email=user_data['email'],
                password_hash=generate_password_hash(user_data['password']),
                role=user_data['role']
            ))

        for item in SEED_MENU:
            existing = MenuItem.query.filter_by(name=item['name']).first()
            if existing:
                existing.description = item['description']
                existing.price = item['price']
                existing.stock = item.get('stock', existing.stock)
                existing.category_id = categories_by_name.get(item.get('category', 'Plats')).id
                existing.image_url = item['image_url']
            else:
                db.session.add(MenuItem(
                    name=item['name'],
                    description=item['description'],
                    price=item['price'],
                    stock=item.get('stock', 0),
                    category_id=categories_by_name.get(item.get('category', 'Plats')).id,
                    image_url=item['image_url']
                ))

        db.session.commit()
        print('Seed terminé.')


