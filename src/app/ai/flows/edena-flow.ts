
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

export async function edenaAssistant(input: EdenaInput): Promise<EdenaOutput> {
  const { query } = input;
  const lowerCaseQuery = query.toLowerCase();

  // Check if the query is likely about a book, article, or general topic
  const isBookQuery = bookKeywords.some(keyword => lowerCaseQuery.includes(keyword));
  const isArticleQuery = articleKeywords.some(keyword => lowerCaseQuery.includes(keyword));

  try {
    let result;
    if (isBookQuery) {
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
