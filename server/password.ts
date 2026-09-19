const SIMPLE_WORDS = [
  'soleil', 'lune', 'etoile', 'tigre', 'panda', 'koala', 'renard', 'dauphin',
  'aigle', 'lion', 'fusée', 'robot', 'comete', 'nuage', 'foret', 'pomme',
  'cerise', 'ballon', 'musique', 'faucon', 'baleine', 'navire', 'chateau',
  'bleu', 'vert', 'rouge', 'jaune', 'orange', 'violet', 'cristal', 'galaxie'
];

/**
 * Generates a simple, student-friendly password such as "panda48" or "etoile72"
 */
export function generateSimplePassword(): string {
  const word = SIMPLE_WORDS[Math.floor(Math.random() * SIMPLE_WORDS.length)];
  const num = Math.floor(10 + Math.random() * 89); // Two digits 10-99
  return `${word}${num}`;
}
