
'use server';
/**
 * @fileOverview A server action to search Wikipedia and summarize the result.
 */

export interface WikipediaSearchInput {
  query: string;
}

export interface WikipediaSearchOutput {
  summary: string;
}

export async function searchWikipedia(
  input: WikipediaSearchInput
): Promise<WikipediaSearchOutput> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
    input.query
  )}`;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Edengram/1.0 (contact@edengram.com)',
      },
    });
    if (!response.ok) {
      return {
        summary: `I couldn't find a Wikipedia page for "${input.query}". Please try a different search term.`,
      };
    }
    const data = await response.json();
    const summary = data.extract || 'No summary available for this topic.';
    return { summary };
  } catch (error) {
    console.error('Wikipedia API error:', error);
    return {
      summary: 'Sorry, I encountered an error while trying to access Wikipedia.',
    };
  }
}
