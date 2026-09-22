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

function cleanPoints(raw: any): number {
  if (raw === undefined || raw === null || raw === '') return 1;
  const str = String(raw).replace(/[^\d.,]/g, '').replace(',', '.');
  const num = parseFloat(str);
  return (!isNaN(num) && num > 0) ? Math.round(num * 10) / 10 : 1;
}

function resolveAnswer(
  ans: string,
  optA: string,
  optB: string,
  optC?: string,
  optD?: string
): 'A' | 'B' | 'C' | 'D' {
  if (!ans) return 'A';
  const a = String(ans).trim().toUpperCase();

  if (a === 'A' || a === '1' || a.startsWith('REPONSE A') || a.startsWith('RÉPONSE A') || a.startsWith('OPTION A')) return 'A';
  if (a === 'B' || a === '2' || a.startsWith('REPONSE B') || a.startsWith('RÉPONSE B') || a.startsWith('OPTION B')) return 'B';
  if (a === 'C' || a === '3' || a.startsWith('REPONSE C') || a.startsWith('RÉPONSE C') || a.startsWith('OPTION C')) return 'C';
  if (a === 'D' || a === '4' || a.startsWith('REPONSE D') || a.startsWith('RÉPONSE D') || a.startsWith('OPTION D')) return 'D';

  const cleanAns = String(ans).trim().toLowerCase();
  if (optA && cleanAns === optA.trim().toLowerCase()) return 'A';
  if (optB && cleanAns === optB.trim().toLowerCase()) return 'B';
  if (optC && cleanAns === optC.trim().toLowerCase()) return 'C';
  if (optD && cleanAns === optD.trim().toLowerCase()) return 'D';

  // Check for boolean "Vrai" / "Faux" matches
  if (['vrai', 'true', 'v'].includes(cleanAns)) {
    if (optA && ['vrai', 'true', 'v'].includes(optA.trim().toLowerCase())) return 'A';
    if (optB && ['vrai', 'true', 'v'].includes(optB.trim().toLowerCase())) return 'B';
    return 'A';
  }
  if (['faux', 'false', 'f'].includes(cleanAns)) {
    if (optB && ['faux', 'false', 'f'].includes(optB.trim().toLowerCase())) return 'B';
    if (optA && ['faux', 'false', 'f'].includes(optA.trim().toLowerCase())) return 'A';
    return 'B';
  }

  const firstChar = a.charAt(0);
  if (['A', 'B', 'C', 'D'].includes(firstChar)) {
    return firstChar as 'A' | 'B' | 'C' | 'D';
  }

  return 'A';
}

function isNumericString(s?: string): boolean {
  if (!s) return false;
  return /^[\d\.,]+(\s*(pts?|points?))?$/i.test(s.trim());
}

function isAnswerString(s?: string): boolean {
  if (!s) return false;
  const t = s.trim().toLowerCase();
  if (/^[a-d1-4]$/i.test(t)) return true;
  if (/^(option|r[ée]ponse)\s*[a-d1-4]/i.test(t)) return true;
  if (['vrai', 'faux', 'true', 'false'].includes(t)) return true;
  return false;
}

export function parseQcmImportText(text: string): {
  questions: ParsedQuestionRow[];
  validCount: number;
  invalidCount: number;
  totalPoints: number;
} {
  const trimmed = text.trim();
  if (!trimmed) {
    return { questions: [], validCount: 0, invalidCount: 0, totalPoints: 0 };
  }

  const lines = text.split(/\r?\n/);
  const questions: ParsedQuestionRow[] = [];
  let validCount = 0;
  let invalidCount = 0;
  let totalPoints = 0;
  let itemIndex = 1;

  // Check if input is multi-line block format (e.g. lines starting with "A)", "A.", "A -")
  const hasBlockFormat = lines.some(l => /^[A-Da-d][\)\.\-:]\s+/.test(l.trim()));

  if (hasBlockFormat) {
    let currentBlock: {
      questionText: string;
      optionA: string;
      optionB: string;
      optionC: string;
      optionD: string;
      rawAnswer: string;
      rawPoints: string;
      explanation: string;
      rawLines: string[];
    } | null = null;

    const finalizeBlock = () => {
      if (!currentBlock) return;
      const strippedQ = currentBlock.questionText.replace(/^(\d+[\.\)]|Q\d+[:\.]?|\-|\*)\s*/i, '').trim();
      const qText = strippedQ || currentBlock.questionText.trim();
      const optA = currentBlock.optionA.trim();
      const optB = currentBlock.optionB.trim();
      const optC = currentBlock.optionC.trim();
      const optD = currentBlock.optionD.trim();
      const isValid = Boolean(qText && optA && optB);

      const pts = cleanPoints(currentBlock.rawPoints);
      const correctOption = resolveAnswer(currentBlock.rawAnswer, optA, optB, optC, optD);

      if (isValid) {
        validCount++;
        totalPoints += pts;
      } else {
        invalidCount++;
      }

      questions.push({
        index: itemIndex++,
        questionText: qText || 'Question manquante',
        optionA: optA || '—',
        optionB: optB || '—',
        optionC: optC || '—',
        optionD: optD || '—',
        correctOption,
        points: pts,
        explanation: currentBlock.explanation.trim() || undefined,
        rawLine: currentBlock.rawLines.join('\n'),
        isValid,
        errorMessage: isValid ? undefined : 'La question et au minimum les options A et B sont requises.'
      });
      currentBlock = null;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#') || line.startsWith('//')) {
        continue;
      }

      const optMatch = line.match(/^([A-Da-d])[\)\.\-:]\s*(.+)/);
      const ansMatch = line.match(/^(?:Bonne\s+)?r[ée]ponse\s*[:=\-]?\s*(.+)/i);
      const ptsMatch = line.match(/^Points?\s*[:=\-]?\s*([\d\.,]+)/i);
      const expMatch = line.match(/^Explication\s*[:=\-]?\s*(.+)/i);

      if (ansMatch && currentBlock) {
        currentBlock.rawAnswer = ansMatch[1].trim();
        currentBlock.rawLines.push(line);
      } else if (ptsMatch && currentBlock) {
        currentBlock.rawPoints = ptsMatch[1].trim();
        currentBlock.rawLines.push(line);
      } else if (expMatch && currentBlock) {
        currentBlock.explanation = expMatch[1].trim();
        currentBlock.rawLines.push(line);
      } else if (optMatch && currentBlock) {
        const letter = optMatch[1].toUpperCase();
        const val = optMatch[2].trim();
        if (letter === 'A') currentBlock.optionA = val;
        else if (letter === 'B') currentBlock.optionB = val;
        else if (letter === 'C') currentBlock.optionC = val;
        else if (letter === 'D') currentBlock.optionD = val;
        currentBlock.rawLines.push(line);
      } else {
        // Starts a new question block if we already have options or matches question header
        const qMatch = line.match(/^(?:\d+[\.\)]|Question\s*\d*[:\.]?)\s*(.+)/i);
        if (qMatch || !currentBlock || (currentBlock.optionA && currentBlock.optionB)) {
          if (currentBlock) {
            finalizeBlock();
          }
          currentBlock = {
            questionText: qMatch ? qMatch[1].trim() : line,
            optionA: '',
            optionB: '',
            optionC: '',
            optionD: '',
            rawAnswer: 'A',
            rawPoints: '1',
            explanation: '',
            rawLines: [line]
          };
        } else if (currentBlock && !currentBlock.optionA) {
          currentBlock.questionText += ' ' + line;
          currentBlock.rawLines.push(line);
        }
      }
    }

    if (currentBlock) {
      finalizeBlock();
    }

    return {
      questions,
      validCount,
      invalidCount,
      totalPoints: Math.round(totalPoints * 10) / 10
    };
  }

  // Otherwise, parse line by line (pipe, tab, semicolon, or comma delimited)
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine || rawLine.startsWith('#') || rawLine.startsWith('//')) {
      continue;
    }

    // Determine delimiter
    let delim = '|';
    if (rawLine.includes('|')) {
      delim = '|';
    } else if (rawLine.includes('\t')) {
      delim = '\t';
    } else if (rawLine.includes(';')) {
      delim = ';';
    } else {
      const commaCount = (rawLine.match(/,/g) || []).length;
      if (commaCount >= 3) {
        delim = ',';
      }
    }

    const parts = rawLine.split(delim).map(p => p.trim());

    if (parts.length < 3) {
      invalidCount++;
      questions.push({
        index: itemIndex++,
        questionText: parts[0] || 'Ligne incomplète',
        optionA: parts[1] || '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctOption: 'A',
        points: 1,
        rawLine,
        isValid: false,
        errorMessage: `Format incomplet. Au minimum : Question | Option A | Option B (ou séparateur tabulation/point-virgule)`
      });
      continue;
    }

    const strippedQuestion = parts[0].replace(/^(\d+[\.\)]|Q\d+[:\.]?|\-|\*)\s*/i, '').trim();
    const questionText = strippedQuestion || parts[0].trim();

    let optA = '';
    let optB = '';
    let optC = '';
    let optD = '';
    let rawAnswer = 'A';
    let rawPoints = '1';
    let explanation = '';

    if (parts.length >= 8) {
      optA = parts[1];
      optB = parts[2];
      optC = parts[3];
      optD = parts[4];
      rawAnswer = parts[5];
      rawPoints = parts[6];
      explanation = parts.slice(7).join(' ');
    } else if (parts.length === 7) {
      optA = parts[1];
      optB = parts[2];
      optC = parts[3];
      optD = parts[4];
      rawAnswer = parts[5];
      rawPoints = parts[6];
    } else if (parts.length === 6) {
      // Could be:
      // A) 4 options + answer (points = 1)
      // B) 3 options + answer + points
      if (isNumericString(parts[5]) && isAnswerString(parts[4])) {
        optA = parts[1];
        optB = parts[2];
        optC = parts[3];
        rawAnswer = parts[4];
        rawPoints = parts[5];
      } else {
        optA = parts[1];
        optB = parts[2];
        optC = parts[3];
        optD = parts[4];
        rawAnswer = parts[5];
        rawPoints = '1';
      }
    } else if (parts.length === 5) {
      // Could be:
      // A) 2 options + answer + points (e.g. Vrai | Faux | A | 2)
      // B) 3 options + answer (points = 1)
      // C) 4 options (default A, points = 1)
      if (isNumericString(parts[4]) && (isAnswerString(parts[3]) || parts[1].toLowerCase() === 'vrai')) {
        optA = parts[1];
        optB = parts[2];
        rawAnswer = parts[3];
        rawPoints = parts[4];
      } else if (isAnswerString(parts[4])) {
        optA = parts[1];
        optB = parts[2];
        optC = parts[3];
        rawAnswer = parts[4];
        rawPoints = '1';
      } else {
        optA = parts[1];
        optB = parts[2];
        optC = parts[3];
        optD = parts[4];
        rawAnswer = 'A';
        rawPoints = '1';
      }
    } else if (parts.length === 4) {
      // Could be:
      // A) 2 options + answer
      // B) 3 options (default answer A)
      if (isAnswerString(parts[3])) {
        optA = parts[1];
        optB = parts[2];
        rawAnswer = parts[3];
      } else {
        optA = parts[1];
        optB = parts[2];
        optC = parts[3];
      }
    } else if (parts.length === 3) {
      optA = parts[1];
      optB = parts[2];
    }

    if (!questionText || !optA || !optB) {
      invalidCount++;
      questions.push({
        index: itemIndex++,
        questionText: questionText || 'Question manquante',
        optionA: optA,
        optionB: optB,
        optionC: optC,
        optionD: optD,
        correctOption: 'A',
        points: 1,
        rawLine,
        isValid: false,
        errorMessage: 'La question et au minimum les options A et B sont obligatoires.'
      });
      continue;
    }

    const correctOption = resolveAnswer(rawAnswer, optA, optB, optC, optD);
    const points = cleanPoints(rawPoints);

    totalPoints += points;
    validCount++;

    questions.push({
      index: itemIndex++,
      questionText,
      optionA: optA,
      optionB: optB,
      optionC: optC || '—',
      optionD: optD || '—',
      correctOption,
      points,
      explanation: explanation ? explanation.trim() : undefined,
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

export const SAMPLE_QCM_IMPORT = `# Format supporté (séparateur tube « | », tabulation Excel ou point-virgule CSV) :
# Question? | Réponse A | Réponse B | Réponse C | Réponse D | Bonne réponse | Points
Quel raccourci clavier permet d'enregistrer un document dans Word ? | Ctrl + C | Ctrl + S | Ctrl + V | Ctrl + P | B | 2
Dans Excel, quelle formule calcule la somme des cellules A1 à A10 ? | =TOTAL(A1:A10) | =SOMME(A1:A10) | =ADDITION(A1:A10) | =SUMA(A1:A10) | B | 2
En Python, quelle fonction permet d'afficher un message à l'écran ? | console.log() | System.out() | print() | echo() | C | 2
Le processeur (CPU) est le cerveau principal d'un ordinateur. | Vrai | Faux | A | 1
Dans un tableur, que signifie le symbole $ dans une référence $A$1 ? | Un format monétaire | Une référence absolue | Une formule protégée | Une erreur | B | 2
Quel composant principal exécute les calculs d'un ordinateur ? | Le disque dur | La mémoire vive (RAM) | Le processeur (CPU) | La carte réseau | C | 2`;

