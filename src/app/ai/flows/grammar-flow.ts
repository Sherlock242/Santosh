
'use server';
/**
 * @fileOverview A very simple, rule-based grammar correction utility.
 *
 * - correctGrammar - A function that applies a few basic grammar rules to a sentence.
 * - GrammarInput - The input type for the correctGrammar function.
 * - GrammarOutput - The return type for the correctGrammar function.
 */

export interface GrammarInput {
  sentence: string;
}

export interface GrammarOutput {
  summary: string;
}

export async function correctGrammar(input: GrammarInput): Promise<GrammarOutput> {
  let correctedSentence = input.sentence.trim();

  // Rule 1: Capitalize the first letter of the sentence.
  if (correctedSentence.length > 0) {
    correctedSentence = correctedSentence.charAt(0).toUpperCase() + correctedSentence.slice(1);
  }

  // Rule 2: Ensure the sentence ends with a period.
  if (correctedSentence.length > 0 && !/[.!?]$/.test(correctedSentence)) {
    correctedSentence += '.';
  }

  // Rule 3: Correct simple "a" vs "an" usage.
  correctedSentence = correctedSentence.replace(/\b(a|A)\s+([aeiouAEIOU]\w*)/g, 'an $2');
  correctedSentence = correctedSentence.replace(/\b(an|An)\s+([bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]\w*)/g, 'a $2');

  // Rule 4: Simple subject-verb agreement corrections.
  const corrections: Record<string, string> = {
    "they is": "they are",
    "he are": "he is",
    "she are": "she is",
    "it are": "it is",
    "i are": "I am",
    "we is": "we are",
    "you is": "you are"
  };
  
  for (const [incorrect, correct] of Object.entries(corrections)) {
      const regex = new RegExp(`\\b${incorrect}\\b`, 'gi');
      correctedSentence = correctedSentence.replace(regex, correct);
  }

  if (correctedSentence === input.sentence.trim() + '.') {
     return { summary: `"${input.sentence}" seems to be grammatically correct.` };
  }


  return { summary: correctedSentence };
}
