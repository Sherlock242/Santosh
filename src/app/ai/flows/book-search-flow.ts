'use server';
/**
 * @fileOverview A utility for searching books using the Open Library API.
 *
 * - searchOpenLibrary - A function that handles the book search process.
 * - SearchBookInput - The input type for the searchOpenLibrary function.
 * - SearchBookOutput - The return type for the searchOpenLibrary function.
 */

export interface SearchBookInput {
  query: string;
}

export interface SearchBookOutput {
  summary: string;
}

export async function searchOpenLibrary(input: SearchBookInput): Promise<SearchBookOutput> {
  const { query } = input;
  const url = new URL('https://openlibrary.org/search.json');
  url.searchParams.append('q', query);
  url.searchParams.append('limit', '1');
  url.searchParams.append('fields', 'title,author_name,first_publish_year,first_sentence');

  try {
    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.numFound === 0 || !data.docs || data.docs.length === 0) {
      return { summary: "I couldn't find any books matching that query. Please try a different title or author." };
    }

    const book = data.docs[0];
    const title = book.title || 'Unknown Title';
    const author = book.author_name ? book.author_name.join(', ') : 'Unknown Author';
    const year = book.first_publish_year || 'Unknown Year';
    const firstSentence = book.first_sentence;

    let summary = `Found "${title}" by ${author}, first published in ${year}.`;
    if (firstSentence) {
        summary += ` The first sentence is: "${Array.isArray(firstSentence) ? firstSentence[0] : firstSentence}"`;
    } else {
        summary += ' No summary or first sentence is available for this book.';
    }

    return { summary };

  } catch (error) {
    console.error('Error fetching from Open Library:', error);
    return { summary: 'There was an error connecting to the book library. Please try again later.' };
  }
}
