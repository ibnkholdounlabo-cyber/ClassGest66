# ==========================================
# Étape 1 : Construction (Builder)
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copie des fichiers de dépendances
COPY package*.json ./

# Installation des dépendances pour la compilation
RUN npm ci

# Copie de tout le code source
COPY . .

# Construction du client (Vite) et du serveur compilé (esbuild -> dist/server.cjs)
RUN npm run build

# ==========================================
# Étape 2 : Image d'exécution de production
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copie et installation uniquement des dépendances d'exécution
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Récupération des artefacts compilés depuis l'étape builder
COPY --from=builder /app/dist ./dist

# Création du dossier pour la base de données persistante SQLite
RUN mkdir -p /app/data && chown -R node:node /app

# Volume montable pour persister la base de données SQLite
VOLUME ["/app/data"]

# Sécurité : exécution avec l'utilisateur node non-root
USER node

# Port de l'application
EXPOSE 3000

# Démarrage du serveur de production
CMD ["node", "dist/server.cjs"]
