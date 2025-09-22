
'use server';
/**
 * @fileOverview The primary AI assistant for Edena.
 *
 * This flow intelligently routes user queries to either the Wikipedia
 * search service, the Open Library book search service, or the Internet Archive
 * article search service.
 */

import { searchWikipedia } from './wikipedia-flow';
import { searchOpenLibrary } from './book-search-flow';
import { searchInternetArchive } from './article-search-flow';
import { searchDictionary } from './dictionary-flow';


export interface EdenaInput {
  query: string;
}

export interface EdenaOutput {
  answer: string;
}

// List of keywords that suggest a book-related search
const bookKeywords = [
    'book', 'author', 'novel', 'read', 'wrote', 'published', 'summary of'
];

// List of keywords that suggest an article-related search
const articleKeywords = [
    'article', 'paper', 'journal', 'document', 'report', 'study on'
];

// List of keywords that suggest a dictionary-related search
const dictionaryKeywords = [
    'define in simple words',
    'in simple terms, what is',
    'how would you define',
    'what’s the definition of',
    'provide a definition of',
    'give me the definition of',
    'what does the word',
    'explain the meaning of',
    'give an explanation of',
    'what is the meaning of',
    'tell me the meaning of',
    'what do you understand by',
    'what do you mean by',
    'could you explain',
    'what does',
    'what exactly is',
    'define the term',
    'can you define',
    'please define',
    'definition of',
    'clarify',
    'describe',
    'explain',
    'meaning of',
    'tell me about',
    'define',
    'what is',
    'what are',
    'mean',
];

export async function edenaAssistant(input: EdenaInput): Promise<EdenaOutput> {
  const { query } = input;
  const lowerCaseQuery = query.toLowerCase();

  // Check if the query is likely about a book, article, definition, or general topic
  const isBookQuery = bookKeywords.some(keyword => lowerCaseQuery.includes(keyword));
  const isArticleQuery = articleKeywords.some(keyword => lowerCaseQuery.includes(keyword));
  const isDictionaryQuery = dictionaryKeywords.some(keyword => lowerCaseQuery.startsWith(keyword) || lowerCaseQuery.endsWith(keyword));

  try {
    let result;
    if (isDictionaryQuery) {
        // Extract the word to be defined
        let wordToDefine = query;
        let keywordUsed = '';

        for (const keyword of dictionaryKeywords) {
            if (lowerCaseQuery.startsWith(keyword.replace(/\s+$/, ''))) {
                wordToDefine = query.substring(keyword.length).trim();
                keywordUsed = keyword;
                break;
            }
            if (lowerCaseQuery.endsWith(keyword.replace(/^\s+/, ''))) {
                 wordToDefine = query.substring(0, query.length - keyword.length).trim();
                 keywordUsed = keyword;
                 break;
            }
        }
        
        // Special case for "[word] definition"
        if (lowerCaseQuery.endsWith(' definition')) {
            wordToDefine = query.substring(0, query.length - ' definition'.length).trim();
        }
        
        // Special case for "what does X mean"
        if (keywordUsed === 'what does' && lowerCaseQuery.endsWith(' mean')) {
             wordToDefine = wordToDefine.replace(/mean$/i, '').trim();
        }


        result = await searchDictionary({ query: wordToDefine });
    } else if (isBookQuery) {
      // If it seems like a book query, try the Open Library first
      result = await searchOpenLibrary({ query });
    } else if (isArticleQuery) {
      // If it seems like an article query, try the Internet Archive
      result = await searchInternetArchive({ query });
    } else {
      // Otherwise, search Wikipedia
      result = await searchWikipedia({ query });
    }
    
    return { answer: result.summary };

  } catch (error) {
    console.error('Edena assistant error:', error);
    // As a fallback, always try Wikipedia if the primary choice fails
    try {
        const fallbackResult = await searchWikipedia({ query });
        return { answer: fallbackResult.summary };
    } catch (fallbackError) {
        console.error('Edena fallback error:', fallbackError);
        return { answer: "I'm having trouble connecting to my knowledge bases right now. Please try again later." };
    }
  }
}
