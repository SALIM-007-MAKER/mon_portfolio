# Sahel Kitchen - Systeme de Gestion (Menus & Commandes)

Application web de gestion de restaurant construite avec Flask + SQLite.

## Stack technique

- Backend: `Flask`
- Base de donnees: `SQLite`
- ORM: `SQLAlchemy` (via `Flask-SQLAlchemy`)
- Authentification: `Session Flask` (`session['user_id']`)
- Frontend: `HTML + CSS + Bootstrap 5 + JavaScript` (interface servie par Flask)
- Graphiques: `Chart.js`

## Fonctionnalites

- Authentification par session Flask (`session['user_id']`)
- Gestion des roles: `admin`, `staff`, `server`, `client`
- CRUD menu (admin): ajouter, modifier, supprimer
- Categories de plats
- Gestion du stock par plat
- Commandes:
- mode brouillon (`draft`)
- ajout/modification/suppression de lignes
- validation de commande
- decrementation automatique du stock a la validation
- Paiement en ligne:
- `Stripe` (carte)
- `Flutterwave` (carte / mobile money)
- verification retour paiement et mise a jour commande
- Suivi des commandes (statuts: `en_preparation`, `prete`, `livree`)
- Statistiques:
- ventes par jour
- plats populaires
- chiffre d'affaires (admin)
- graphiques dashboard (Chart.js)
- filtres par date sur dashboard
- export PDF facture d'une commande
- Filtres par date sur les commandes et stats

## Structure du projet

```text
Reatauration/
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── extensions.py
│   ├── models.py
│   ├── seed.py
│   ├── requirements.txt
│   ├── restaurant.db
│   └── routes/
│       ├── auth.py
│       ├── categories.py
│       ├── menu.py
│       ├── orders.py
│       ├── payments.py
│       ├── stats.py
│       └── users.py
└── frontend/
    ├── index.html
    ├── styles.css
    └── app.js
```

## Installation

Depuis la racine du projet:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

## Initialisation des donnees

```powershell
python seed.py
```

Ce script cree/actualise:
- compte admin
- categories de base
- plats de demo avec prix et stock

## Lancer l'application

Option recommandee (stable sous Windows):

```powershell
python -m flask --app app run --host 127.0.0.1 --port 5000 --no-debugger --no-reload
```

Option developpement:

```powershell
python app.py
```

Puis ouvrir:
- `http://127.0.0.1:5000/`
- ou `http://localhost:5000/`

## Comptes et roles

### Compte admin par defaut

- Email: `admin@restaurant.local`
- Mot de passe: `admin123`

### Compte client par defaut

- Email: `client@restaurant.local`
- Mot de passe: `client123`

### Roles

- `admin`: gestion menu, categories, utilisateurs, stats, chiffre d'affaires
- `staff` / `server`: suivi des commandes, stats
- `client`: creation et suivi de ses commandes

### Creation d'un serveur (staff/server)

1. Creer un compte via l'interface (role `client` par defaut)
2. Se connecter en admin
3. Changer son role via:
- `PUT /api/users/<user_id>/role`
- body JSON: `{ "role": "server" }` (ou `"staff"`)

## API principale

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

Flux d'authentification:
- non connecté: redirection vers `/login`
- connecté: accès dashboard via `/dashboard`
- déconnexion: suppression session + redirection `/login`

### Categories

- `GET /api/categories` (admin/staff/server)
- `POST /api/categories` (admin)
- `PUT /api/categories/<id>` (admin)
- `DELETE /api/categories/<id>` (admin)

### Menu

- `GET /api/menu` (public)
- `POST /api/menu` (admin)
- `PUT /api/menu/<id>` (admin)
- `DELETE /api/menu/<id>` (admin)

Champs supportes pour un plat:
- `name`
- `description`
- `price` (minimum: `100` FCFA)
- `stock` (minimum: `0`)
- `category_id`
- `image_url`

### Commandes

- `POST /api/orders` (creation + validation immediate + decrementation stock)
- `POST /api/orders/draft` (creer un brouillon)
- `POST /api/orders/<order_id>/items` (ajouter ligne)
- `PUT /api/orders/<order_id>/items/<item_id>` (modifier quantite)
- `DELETE /api/orders/<order_id>/items/<item_id>` (supprimer ligne)
- `POST /api/orders/<order_id>/validate` (valider et decremeter stock)
- `GET /api/orders?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`
- `PUT /api/orders/<id>/status` (admin/staff/server)

### Paiements en ligne

- `GET /api/payments/providers` (etat des moyens actifs)
- `POST /api/payments/checkout` (cree une commande en attente + URL de paiement)
- `POST /api/payments/verify` (verifie le paiement de retour fournisseur)

Exemple `checkout`:

```json
{
  "provider": "stripe",
  "name": "Client Demo",
  "email": "client@restaurant.local",
  "items": [
    { "menu_item_id": 1, "quantity": 2 }
  ]
}
```

### Statistiques

- `GET /api/stats/sales?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`
- `GET /api/stats/popular`
- `GET /api/stats/revenue?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD` (admin)

## Regles metier importantes

- Un plat avec `stock = 0` est indisponible.
- Le stock est decremente a la validation de commande.
- Une commande `draft` n'impacte pas le stock.
- Le role utilisateur controle strictement l'acces API.
- Paiement en ligne:
- `payment_status = pending` avant verification
- `payment_status = paid` apres verification fournisseur et validation stock
- `payment_status = failed` en cas d'echec ou verification invalide

## Depannage

### Erreur `ERR_CONNECTION_REFUSED`

Verifier que le serveur tourne:

```powershell
netstat -ano | findstr :5000
```

Si aucun resultat:
1. relancer le backend
2. verifier que l'environnement virtuel est active
3. tester `http://localhost:5000/`

### Bouton "Payer en ligne" / options paiement ne fonctionnent pas

Verifier dans cet ordre:
1. etre connecte (session active)
2. avoir au moins 1 article dans le panier
3. redemarrer le backend apres ajout des variables d'environnement
4. faire un rechargement force navigateur (`Ctrl+F5`)

Verifier l'etat des providers:

```http
GET /api/payments/providers
```

Resultat attendu: au moins un provider avec `enabled: true`.

Si tout est `false`, definir les cles puis relancer:

```powershell
$env:PUBLIC_BASE_URL="http://127.0.0.1:5000"
$env:STRIPE_SECRET_KEY="sk_test_xxx"
$env:FLUTTERWAVE_SECRET_KEY="FLWSECK_TEST-xxx"
python app.py
```

### Migrations SQLite

Le projet applique des migrations legeres automatiques au demarrage pour les nouvelles colonnes:
- `menu_item.stock`
- `menu_item.category_id`
- `order.validated_at`
- `order.payment_provider`
- `order.payment_status`
- `order.payment_reference`

## Variables d'environnement paiements

Configurer au minimum une cle:

```powershell
$env:PUBLIC_BASE_URL="http://127.0.0.1:5000"
$env:STRIPE_SECRET_KEY="sk_test_xxx"
$env:FLUTTERWAVE_SECRET_KEY="FLWSECK_TEST-xxx"
```

## Qualite / soutenance

- Code backend conforme style Python (PEP 8)
- README avec instructions reproductibles
- CRUD + base de donnees fonctionnels
- Depot Git public recommande avec commits reguliers

## Charte UI (version projet)

- Typographie:
- Police principale `Inter`
- Hiérarchie claire: `h1` > `h2` > `h3` > texte

- Couleurs:
- Primaire: bleu (boutons/actions/focus)
- Surfaces: blanc / gris très clair
- Texte: contraste élevé (lisibilité prioritaire)

- Composants:
- Cards avec même rayon et ombre légère
- Boutons cohérents (`primary`, `outline-primary`, `outline-secondary`)
- Inputs homogènes (même hauteur, bordure, focus)

- Navigation:
- Un onglet = une section affichée
- État actif clairement visible

- États d'interface:
- Chargement: skeletons
- Vide: message explicite + visuel simple
- Erreur: toast + message utilisateur compréhensible

- Accessibilité:
- Focus visible clavier
- Attributs `aria-*` sur composants dynamiques
- Contrastes suffisants sur texte/boutons

# mon_portfolio
# restau
# restau
# restau
"# restau" 
