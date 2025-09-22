
'use server';
/**
 * @fileOverview The primary AI assistant for Edena.
 *
 * This flow intelligently routes user queries to either the Wikipedia
 * search service or the Open Library book search service.
 */

import { searchWikipedia } from './wikipedia-flow';
import { searchOpenLibrary } from './book-search-flow';

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

export async function edenaAssistant(input: EdenaInput): Promise<EdenaOutput> {
  const { query } = input;
  const lowerCaseQuery = query.toLowerCase();

  // Check if the query is likely about a book
  const isBookQuery = bookKeywords.some(keyword => lowerCaseQuery.includes(keyword));

  try {
    let result;
    if (isBookQuery) {
      // If it seems like a book query, try the Open Library first
      result = await searchOpenLibrary({ query });
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
