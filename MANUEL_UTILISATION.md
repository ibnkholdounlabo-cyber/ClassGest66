# Guide et Manuel d'Utilisation - Intranet Scolaire

Ce manuel détaille le fonctionnement, le déploiement local, la protection des données et l'utilisation quotidienne de l'intranet scolaire pour les enseignants et les élèves.

---

## Sommaire

1. [Architecture & Déploiement Git Local](#1-architecture--déploiement-git-local)
2. [Préservation des Données Existantes](#2-préservation-des-données-existantes)
3. [Accès Sécurisé Enseignant (`/prof`)](#3-accès-sécurisé-enseignant-prof)
4. [Gestion des Classes & des Élèves](#4-gestion-des-classes--des-élèves)
5. [Statut Élève : Nouveau ou Redoublant](#5-statut-élève--nouveau-ou-redoublant)
6. [Calendrier de Présence & Feuilles d'Appel](#6-calendrier-de-présence--feuilles-dappel)
7. [Cours, Documents & Fiches](#7-cours-documents--fiches)
8. [Tests de Rapidité au Clavier & Évaluations](#8-tests-de-rapidité-au-clavier--évaluations)
9. [Questionnaires QCM Interactifs](#9-questionnaires-qcm-interactifs)
10. [Espace Élève & Confidentialité](#10-espace-élève--confidentialité)
11. [Sauvegardes, Export & Restauration](#11-sauvegardes-export--restauration)

---

## 1. Architecture & Déploiement Git Local

L'application fonctionne comme un serveur intranet local autonome utilisant **Node.js**, **Express**, **SQLite 3**, **React** et **Tailwind CSS**.

### Prérequis
- **Node.js** version 20 ou supérieure (avec support SQLite natif `node:sqlite`).
- **Git** installé sur votre machine locale ou serveur d'établissement.

### Lancement Initial
```bash
# 1. Cloner le dépôt
git clone <votre-depot-git> intranet-scolaire
cd intranet-scolaire

# 2. Installer les dépendances
npm install

# 3. Lancer le serveur en mode développement
npm run dev

# Ou compiler et lancer pour la production locale
npm run build
npm start
```

Le serveur sera accessible sur le réseau local à l'adresse : `http://localhost:3000` (ou `http://<ip-du-serveur>:3000`).

---

## 2. Préservation des Données Existantes

### Règle d'or : Vos données locales ne sont JAMAIS écrasées par Git

1. **Emplacement par défaut** :
   - Dossier de données : `./data/`
   - Fichier de base de données : `./data/school.sqlite`
2. **Protection automatique `.gitignore`** :
   Tous les fichiers de base de données (`*.sqlite*`, `data/*.db*`, `data/*.json`, journaux WAL/SHM) sont strictement ignorés par Git.
3. **Mise à jour de l'application sans perte de données** :
   Lorsque vous effectuez une mise à jour depuis Git sur votre serveur local :
   ```bash
   git pull origin main
   npm install
   npm run build
   ```
   **Vos classes, élèves, présences, notes et QCM existants restent intacts dans `./data/school.sqlite`.**
4. **Variables d'environnement optionnelles (`.env`)** :
   Vous pouvez personnaliser les chemins si vous le souhaitez :
   ```env
   DATA_DIR="./data"
   SQLITE_FILE="./data/school.sqlite"
   ```

---

## 3. Accès Sécurisé Enseignant (`/prof`)

Afin d'éviter toute confusion pour les élèves, **aucun bouton ni lien de connexion enseignant n'apparaît sur la page d'accueil**.

- **URL d'accès enseignant** : tapez `/prof` à la fin de l'adresse dans votre navigateur.
  - Exemple : `http://localhost:3000/prof`
- **Identifiants par défaut** :
  - Identifiant : `prof`
  - Mot de passe : `prof1234`
- Vous pouvez modifier le mot de passe enseignant à tout moment depuis le tableau de bord.

---

## 4. Gestion des Classes & des Élèves

### Création d'une classe
1. Rendez-vous sur `/prof`.
2. Cliquez sur le bouton noir **« Créer une classe »**.
3. Renseignez le nom (ex. *6ème B*, *2nde 1*), le niveau, l'année scolaire et la salle principale.

### Ajout d'élèves
- **Ajout individuel** : Cliquez sur **« Ajouter un élève »**, renseignez son nom, prénom, date de naissance, cochez s'il est redoublant ou nouveau, et définissez un mot de passe ou laissez le système en générer un automatiquement.
- **Importation rapide par liste** : Cliquez sur **« Importer une liste d’élèves »**. Collez simplement votre liste d'élèves (un nom par ligne ou format Nom, Prénom). Chaque élève recevra automatiquement un mot de passe simple et mémorisable (ex: `tigre42`, `soleil34`).
- **Impression des fiches de connexion** : Cliquez sur **« Imprimer fiches élèves »** pour imprimer les identifiants et mots de passe à distribuer aux élèves.

---

## 5. Statut Élève : Nouveau ou Redoublant

Conformément aux règles scolaires :
- **Seul l'enseignant peut modifier le statut d'un élève.**
- Dans le tableau des élèves de l'espace `/prof`, chaque élève dispose d'une étiquette interactive :
  - **Décoché** = **Nouveau** (badge vert)
  - **Coché** = **Redoublant** (badge ambre)
- En cochant ou décochant la case, la mise à jour est enregistrée instantanément en base de données.
- **L'élève ne peut pas modifier ses informations** : lorsqu'il se connecte à son portail, ses informations administratives et son statut s'affichent en lecture seule.

---

## 6. Calendrier de Présence & Feuilles d'Appel

L'onglet **« Présences & Appel »** dans l'espace enseignant permet de gérer l'assiduité complète :

1. **Créer une séance d'appel** :
   - Cliquez sur **« Nouvelle séance d'appel »**.
   - Choisissez le titre (Cours magistral, TD, TP, Évaluation...), la date, le créneau horaire et la salle.
2. **Faire l'appel en classe** :
   - Sélectionnez la séance dans la liste ou le calendrier.
   - Cliquez sur les boutons d'état pour chaque élève :
     - **Présent** (vert)
     - **Absent** (rouge)
     - **Retard** (ambre, avec possibilité de préciser les minutes de retard)
     - **Excusé** (bleu, avec saisie du motif : certificat médical, convocation...)
   - Un bouton rapide **« Tout le monde présent »** permet de pointer l'ensemble de la classe en un clic.
3. **Statistiques & Bilans** :
   - Visualisez en direct le taux de présence globale de la classe.
   - Consultez le bilan individuel par élève (nombre d'absences, retards, motifs).
   - Bouton **« Imprimer feuille de présence »** pour les archives administratives.

---

## 7. Cours, Documents & Fiches

L'onglet **« Rubrique Cours & Fiches »** permet de partager des ressources pédagogiques :
- Création de cours interactifs au format texte enrichi ou Markdown.
- Organisation par chapitres et thématiques.
- Les élèves ont accès aux cours depuis leur portail après connexion.

---

## 8. Tests de Rapidité au Clavier & Évaluations

L'intranet intègre un outil d'apprentissage de la dactylographie et de la frappe au clavier :
- Textes d'entraînement adaptés par niveau scolaire.
- Calcul en direct de la vitesse (Mots Par Minute - MPM) et de la précision (%).
- Suivi des progrès et tableau récapitulatif des évaluations pour le professeur.

---

## 9. Questionnaires QCM Interactifs

L'onglet **« Questionnaires QCM »** offre un créateur complet d'évaluations :
- Création manuelle de questions à choix multiples avec explications.
- Importation rapide en masse par copier-coller de texte brut.
- Assignation à une ou plusieurs classes.
- Correction automatique instantanée lors de la soumission par l'élève et relevé des notes pour l'enseignant.

---

## 10. Espace Élève & Confidentialité

- **Connexion simplifiée** : L'élève arrive sur `http://localhost:3000/`, sélectionne sa classe dans le menu déroulant, choisit son nom, puis saisit son mot de passe simple.
- **Protection des données (Lecture seule)** : L'élève ne peut en aucun cas modifier son nom, son prénom, son identifiant INE, sa classe ou son statut de redoublement.
- **Accès aux devoirs et cours** : L'élève consulte ses cours, passe ses tests et QCM, et consulte ses résultats.

---

## 11. Sauvegardes, Export & Restauration

Dans le tableau de bord enseignant, cliquez sur **« Sauvegardes & Données »** :
- **Vérification de l'état** : Visualisez l'emplacement exact du fichier SQLite, son poids et la date de dernière modification.
- **Télécharger une sauvegarde JSON** : Génère un instantané complet exportable.
- **Restaurer depuis un fichier** : Permet de réinjecter vos données sur un nouveau serveur ou après réinstallation de votre machine.
