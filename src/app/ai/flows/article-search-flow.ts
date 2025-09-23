'use server';
/**
 * @fileOverview A utility for searching articles using the Internet Archive API.
 *
 * - searchInternetArchive - A function that handles the article search process.
 * - SearchArticleInput - The input type for the searchInternetArchive function.
 * - SearchArticleOutput - The return type for the searchInternetArchive function.
 */

export interface SearchArticleInput {
  query: string;
}

export interface SearchArticleOutput {
  summary: string;
}

export async function searchInternetArchive(input: SearchArticleInput): Promise<SearchArticleOutput> {
  const { query } = input;
  // Using the scrape endpoint which is simpler for this use case
  const url = new URL('https://archive.org/services/search/v1/scrape');
  url.searchParams.append('q', query);
  url.searchParams.append('count', '1'); // Get the top result
  url.searchParams.append('fields', 'title,description');

  try {
    const response = await fetch(url.toString());
    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return { summary: "I couldn't find any articles or documents matching that query on the Internet Archive." };
    }

    const item = data.items[0];
    const title = item.title || 'Unknown Title';
    const description = item.description || 'No description available.';

    // Clean up the description
    const cleanedDescription = Array.isArray(description) ? description[0] : description;
    
    let summary = `From the Internet Archive, I found an item titled "${title}".`;
    const summaryWords = cleanedDescription.split(' ');
    
    if (summaryWords.length > 50) {
        summary += ` Here's a short snippet: "${summaryWords.slice(0, 50).join(' ')}..."`;
    } else {
        summary += ` The description is: "${cleanedDescription}"`;
    }

    return { summary };

  } catch (error) {
    console.error('Error fetching from Internet Archive:', error);
    return { summary: 'There was an error connecting to the Internet Archive. Please try again later.' };
  }
}
