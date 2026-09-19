# Guide de Déploiement du Projet

Ce projet est configuré pour être déployé simplement et rapidement via GitHub Actions, Docker, ou directement sur un serveur Node.js.

---

## 1. Déploiement automatique avec GitHub Actions

Le workflow GitHub se trouve dans `.github/workflows/deploy.yml` :
- **À chaque `push` sur la branche `main` ou `master`** :
  1. Les dépendances sont installées et le code TypeScript est vérifié (`npm run lint`).
  2. Le projet est compilé (`npm run build`).
  3. L'artefact `dist/` est généré et stocké.
  4. Une image Docker de production est automatiquement construite et publiée sur le registre GitHub Packages (**GHCR** : `ghcr.io/<votre-utilisateur>/<votre-repo>:latest`).
- **Déclenchement manuel** : vous pouvez également lancer le workflow à tout moment depuis l'onglet **Actions** de votre dépôt GitHub (`Run workflow`).

---

## 2. Déploiement avec Docker & Docker Compose (Recommandé)

### Lancement avec Docker Compose :
```bash
# 1. Cloner le dépôt GitHub
git clone https://github.com/<votre-utilisateur>/<votre-repo>.git
cd <votre-repo>

# 2. Démarrer l'application en arrière-plan
docker compose up -d --build

# 3. L'application est disponible sur : http://localhost:3000
```

> **Important (Persistance des données) :**  
> Le dossier local `./data` est automatiquement monté dans le conteneur (`/app/data`). Vos comptes enseignants, élèves, classes, notes, QCM et feuilles de présence sont ainsi conservés même lors des mises à jour du conteneur.

---

## 3. Déploiement direct avec Node.js (VPS / Serveur dédié)

Prérequis : **Node.js 20+**

```bash
# 1. Installer les dépendances
npm ci

# 2. Compiler l'application (Vite + serveur CommonJS)
npm run build

# 3. Démarrer l'application
npm start
```

Pour exécuter l'application en arrière-plan avec **PM2** :
```bash
npm install -g pm2
pm2 start dist/server.cjs --name "ecole-portail"
pm2 save
pm2 startup
```

---

## 4. Déploiement Cloud (Render, Railway, Cloud Run, CapRover)

- **Render / Railway / CapRover / Coolify** : Choisissez l'option "Docker" lors de la création du service. Le `Dockerfile` à la racine sera automatiquement détecté et exécuté.
- **Port d'écoute** : `3000`
- **Volume persistant** : Définissez un disque ou volume pointant vers `/app/data` pour conserver les données de la base SQLite.
