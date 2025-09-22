
'use server';
/**
 * @fileOverview A spelling correction utility using nspell.
 *
 * - correctSpelling - A function that handles spelling correction.
 * - SpellCheckInput - The input type for the correctSpelling function.
 * - SpellCheckOutput - The return type for the correctSpelling function.
 */

import nspell from 'nspell';
import fs from 'fs/promises';
import path from 'path';

export interface SpellCheckInput {
  word: string;
}

export interface SpellCheckOutput {
  summary: string;
}

let spell: any;

// Asynchronously load the dictionary files
async function loadDictionary() {
  try {
    const affPath = path.join(process.cwd(), 'node_modules', 'dictionary-en', 'index.aff');
    const dicPath = path.join(process.cwd(), 'node_modules', 'dictionary-en', 'index.dic');
    
    const [aff, dic] = await Promise.all([
      fs.readFile(affPath, 'utf-8'),
      fs.readFile(dicPath, 'utf-8')
    ]);

    return { aff, dic };
  } catch (error) {
    console.error('Failed to load dictionary files:', error);
    throw new Error('Could not load dictionary files for spell checker.');
  }
}

async function getSpellChecker() {
  if (spell) {
    return spell;
  }
  const { aff, dic } = await loadDictionary();
  spell = nspell(aff, dic);
  return spell;
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
