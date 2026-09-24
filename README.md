# LGO Pharmacie

## Installation (nouveaux développeurs)

```bash
git clone <url-du-repo> pharmacie
cd pharmacie
composer install
cp .env.example .env
php artisan key:generate
# Éditer .env : DB_USERNAME, DB_PASSWORD, REDIS_HOST...
php artisan migrate --seed
npm install && npm run dev
php artisan serve

# 🔐 Rôles et Permissions — LGO Pharmacie Vétérinaire

## 🔴 Administrateur

**Mission** : Gérer l'entreprise, les accès et la configuration.

### ✅ Peut faire

- **Utilisateurs** : Créer, modifier, désactiver, réinitialiser mot de passe
- **Paramètres** : Modifier la configuration (identité, TVA, logs, système)
- **Logs (Audit)** : Consulter le journal RGPD complet
- **Suppressions sensibles** : Médicaments, fournisseurs, vétérinaires, utilisateurs
- **Mode maintenance** : Activer / désactiver

### 🎯 Accès total

```
Dashboard · Caisse · Ventes
Médicaments · Lots · Espèces · Animaux · Propriétaires · Ordonnances · Vaccinations
Fournisseurs · Achats · Réceptions
Vétérinaires
Rapports · Mouvements · Exports
Utilisateurs · Logs · Paramètres
```

---

## 🟠 Pharmacien

**Mission** : Gérer le médical, le stock et l'approvisionnement.

### ✅ Peut faire

- **Catalogue** : Créer, modifier, désactiver les médicaments, espèces, vétérinaires
- **Stock** : Créer des lots, ajuster le stock, voir les alertes
- **Approvisionnement** : Créer des achats, réceptionner, valider les réceptions
- **Médical** : Créer/modifier ordonnances, vaccinations
- **Analyse** : Consulter et générer les rapports, télécharger les exports
- **Caisse** : Vendre, encaisser
- **Clients** : Créer/modifier propriétaires et animaux

### ❌ Ne peut PAS faire

- Créer / modifier / supprimer des utilisateurs
- Consulter les logs d'audit
- Modifier les paramètres (lecture seule)
- Activer le mode maintenance
- Supprimer définitivement un médicament / fournisseur / vétérinaire

### 🎯 Accès

```
Dashboard · Caisse · Ventes
Médicaments · Lots · Espèces · Animaux · Propriétaires · Ordonnances · Vaccinations
Fournisseurs · Achats · Réceptions
Vétérinaires
Rapports · Mouvements · Exports
Paramètres (lecture seule)
```

---

## 🟢 Vendeur

**Mission** : Faire tourner la caisse au quotidien.

### ✅ Peut faire

- **Caisse** : Vendre, encaisser (espèces, carte, mobile money, crédit), imprimer le ticket
- **Ventes** : Consulter l'historique, réimprimer un ticket
- **Clients** : Créer et modifier les propriétaires
- **Animaux** : Créer et modifier les animaux
- **Ordonnances** : Créer et consulter
- **Vaccinations** : Créer et consulter
- **Consultation** : Voir les médicaments, le stock disponible, les vétérinaires, les espèces

### ❌ Ne peut PAS faire

- Créer / modifier / supprimer un médicament
- Créer / ajuster un lot de stock
- Voir les fournisseurs, achats, réceptions
- Voir les rapports, mouvements, exports
- Voir les utilisateurs, logs, paramètres
- Supprimer quoi que ce soit

### 🎯 Accès

```
Dashboard · Caisse · Ventes
Médicaments (lecture) · Espèces (lecture) · Animaux · Propriétaires · Ordonnances · Vaccinations
Vétérinaires (lecture)
```

---

## 📊 Tableau récapitulatif

| Module | Administrateur | Pharmacien | Vendeur |
|---|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ |
| Caisse | ✅ | ✅ | ✅ |
| Ventes | 👁️ | 👁️ | ✅ |
| Médicaments | ✅ CRUD | ✅ CRU | 👁️ |
| Espèces | ✅ CRUD | ✅ CRU | 👁️ |
| Vétérinaires | ✅ CRUD | ✅ CRU | 👁️ |
| Propriétaires | ✅ CRUD | ✅ CRU | ✅ CRU |
| Animaux | ✅ CRUD | ✅ CRU | ✅ CRU |
| Ordonnances | ✅ CRUD | ✅ CRU | ✅ CR |
| Vaccinations | ✅ CRUD | ✅ CRU | ✅ CR |
| Lots & Stock | ✅ CR | ✅ CR | 👁️ |
| Fournisseurs | ✅ CRUD | ✅ CRU | ❌ |
| Achats | ✅ CRUD | ✅ CRU | ❌ |
| Réceptions | ✅ CRUD | ✅ CRU | ❌ |
| Mouvements stock | 👁️ | 👁️ | ❌ |
| Rapports | 👁️ | 👁️ | ❌ |
| Exports | 👁️ | 👁️ | ❌ |
| Utilisateurs | ✅ CRUD | ❌ | ❌ |
| Logs (Audit) | 👁️ | ❌ | ❌ |
| Paramètres | ✅ CRU | 👁️ | ❌ |

**Légende** : `C`=Créer · `R`=Lire · `U`=Modifier · `D`=Supprimer · `👁️`=Lecture seule · `❌`=Aucun accès

---

## 🎯 En une phrase

| Rôle | Sa phrase |
|---|---|
| **Administrateur** | « Je gère **l'entreprise et les accès** » |
| **Pharmacien** | « Je gère **le médical et le stock** » |
| **Vendeur** | « Je **vends et j'encaisse** » |