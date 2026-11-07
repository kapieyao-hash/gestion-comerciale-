# PROJECT SPECIFICATION — APPLICATION DE GESTION COMMERCIALE

Version : 1.0
Statut : Spécification initiale du MVP
Environnement de développement : VS Code + Claude / AI Studio
Base de données : Supabase (PostgreSQL)
Gestion du code : GitHub

---

# 1. OBJECTIF DU DOCUMENT

Ce document est la référence principale du projet.
Tout assistant IA ou développeur travaillant sur ce projet doit commencer par lire ce fichier afin de comprendre :
* le problème à résoudre ;
* les utilisateurs ciblés ;
* les fonctionnalités du MVP ;
* les règles métier ;
* l'architecture souhaitée ;
* la base de données ;
* les règles de sécurité ;
* la méthode de développement ;
* les contraintes techniques ;
* les fonctionnalités qui sont volontairement exclues du MVP.

---

# 2. PRÉSENTATION DU PROJET

Application simple de gestion commerciale destinée principalement aux petits vendeurs et entrepreneurs africains francophones.
L'objectif est de permettre à un vendeur de gérer facilement son activité depuis une interface simple.

Fonctionnalités clés :
* gérer ses produits ;
* suivre son stock en temps réel ;
* enregistrer ses clients ;
* enregistrer ses ventes (avec plusieurs articles) ;
* enregistrer les paiements (complets, partiels ou impayés) ;
* suivre les sommes restantes à payer (dettes clients) ;
* consulter l'historique des ventes ;
* visualiser les informations importantes dans un tableau de bord sans données fictives.

---

# 3. CONTRAINTE MAJEURE : AUCUNE DONNÉE FICTIVE

L'application ne doit générer ou afficher aucune fausse donnée statique ou fictive.
* Lorsqu'un utilisateur n'a pas encore ajouté de produit, de client ou de vente, les compteurs sont à 0 et des écrans vides élégants et explicatifs ("Empty states") invitent à l'action.
* Tous les calculs (total des ventes, montants encaissés, montants restants, stock) sont strictement basés sur les données réelles saisies.

---

# 4. TABLES PRINCIPALES (POSTGRESQL / SUPABASE)

1. `products` (id, user_id, name, description, price, stock_quantity, created_at, updated_at)
2. `customers` (id, user_id, name, phone, created_at, updated_at)
3. `sales` (id, user_id, customer_id, total_amount, amount_paid, remaining_amount, created_at, updated_at)
4. `sale_items` (id, sale_id, product_id, quantity, unit_price, subtotal, created_at)
5. `payments` (id, sale_id, user_id, amount, payment_method, created_at)

Sécurité : Row Level Security (RLS) obligatoire sur chaque table : un utilisateur ne peut voir et modifier que ses propres données (`auth.uid() = user_id`).
