# Manuel d'utilisation de Sahel Kitchen

Ce document présente le fonctionnement de l'application web de gestion de restaurant "Sahel Kitchen".
Il est destiné à être fourni au jury dans le cadre d'une soutenance ou d'une démonstration.

---

## 🛠️ Présentation générale

L'application permet à un restaurant de gérer ses menus, ses commandes, ses paiements
et d'obtenir des statistiques de ventes. Elle est construite avec :

- **Backend** : Flask (Python) + SQLite via SQLAlchemy
- **Frontend** : HTML, CSS, Bootstrap 5 et JavaScript
- **Authentification** : sessions Flask
- **Graphiques** : Chart.js
- **Paiements en ligne** : intégration avec Stripe et Flutterwave

Les rôles définis sont : `admin`, `staff`/`server` et `client`.

---

## ⚙️ Installation et préparation

1. **Créer l'environnement virtuel**

   ```powershell
   cd backend
   python -m venv .venv
   .\.venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Initialiser les données de démonstration**

   ```powershell
   python seed.py
   ```

   - un compte `admin` est créé (`admin@restaurant.local` / `admin123`)
   - un compte `client` est créé (`client@restaurant.local` / `client123`)
   - des catégories et des plats de démonstration sont ajoutés

3. **Lancer l'application**

   Recommandé (Windows stable) :
   ```powershell
   python -m flask --app app run --host 127.0.0.1 --port 5000 --no-debugger --no-reload
   ```

   Mode développement :
   ```powershell
   python app.py
   ```

   Accéder ensuite à : `http://127.0.0.1:5000/` ou `http://localhost:5000/`

---

## 👥 Gestion des comptes et des rôles

### Comptes de base

| Rôle   | Email                       | Mot de passe |
|--------|-----------------------------|--------------|
| Admin  | admin@restaurant.local      | admin123     |
| Client | client@restaurant.local     | client123    |

Un nouvel utilisateur est créé avec le rôle `client` par défaut.
L'administrateur peut modifier les rôles via l'interface ou l'API.

### Attribution de rôles (serveur / staff)

1. Créer le compte avec le rôle `client`.
2. Se connecter en tant qu'admin.
3. Utiliser l'API :
   ```http
   PUT /api/users/<user_id>/role
   Content-Type: application/json
   { "role":"server" }  # ou "staff"
   ```

---

## 📋 Utilisation de l'interface

> **Remarque :** vous pouvez ajouter des captures d'écran dans les sections ci-dessous en plaçant les fichiers d'images
> (png/jpg) dans `frontend/assets/` puis en adaptant le chemin.

### Authentification

![Page de login](frontend/assets/login.png)


- Page `/login` pour se connecter.
- Page `/register` pour créer un compte.
- Après connexion, redirection vers `/dashboard`.
- Déconnexion via le bouton prévu qui appelle `/api/auth/logout`.

### Tableau de bord

![Tableau de bord admin](frontend/assets/dashboard.png)

L'administrateur voit les statistiques globales, le chiffre d'affaires, et gère
les menus, catégories et utilisateurs.
Le personnel (`staff`/`server`) voit les commandes et les met à jour.
Le client peut créer des commandes et suivre leur statut.

### Gestion du menu (admin)

![Interface de gestion du menu](frontend/assets/menu.png)

- Ajouter, modifier, supprimer des plats.
- Chaque plat a : nom, description, prix minimum 100 FCFA, stock, catégorie,
  URL d'image.
- Catégories gérées séparément (CRUD).

### Commandes

#### Création

- Un client ajoute des items au panier.
- Possibilité de sauvegarder en **brouillon**.
- Validation déclenche la création de la commande et décrémentation automatique
du stock.

#### Modification d'un brouillon

- `POST /api/orders/draft` crée un brouillon.
- `POST /api/orders/<order_id>/items` ajoute une ligne.
- `PUT /api/orders/<order_id>/items/<item_id>` modifie la quantité.
- `DELETE /api/orders/<order_id>/items/<item_id>` supprime une ligne.
- `POST /api/orders/<order_id>/validate` valide la commande.

#### Suivi

- Les statuts sont : `draft`, `en_preparation`, `prete`, `livree`.
- Le personnel peut changer le statut via l'interface ou
  `PUT /api/orders/<id>/status`.

### Paiements en ligne

- Liste des fournisseurs : `GET /api/payments/providers`.
- Création d'une session de paiement :
  `POST /api/payments/checkout` en envoyant la commande (items, client, etc.)
  et le fournisseur (`stripe` ou `flutterwave`).
- Après redirection depuis le prestataire, l'API `/api/payments/verify` vérifie
  le retour et met à jour l'état de la commande.

Exemple de requête de checkout :
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

Les graphiques sont disponibles dans le dashboard :

- Ventes par jour (période configurable).
- Plats les plus populaires.
- Chiffre d'affaires global (admin).
- Filtres par date à l'aide du paramètre `?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`.
- Export PDF d'une facture de commande.

---

## 🧱 Structure technique

```
Restauration/
├── backend/
│   ├── app.py           # point d'entrée Flask
│   ├── config.py        # configuration (credentials, etc.)
│   ├── extensions.py    # extension Flask (db, login, etc.)
│   ├── models.py        # ORM SQLAlchemy
│   ├── seed.py          # script de peuplement
│   ├── requirements.txt
│   ├── restaurant.db    # base de données SQLite (seed génère les tables)
│   └── routes/          # modules pour chaque groupe d'API
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

---

## 🧾 Détail de l'API REST

Voir README.md existant qui contient la plupart des endpoints. Référez-vous
aux sections "API principale" pour obtenir la liste complète.

---

## 🎓 Conseils pour la démonstration au jury

1. **Montrer la connexion** avec les deux comptes (admin et client).
2. **Ajouter un nouvel utilisateur** puis lui attribuer le rôle `server`.
3. **Créer ou modifier des plats** dans le menu pour illustrer le CRUD.
4. **Passer une commande** depuis l'espace client : sélectionner des plats,
   valider, puis simuler le parcours de paiement (mode test Stripe/Flutterwave).
5. **Mettre à jour le statut** de la commande en tant que personnel.
6. **Afficher les statistiques** (ventes, articles populaires).
7. **Exporter une facture PDF** pour un client.

> 💡 N'hésitez pas à expliquer brièvement chaque fichier et module backend pour
> montrer la lisibilité et la modularité du code.

---

## 🔚 Conclusion

Ce manuel condense les fonctionnalités et l'utilisation de l'application
Sahel Kitchen. Pour approfondir, consulter le code source dans le dossier
`backend/` et tester les endpoints via Postman ou un navigateur.

Bon exposé ! 🎉