'use server';
/**
 * @fileOverview A utility for searching anime information using the Jikan API.
 *
 * - searchAnime - A function that handles the anime search process.
 * - SearchAnimeInput - The input type for the searchAnime function.
 * - SearchAnimeOutput - The return type for the searchAnime function.
 */

export interface SearchAnimeInput {
  query: string;
}

export interface SearchAnimeOutput {
  summary: string;
}

const getNotFoundResponse = (query: string) => {
    const responses = [
        `I couldn't find any anime matching "${query}". Is that a new one?`,
        `My search for the anime "${query}" came up empty. Sorry about that!`,
        `Hmm, I don't have any data on an anime called "${query}". Try another title.`
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

export async function searchAnime(input: SearchAnimeInput): Promise<SearchAnimeOutput> {
  const { query } = input;
  const url = new URL('https://api.jikan.moe/v4/anime');
  url.searchParams.append('q', query);
  url.searchParams.append('limit', '1');

  try {
    const response = await fetch(url.toString());
    // The Jikan API can be slow, so we'll give it a bit more time.
    // This is a simple timeout, more robust solutions exist.
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('API request timed out')), 7000)
    );
    
    const data = await Promise.race([response.json(), timeoutPromise]) as any;

    if (!data.data || data.data.length === 0) {
      return { summary: getNotFoundResponse(query) };
    }

    const anime = data.data[0];
    const title = anime.title_english || anime.title;
    const synopsis = anime.synopsis;
    const score = anime.score || 'Not yet rated';

    let summary = `I found an anime called "${title}" with a score of ${score}.`;
    
    if (synopsis) {
      const synopsisWords = synopsis.split(' ');
      if (synopsisWords.length > 60) {
          summary += ` Here's a short summary: "${synopsisWords.slice(0, 60).join(' ')}..."`;
      } else {
          summary += ` Here's the summary: "${synopsis}"`;
      }
    } else {
        summary += " I couldn't find a summary for it, though.";
    }

    return { summary };

  } catch (error: any) {
    console.error('Error fetching from Jikan API:', error);
    if (error.message.includes('timed out')) {
        return { summary: 'The anime database seems to be responding slowly. Please try again in a moment.' };
    }
    return { summary: 'There was an error connecting to the anime database. Please try again later.' };
  }
}
