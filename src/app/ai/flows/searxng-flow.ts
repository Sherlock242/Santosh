
'use server';
/**
 * @fileOverview A SearXNG search utility.
 *
 * - searchSearxng - A function that handles the SearXNG search process.
 * - SearxngInput - The input type for the searchSearxng function.
 * - SearxngOutput - The return type for the searchSearxng function.
 */

export interface SearxngInput {
  query: string;
}

export interface SearxngOutput {
  summary: string;
}

interface SearxngResult {
    title: string;
    url: string;
    content: string;
    engine: string;
}

export async function searchSearxng(input: SearxngInput): Promise<SearxngOutput> {
  const { query } = input;
  // Using a different public instance of SearXNG for better reliability.
  const url = new URL('https://search.ononoki.org/search');
  url.searchParams.append('q', query);
  url.searchParams.append('format', 'json');

  try {
    const response = await fetch(url.toString(), {
        headers: {
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`SearXNG API request failed with status ${response.status}`);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return { summary: "I couldn't find any relevant information for that query. Please try rephrasing your question." };
    }

    // Find the first result with some content
    const firstGoodResult: SearxngResult | undefined = data.results.find((r: SearxngResult) => r.content);

    if (!firstGoodResult) {
       return { summary: "I found some search results, but none with a clear summary. You could try being more specific." };
    }
    
    const title = firstGoodResult.title;
    const content = firstGoodResult.content;
    const source = firstGoodResult.engine;
    
    // Clean up content from HTML tags if any
    const cleanedContent = content.replace(/<[^>]*>/g, '');

    const summary = `According to ${source}, regarding "${title}": ${cleanedContent}`;

    return { summary };

  } catch (error) {
    console.error('Error fetching from SearXNG:', error);
    return { summary: 'There was an error connecting to the web search engine. Please try again later.' };
  }
}
