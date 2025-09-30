
'use server';
/**
 * @fileOverview A Wikipedia search utility.
 *
 * - searchWikipedia - A function that handles the Wikipedia search process.
 * - SearchWikipediaInput - The input type for the searchWikipedia function.
 * - SearchWikipediaOutput - The return type for the searchWikipedia function.
 */

// Define input and output types to match the previous implementation
export interface SearchWikipediaInput {
  query: string;
}

export interface SearchWikipediaOutput {
  summary: string;
}

const getNotFoundResponse = (query: string) => {
    const responses = [
        `I couldn't find any information on "${query}". Please try another search.`,
        `My search for "${query}" came up empty. Perhaps try a broader term?`,
        `I'm drawing a blank on "${query}". Could you rephrase it?`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

const getNoSummaryResponse = (query: string) => {
    const responses = [
        `I found an article for "${query}", but it doesn't have a summary. Try being more specific.`,
        `The page for "${query}" exists, but there's no introductory summary. Maybe I could search for a related article?`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

export async function searchWikipedia(input: SearchWikipediaInput): Promise<SearchWikipediaOutput> {
  const { query } = input;
  const url = new URL('https://en.wikipedia.org/w/api.php');
  const params: Record<string, string> = {
      action: 'query',
      format: 'json',
      prop: 'extracts',
      exintro: 'true',
      explaintext: 'true',
      redirects: '1',
      titles: query,
      origin: '*'
  };

  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

  try {
    const response = await fetch(url.toString());
    const data = await response.json();

    const pages = data.query.pages;
    const pageId = Object.keys(pages)[0];

    if (pageId === '-1') {
      return { summary: getNotFoundResponse(query) };
    }

    const page = pages[pageId];
    const summary = page.extract;

    if (summary) {
        // Limit summary to a reasonable length
        const words = summary.split(' ');
        if (words.length > 100) {
            return { summary: words.slice(0, 100).join(' ') + '...' };
        }
        return { summary };
    } else {
        return { summary: getNoSummaryResponse(query) };
    }
  } catch (error) {
    console.error('Error fetching from Wikipedia:', error);
    return { summary: 'There was an error connecting to Wikipedia. Please try again later.' };
  }
}
