export interface ParsedQuestionRow {
  index: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: 'A' | 'B' | 'C' | 'D';
  points: number;
  explanation?: string;
  rawLine: string;
  isValid: boolean;
  errorMessage?: string;
}

export function parseQcmImportText(text: string): {
  questions: ParsedQuestionRow[];
  validCount: number;
  invalidCount: number;
  totalPoints: number;
} {
  const lines = text.split(/\r?\n/);
  const questions: ParsedQuestionRow[] = [];
  let validCount = 0;
  let invalidCount = 0;
  let totalPoints = 0;
  let itemIndex = 1;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine || rawLine.startsWith('#') || rawLine.startsWith('//')) {
      continue;
    }

    // Split by pipe '|'
    const parts = rawLine.split('|').map(p => p.trim());

    if (parts.length < 6) {
      invalidCount++;
      questions.push({
        index: itemIndex++,
        questionText: parts[0] || 'Ligne incomplète',
        optionA: parts[1] || '',
        optionB: parts[2] || '',
        optionC: parts[3] || '',
        optionD: parts[4] || '',
        correctOption: 'A',
        points: 1,
        rawLine,
        isValid: false,
        errorMessage: `Format incomplet (${parts.length}/7 colonnes). Attendu : Question? | Réponse A | Réponse B | Réponse C | Réponse D | Bonne réponse | Points`
      });
      continue;
    }

    const questionText = parts[0];
    const optionA = parts[1];
    const optionB = parts[2];
    const optionC = parts[3];
    const optionD = parts[4];
    const rawAnswer = parts[5];
    const rawPoints = parts[6] || '1';
    const explanation = parts[7] || '';

    if (!questionText || !optionA || !optionB) {
      invalidCount++;
      questions.push({
        index: itemIndex++,
        questionText: questionText || 'Question manquante',
        optionA,
        optionB,
        optionC,
        optionD,
        correctOption: 'A',
        points: 1,
        rawLine,
        isValid: false,
        errorMessage: 'La question et les réponses A et B sont obligatoires.'
      });
      continue;
    }

    // Determine correctOption: 'A' | 'B' | 'C' | 'D'
    let correctOption: 'A' | 'B' | 'C' | 'D' = 'A';
    const normAns = rawAnswer.toUpperCase().trim();

    if (normAns === 'A' || normAns === '1' || normAns.startsWith('RÉPONSE A') || normAns.startsWith('REPONSE A') || normAns.startsWith('OPTION A')) {
      correctOption = 'A';
    } else if (normAns === 'B' || normAns === '2' || normAns.startsWith('RÉPONSE B') || normAns.startsWith('REPONSE B') || normAns.startsWith('OPTION B')) {
      correctOption = 'B';
    } else if (normAns === 'C' || normAns === '3' || normAns.startsWith('RÉPONSE C') || normAns.startsWith('REPONSE C') || normAns.startsWith('OPTION C')) {
      correctOption = 'C';
    } else if (normAns === 'D' || normAns === '4' || normAns.startsWith('RÉPONSE D') || normAns.startsWith('REPONSE D') || normAns.startsWith('OPTION D')) {
      correctOption = 'D';
    } else if (rawAnswer.toLowerCase() === optionA.toLowerCase()) {
      correctOption = 'A';
    } else if (rawAnswer.toLowerCase() === optionB.toLowerCase()) {
      correctOption = 'B';
    } else if (optionC && rawAnswer.toLowerCase() === optionC.toLowerCase()) {
      correctOption = 'C';
    } else if (optionD && rawAnswer.toLowerCase() === optionD.toLowerCase()) {
      correctOption = 'D';
    } else {
      const firstChar = normAns.charAt(0);
      if (['A', 'B', 'C', 'D'].includes(firstChar)) {
        correctOption = firstChar as 'A' | 'B' | 'C' | 'D';
      } else {
        correctOption = 'A';
      }
    }

    // Points
    let points = 1;
    const cleanPointsStr = rawPoints.replace(/[^\d.,]/g, '').replace(',', '.');
    const parsedPoints = parseFloat(cleanPointsStr);
    if (!isNaN(parsedPoints) && parsedPoints > 0) {
      points = Math.round(parsedPoints * 10) / 10;
    }

    totalPoints += points;
    validCount++;

    questions.push({
      index: itemIndex++,
      questionText,
      optionA,
      optionB,
      optionC: optionC || '—',
      optionD: optionD || '—',
      correctOption,
      points,
      explanation,
      rawLine,
      isValid: true
    });
  }

  return {
    questions,
    validCount,
    invalidCount,
    totalPoints: Math.round(totalPoints * 10) / 10
  };
}

export const SAMPLE_QCM_IMPORT = `# Format requis pour l'import :
# Question? | Réponse A | Réponse B | Réponse C | Réponse D | Bonne réponse | Points
Quel raccourci clavier permet d'enregistrer un document dans Word ? | Ctrl + C | Ctrl + S | Ctrl + V | Ctrl + P | B | 2
Dans Excel, quelle formule calcule la somme des cellules A1 à A10 ? | =TOTAL(A1:A10) | =SOMME(A1:A10) | =ADDITION(A1:A10) | =SUMA(A1:A10) | B | 2
En Python, quelle fonction permet d'afficher un message à l'écran ? | console.log() | System.out() | print() | echo() | C | 2
Dans un tableur, que signifie le symbole $ dans une référence $A$1 ? | Un format monétaire | Une référence absolue | Une formule protégée | Une erreur | B | 2
Quel composant principal exécute les calculs d'un ordinateur ? | Le disque dur | La mémoire vive (RAM) | Le processeur (CPU) | La carte réseau | C | 2`;
