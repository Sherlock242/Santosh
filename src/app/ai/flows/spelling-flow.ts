
'use server';
/**
 * @fileOverview A spelling correction utility using nspell.
 *
 * - correctSpelling - A function that handles spelling correction.
 * - SpellCheckInput - The input type for the correctSpelling function.
 * - SpellCheckOutput - The return type for the correctSpelling function.
 */

import nspell from 'nspell';
import dictionary from 'dictionary-en';

export interface SpellCheckInput {
  word: string;
}

export interface SpellCheckOutput {
  summary: string;
}

let spell: any;

async function getSpellChecker() {
  if (spell) {
    return spell;
  }
  return new Promise((resolve, reject) => {
    dictionary((err: Error | null, dict: any) => {
      if (err) {
        return reject(err);
      }
      spell = nspell(dict);
      resolve(spell);
    });
  });
}

export async function correctSpelling(input: SpellCheckInput): Promise<SpellCheckOutput> {
  const { word } = input;
  
  if (!word || word.trim().split(' ').length > 1) {
    return { summary: "I can only correct the spelling of a single word at a time." };
  }

  try {
    const spellChecker = await getSpellChecker();
    
    if (spellChecker.correct(word)) {
      return { summary: `"${word}" is spelled correctly.` };
    }

    const suggestions = spellChecker.suggest(word);

    if (suggestions.length > 0) {
      const bestGuess = suggestions[0];
      let response = `I think you meant "${bestGuess}".`;
      if (suggestions.length > 1) {
        response += ` Other possibilities include: ${suggestions.slice(1, 4).join(', ')}.`;
      }
      return { summary: response };
    } else {
      return { summary: `I couldn't find any spelling suggestions for "${word}".` };
    }
  } catch (error) {
    console.error('Error with spell checker:', error);
    return { summary: 'There was an error initializing the spell checker. Please try again later.' };
  }
}
