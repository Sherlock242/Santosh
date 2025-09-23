
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

const dictionaryPrefixes = [
    "define", "definition of", "what's the definition of", "meaning of", "what is the meaning of",
    "what does ___ mean", "define the word"
];


const generalKnowledgePrefixes = [
    "who is", "what is", "tell me about", "can you tell me about", "please tell me about", "share info about",
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
    "history of", "background of", "origin of", "who created", "who started", "who discovered",
    "who invented", "who wrote", "who made", "when was", "when did ___ happen", "when did ___ start",
    "when did ___ end", "where did ___ happen", "where did ___ originate", "where was ___ invented",
    "why is ___ important", "why did ___ happen", "why was ___ created", "how did ___ happen",
    "how was ___ discovered", "how was ___ invented", "timeline of", "events of", "key events in",
    "chronology of", "development of", "story of", "the first", "the last", "the beginning of",
    "the end of", "early history of", "ancient history of", "modern history of", "legacy of",
    "impact of", "outcome of", "result of", "importance of",
    "who was", "biography of", "life of", "about", "career of", "works of",
    "achievements of", "contributions of", "accomplishments of", "success of", "failures of",
    "family of", "childhood of", "education of", "birthplace of", "early life of", "death of",
    "cause of death of", "popularity of", "why is ___ famous",
    "awards of", "honors of", "facts about", "tell me about the life of", "career history of",
    "influence of",
    "difference between", "compare", "contrast ___ with", "similarities between",
    "how is ___ different from", "how is ___ similar to", "which is better", "pros and cons of",
    "advantages of", "disadvantages of", "benefits of", "uses of", "applications of",
    "function of", "purpose of", "role of", "value of", "contribution of", "effect of",
    "what is the role of", "why use", "how is ___ used", "examples of", "types of",
    "kinds of", "categories of", "characteristics of", "features of",
    "summary of", "abstract of", "outline of", "key points of", "main idea of", "short note on",
    "brief explanation of", "full form of", "abbreviation of", "expansion of", "acronym of",
    "symbol of", "motto of", "meaning behind", "significance of", "explanation for",
    "concept of", "theory of", "philosophy of", "principle of", "law of", "rule of",
    "equation of", "formula of", "definition and example of", "example of", "explain with example",
    "application of", "case study of", "what does the word ___ refer to"
];

function stripPrefix(query: string, prefixes: string[]): string | null {
    const lowerCaseQuery = query.toLowerCase();
    for (const prefix of prefixes) {
        const lowerCasePrefix = prefix.replace(/_/g, ' ').toLowerCase();
        if (lowerCaseQuery.startsWith(lowerCasePrefix)) {
            // Find the actual prefix from the original list to get the correct length
            const originalPrefix = prefixes.find(p => p.replace(/_/g, ' ').toLowerCase() === lowerCasePrefix);
            if (originalPrefix) {
                return query.substring(originalPrefix.length).trim();
            }
        }
    }
    return null;
}


export async function edenaAssistant(input: EdenaInput): Promise<EdenaOutput> {
  const { query } = input;
  const lowerCaseQuery = query.toLowerCase();

  let coreQuery = query;
  let queryType: 'dictionary' | 'book' | 'article' | 'general' = 'general';
  let processed = false;

  // Highest priority: Dictionary check
  const dictionaryCoreQuery = stripPrefix(query, dictionaryPrefixes);
  if (dictionaryCoreQuery) {
      coreQuery = dictionaryCoreQuery;
      queryType = 'dictionary';
      processed = true;
  }
  
  // General knowledge and topic-based routing
  if (!processed) {
      const isBookQuery = bookKeywords.some(keyword => lowerCaseQuery.includes(keyword));
      const isArticleQuery = articleKeywords.some(keyword => lowerCaseQuery.includes(keyword));
      
      if (isBookQuery) {
          queryType = 'book';
      } else if (isArticleQuery) {
          queryType = 'article';
      }
      
      const generalCoreQuery = stripPrefix(query, generalKnowledgePrefixes);
      if (generalCoreQuery) {
          coreQuery = generalCoreQuery;
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
            result = await searchWikipedia({ query: coreQuery });
            break;
    }
    
    return { answer: result.summary };

  } catch (error) {
    console.error(`Edena assistant error for type ${queryType}:`, error);
    try {
        const fallbackResult = await searchWikipedia({ query: coreQuery });
        return { answer: fallbackResult.summary };
    } catch (fallbackError) {
        console.error('Edena fallback error:', fallbackError);
        return { answer: "I'm having trouble connecting to my knowledge bases right now. Please try again later." };
    }
  }
}
