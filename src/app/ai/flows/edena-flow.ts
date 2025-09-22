
'use server';
/**
 * @fileOverview The primary AI assistant for Edena.
 *
 * This flow intelligently routes user queries to the appropriate
 * knowledge base (Wikipedia, Open Library, Internet Archive, or Dictionary)
 * by identifying and stripping common prefixes from the query.
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

// Keyword Lists for routing
const bookKeywords = [
    'book', 'author', 'novel', 'read', 'wrote', 'published'
];
const articleKeywords = [
    'article', 'paper', 'journal', 'document', 'report', 'study on'
];

// Comprehensive list of prefixes provided by the user
const dictionaryPrefixes = [
    "define", "definition of", "meaning of", "what is", "what exactly is", "what does ___ mean",
    "explain", "explain the meaning of", "describe", "give me the definition of", "please define",
    "can you define", "provide a definition of", "what do you mean by", "clarify",
    "in simple terms what is", "i need the meaning of", "how do you define",
    "tell me the definition of", "meaning for", "what’s the meaning of",
    "can you tell me what ___ means", "what’s another word for", "the term ___ means what",
    "define the word", "explain what ___ stands for", "how would you describe",
    "could you define", "definition for", "what exactly does ___ mean"
];

const generalKnowledgePrefixes = [
    // General Info
    "tell me about", "can you tell me about", "please tell me about", "share info about",
    "i want to know about", "i need to know about", "provide details on", "give me information on",
    "information about", "teach me about", "explain about", "can you explain about",
    "tell me something about", "provide facts about", "please share details about",
    "give me some information about", "what can you tell me about", "can you provide info on",
    "details of", "facts on", "share details on", "explain to me about", "talk about",
    "tell me everything about", "overview of", "what should i know about",
    "can you give me more details about", "tell me the story of",
    "i would like to know about", "please explain about", "give me knowledge about",
    "share what you know about", "i’m curious about", "could you tell me about",
    "please share info on", "explain more about", "provide me details about",
    "what information do you have on",

    // History / Events
    "history of", "background of", "origin of", "who created", "who started", "who discovered",
    "who invented", "who wrote", "who made", "when was", "when did ___ happen", "when did ___ start",
    "when did ___ end", "where did ___ happen", "where did ___ originate", "where was ___ invented",
    "why is ___ important", "why did ___ happen", "why was ___ created", "how did ___ happen",
    "how was ___ discovered", "how was ___ invented", "timeline of", "events of", "key events in",
    "chronology of", "development of", "story of", "the first", "the last", "the beginning of",
    "the end of", "early history of", "ancient history of", "modern history of", "legacy of",
    "impact of", "outcome of", "result of", "importance of",

    // People / Biographical
    "who is", "who was", "biography of", "life of", "about", "career of", "works of",
    "achievements of", "contributions of", "accomplishments of", "success of", "failures of",
    "family of", "childhood of", "education of", "birthplace of", "early life of", "death of",
    "cause of death of", "popularity of", "why is ___ famous",
    "awards of", "honors of", "facts about", "tell me about the life of", "career history of",
    "influence of",

    // Comparisons & Explanations
    "difference between", "compare", "contrast ___ with", "similarities between",
    "how is ___ different from", "how is ___ similar to", "which is better", "pros and cons of",
    "advantages of", "disadvantages of", "benefits of", "uses of", "applications of",
    "function of", "purpose of", "role of", "value of", "contribution of", "effect of",
    "what is the role of", "why use", "how is ___ used", "examples of", "types of",
    "kinds of", "categories of", "characteristics of", "features of",

    // Miscellaneous
    "summary of", "abstract of", "outline of", "key points of", "main idea of", "short note on",
    "brief explanation of", "full form of", "abbreviation of", "expansion of", "acronym of",
    "symbol of", "motto of", "meaning behind", "significance of", "explanation for",
    "concept of", "theory of", "philosophy of", "principle of", "law of", "rule of",
    "equation of", "formula of", "definition and example of", "example of", "explain with example",
    "application of", "case study of", "what does the word ___ refer to"
];

/**
 * Strips a given prefix from a query string.
 * Handles special cases like "what does ___ mean".
 * @param query The user's input string.
 * @param prefix The prefix to remove.
 * @returns The cleaned query.
 */
function stripPrefix(query: string, prefix: string): string {
    if (prefix.includes("___")) {
        const parts = prefix.split("___");
        const after = query.substring(parts[0].length);
        return after.substring(0, after.length - parts[1].length).trim();
    }
    return query.substring(prefix.length).trim();
}


export async function edenaAssistant(input: EdenaInput): Promise<EdenaOutput> {
  const { query } = input;
  const lowerCaseQuery = query.toLowerCase();

  let coreQuery = query;
  let queryType: 'dictionary' | 'book' | 'article' | 'general' = 'general';
  
  // 1. Check for dictionary prefixes first, as they are most specific
  for (const prefix of dictionaryPrefixes) {
    const placeholderPrefix = prefix.replace('___', '').trim();
    if (lowerCaseQuery.startsWith(placeholderPrefix.split(' ')[0]) && lowerCaseQuery.includes(placeholderPrefix.split(' ').slice(-1)[0])) {
         coreQuery = stripPrefix(query, prefix);
         queryType = 'dictionary';
         break;
    }
  }

  // If not a dictionary query, check for other types
  if (queryType !== 'dictionary') {
      const isBookQuery = bookKeywords.some(keyword => lowerCaseQuery.includes(keyword));
      const isArticleQuery = articleKeywords.some(keyword => lowerCaseQuery.includes(keyword));
      
      if (isBookQuery) {
          queryType = 'book';
      } else if (isArticleQuery) {
          queryType = 'article';
      }
      
      // Strip general knowledge prefixes if no other type was matched
      for (const prefix of generalKnowledgePrefixes) {
          if (lowerCaseQuery.startsWith(prefix.replace('___', '').trim())) {
              coreQuery = stripPrefix(query, prefix);
              // Don't break, allow more specific (longer) prefixes to match
          }
      }
  }

  try {
    let result;
    switch(queryType) {
        case 'dictionary':
            result = await searchDictionary({ query: coreQuery });
            break;
        case 'book':
            result = await searchOpenLibrary({ query: coreQuery });
            break;
        case 'article':
            result = await searchInternetArchive({ query: coreQuery });
            break;
        case 'general':
        default:
             // If no specific keyword was found but a general prefix was stripped, use it.
             // Otherwise, the original query is used.
            result = await searchWikipedia({ query: coreQuery });
            break;
    }
    
    return { answer: result.summary };

  } catch (error) {
    console.error(`Edena assistant error for type ${queryType}:`, error);
    // Fallback to Wikipedia with the core query if any other search fails
    try {
        const fallbackResult = await searchWikipedia({ query: coreQuery });
        return { answer: fallbackResult.summary };
    } catch (fallbackError) {
        console.error('Edena fallback error:', fallbackError);
        return { answer: "I'm having trouble connecting to my knowledge bases right now. Please try again later." };
    }
  }
}
