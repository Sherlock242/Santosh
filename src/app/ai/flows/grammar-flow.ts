
'use server';
/**
 * @fileOverview A rule-based grammar correction utility.
 *
 * - correctGrammar - A function that applies grammar rules to a sentence.
 * - GrammarInput - The input type for the correctGrammar function.
 * - GrammarOutput - The return type for the correctGrammar function.
 */

import { searchDictionary } from './dictionary-flow';

export interface GrammarInput {
  sentence: string;
}

export interface GrammarOutput {
  summary: string;
}

// This is a simplified, rule-based approach and has significant limitations.
export async function correctGrammar(input: GrammarInput): Promise<GrammarOutput> {
  let sentence = input.sentence.trim();
  const originalSentence = sentence;

  // Basic cleaning
  sentence = sentence.replace(/\s+/g, ' ');

  // Rule 1: Capitalize the first letter.
  if (sentence.length > 0) {
    sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);
  }

  // Rule 2: Ensure the sentence ends with a period if it doesn't have other punctuation.
  if (sentence.length > 0 && !/[.!?]$/.test(sentence)) {
    sentence += '.';
  }

  const words = sentence.split(/\s+/);
  const correctedWords = [...words];

  for (let i = 0; i < words.length; i++) {
    const word = words[i].toLowerCase().replace(/[.,!?]$/, '');
    
    // Attempt to identify part of speech for simple rules.
    // This is highly unreliable due to ambiguity but follows the requested logic.
    try {
        const dictResult = await searchDictionary({ query: word });
        
        // Rule 3: Correct "a" vs "an"
        if (i < words.length - 1) {
            const nextWord = words[i+1].toLowerCase();
            const nextWordStartsWithVowel = /^[aeiou]/.test(nextWord);

            if (word === 'a' && nextWordStartsWithVowel) {
                correctedWords[i] = 'an';
            } else if (word === 'an' && !nextWordStartsWithVowel) {
                 correctedWords[i] = 'a';
            }
        }

    } catch (e) {
      // Ignore dictionary errors and continue
    }
  }

  let correctedSentence = correctedWords.join(' ');

  // Rule 4: Simple subject-verb agreement corrections using regex (more reliable than dictionary)
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
      correctedSentence = correctedSentence.replace(regex, (match) => {
        // Preserve case
        if (match[0] === match[0].toUpperCase()) {
            return correct.charAt(0).toUpperCase() + correct.slice(1);
        }
        return correct;
      });
  }

  // Rule 5: Remove consecutive duplicate words
  correctedSentence = correctedSentence.replace(/\b(\w+)\s+\1\b/gi, '$1');

  // Final check for I am
  correctedSentence = correctedSentence.replace(/\bi am\b/g, 'I am');
  
  if (correctedSentence === originalSentence || correctedSentence === originalSentence + '.') {
     return { summary: `"${originalSentence}" seems to be grammatically correct.` };
  }

  return { summary: correctedSentence };
}
