# CryptoBet

Plateforme de prédiction crypto (Higher / Lower) avec dépôts Solana et panel admin protégé.

---

## Lancer en local

```bash
# 1. Installer les dépendances
npm install

# 2. Copier le fichier d'environnement
cp .env.example .env

# 3. Générer ton mot de passe admin
npm run gen-hash
# → colle le hash dans .env à la ligne ADMIN_PASSWORD_HASH

# 4. Lancer le serveur
npm start
# → http://localhost:3000       (site principal)
# → http://localhost:3000/admin (panel admin)
```

---

## Déployer sur Render.com (gratuit)

### Étape 1 — Mettre le projet sur GitHub
```bash
git init
git add .
git commit -m "initial commit"
# Crée un repo sur github.com puis :
git remote add origin https://github.com/TON_USER/cryptobet.git
git push -u origin main
```

### Étape 2 — Créer le service sur Render
1. Va sur **render.com** → "New +" → **Web Service**
2. Connecte ton repo GitHub
3. Render détecte `render.yaml` automatiquement — clique **Apply**

### Étape 3 — Configurer les variables d'environnement
Dans Render → ton service → **Environment** → ajoute :

| Variable | Valeur |
|---|---|
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | *(Render le génère automatiquement via render.yaml)* |
| `ADMIN_PASSWORD_HASH` | Le hash généré avec `npm run gen-hash` |

### Étape 4 — Tes adresses custody Solana
Dans `public/index.html`, remplace :
```js
const CUSTODY = {
  usdc: 'YOUR_SOLANA_WALLET_ADDRESS_FOR_USDC',
  sol:  'YOUR_SOLANA_WALLET_ADDRESS_FOR_SOL',
};
```
par tes vraies adresses Solana.

---

## Sécurité admin

- `/admin` → redirige vers le formulaire de login si pas de session
- `/admin.html` → redirige vers `/admin` (accès direct bloqué)
- Mot de passe hashé en **bcrypt** (coût 12) — jamais stocké en clair
- **5 tentatives** max par IP puis blocage 15 minutes
- Session **httpOnly + secure + sameSite** (cookie non lisible par JS)
- Session expire après **8h**
- Bouton **Logout** détruit la session côté serveur

---

## Flux de retrait

```
User → soumet demande (montant + adresse Solana)
     → bannière "pending" apparaît dans son interface

Admin → voit la demande dans /admin
      → clique Approve
      → envoie manuellement les fonds depuis son wallet custody
      → clique "Mark as Paid"

User → solde mis à jour automatiquement
```

Le bonus de $100 est **toujours bloqué** — seuls les profits réels au-dessus sont retirables.
