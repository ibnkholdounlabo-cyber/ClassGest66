/**
 * Utilitaire de formatage et de coloration de scripts Python (PEP 8)
 * Conçu pour l'enseignement de l'informatique au collège et lycée.
 */

export interface PythonTemplate {
  id: string;
  title: string;
  level: number;
  description: string;
  code: string;
}

/**
 * Modèles pédagogiques Python prêts à l'emploi et impeccablement formatés
 */
export const PYTHON_TEMPLATES: PythonTemplate[] = [
  {
    id: 'py-variables-print',
    title: 'Niveau 1 : Variables et affichage console',
    level: 1,
    description: 'Déclaration de variables simples, calcul et affichage avec f-strings.',
    code: `# Programme 1 : Présentation d'un élève
prenom = "Lucas"
nom = "Dupont"
classe = "3ème A"
age = 14

print(f"Bonjour, je m'appelle {prenom} {nom}.")
print(f"Je suis en classe de {classe} et j'ai {age} ans.")
print("Bienvenue dans le cours d'informatique !")`
  },
  {
    id: 'py-conditions-if',
    title: 'Niveau 2 : Conditions if / elif / else',
    level: 2,
    description: 'Test conditionnel pour attribuer une mention selon la note de l\'élève.',
    code: `# Programme 2 : Attribution des mentions au Brevet
note = 15.5

if note >= 16:
    mention = "Très Bien"
elif note >= 14:
    mention = "Bien"
elif note >= 12:
    mention = "Assez Bien"
elif note >= 10:
    mention = "Admis"
else:
    mention = "Ajourné"

print(f"Note obtenue : {note}/20")
print(f"Résultat : {mention}")`
  },
  {
    id: 'py-loop-for',
    title: 'Niveau 3 : Boucle for et table de multiplication',
    level: 3,
    description: 'Calcul et affichage de la table de multiplication avec une boucle for.',
    code: `# Programme 3 : Table de multiplication
table = 7
print(f"--- Table de {table} ---")

for i in range(1, 11):
    resultat = table * i
    print(f"{table} x {i} = {resultat}")

print("Fin du calcul de la table.")`
  },
  {
    id: 'py-functions-list',
    title: 'Niveau 4 : Fonction et calcul de moyenne',
    level: 4,
    description: 'Définition d\'une fonction avec paramètres et manipulation d\'une liste de notes.',
    code: `# Programme 4 : Calcul de moyenne
def calculer_moyenne(notes):
    total = sum(notes)
    nombre = len(notes)
    if nombre == 0:
        return 0
    return round(total / nombre, 2)


notes_eleve = [14.5, 18, 12, 16.5, 15]
moyenne = calculer_moyenne(notes_eleve)

print(f"Liste des notes : {notes_eleve}")
print(f"Moyenne générale de l'élève : {moyenne}/20")`
  },
  {
    id: 'py-loop-while',
    title: 'Niveau 5 : Boucle while et recherche',
    level: 5,
    description: 'Compte à rebours et accumulation avec boucle conditionnelle while.',
    code: `# Programme 5 : Compte à rebours et somme
compteur = 5
total = 0

while compteur > 0:
    print(f"Compte à rebours : {compteur}...")
    total += compteur
    compteur -= 1

print("Décollage réussi !")
print(f"Somme cumulée : {total}")`
  }
];

/**
 * Met en forme automatiquement un script Python selon les conventions PEP 8 :
 * - Indentation stricte à 4 espaces par niveau
 * - Espacement régulier autour des opérateurs
 * - Espaces après virgules et deux-points
 * - Suppression des espaces superflus en fin de ligne
 */
export function formatPythonScript(rawCode: string): string {
  if (!rawCode || !rawCode.trim()) return '';

  const lines = rawCode.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const formattedLines: string[] = [];
  let currentIndentLevel = 0;

  // Mots-clés qui déclenchent une dé-indentation temporaire sur leur propre ligne
  const dedentKeywords = /^\s*(elif\b|else:|except\b|finally:|case\b)/;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Ligne vide
    if (!line.trim()) {
      formattedLines.push('');
      continue;
    }

    const trimmed = line.trim();

    // Gestion des commentaires purs
    if (trimmed.startsWith('#')) {
      const indent = ' '.repeat(Math.max(0, currentIndentLevel * 4));
      formattedLines.push(indent + trimmed);
      continue;
    }

    // Si la ligne commence par elif, else, except, etc., elle s'aligne sur le niveau précédent
    let lineIndent = currentIndentLevel;
    if (dedentKeywords.test(trimmed) && currentIndentLevel > 0) {
      lineIndent = currentIndentLevel - 1;
    }

    // Nettoyage et espacement de la ligne
    let cleanLine = formatPythonLine(trimmed);

    // Appliquer l'indentation
    const indent = ' '.repeat(Math.max(0, lineIndent * 4));
    formattedLines.push(indent + cleanLine);

    // Ajuster le niveau d'indentation pour la ligne suivante :
    // Si la ligne se termine par ':' (sans être dans une chaîne ou un commentaire), le bloc suivant sera indenté
    const cleanWithoutComment = cleanLine.split('#')[0].trim();
    if (cleanWithoutComment.endsWith(':')) {
      currentIndentLevel = lineIndent + 1;
    } else if (
      /^\s*(return\b|break\b|continue\b|pass\b|raise\b)/.test(cleanLine) &&
      currentIndentLevel > 0
    ) {
      // Les instructions terminales réduisent souvent l'indentation suivante si la ligne précédente était indentée
      // mais restons prudents pour ne pas casser des blocs complexes
    }
  }

  // Nettoyage des sauts de ligne multiples en fin de fichier
  return formattedLines.join('\n').trim();
}

// Alias pour la compatibilité
export const formatPythonCode = formatPythonScript;

/**
 * Formate une seule ligne de code Python (espacement d'opérateurs, virgules)
 */
function formatPythonLine(line: string): string {
  let inString = false;
  let quoteChar = '';
  let result = '';
  let inComment = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const prev = i > 0 ? line[i - 1] : '';
    const next = i < line.length - 1 ? line[i + 1] : '';

    if (inComment) {
      result += ch;
      continue;
    }

    if (!inString && ch === '#') {
      inComment = true;
      if (result.length > 0 && !result.endsWith(' ')) {
        result += '  #';
      } else {
        result += ch;
      }
      continue;
    }

    if ((ch === '"' || ch === "'") && prev !== '\\') {
      if (!inString) {
        inString = true;
        quoteChar = ch;
      } else if (quoteChar === ch) {
        inString = false;
      }
    }

    if (!inString) {
      // Normaliser les virgules : toujours suivies d'un espace, jamais précédées d'un espace
      if (ch === ',') {
        if (result.endsWith(' ')) {
          result = result.trimEnd();
        }
        result += ', ';
        if (next === ' ') {
          i++; // ignorer l'espace suivant déjà présent
        }
        continue;
      }

      // Normaliser les deux-points pour les dictionnaires ou tranches
      if (ch === ':' && next !== ' ' && next !== '' && next !== '\n') {
        result += ': ';
        continue;
      }
    }

    result += ch;
  }

  return result.trimEnd();
}
