
'use server';
/**
 * @fileOverview A utility for searching space news using the Spaceflight News API.
 *
 * - searchNews - A function that handles the news search process.
 * - SearchNewsInput - The input type for the searchNews function.
 * - SearchNewsOutput - The return type for the searchNews function.
 */

export interface SearchNewsInput {
  query: string;
}

export interface SearchNewsOutput {
  summary: string;
}

interface Article {
  id: number;
  title: string;
  summary: string;
  published_at: string;
  news_site: string;
}

export async function searchNews(input: SearchNewsInput): Promise<SearchNewsOutput> {
  const { query } = input;
  // Use the search endpoint from Spaceflight News API
  const url = new URL('https://api.spaceflightnewsapi.net/v4/articles/');
  url.searchParams.append('search', query);
  url.searchParams.append('limit', '1'); // Get the top result

  try {
    const response = await fetch(url.toString());
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return { summary: `I couldn't find any recent space news matching "${query}".` };
    }

    const article: Article = data.results[0];
    const title = article.title;
    const articleSummary = article.summary;

    let summary = `From ${article.news_site}, I found an article titled "${title}". Here's a brief summary: ${articleSummary}`;

    return { summary };

  } catch (error) {
    console.error('Error fetching from Spaceflight News API:', error);
    return { summary: 'There was an error connecting to the news service. Please try again later.' };
  }
}
