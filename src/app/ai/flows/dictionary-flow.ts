
'use server';
/**
 * @fileOverview A utility for searching for word definitions using a free dictionary API.
 *
 * - searchDictionary - A function that handles the dictionary lookup process.
 * - SearchDictionaryInput - The input type for the searchDictionary function.
 * - SearchDictionaryOutput - The return type for the searchDictionary function.
 */

export interface SearchDictionaryInput {
  query: string;
}

export interface SearchDictionaryOutput {
  summary: string;
}

const getNotFoundResponse = (query: string) => {
    const responses = [
        `I couldn't find a definition for "${query}". Please check the spelling.`,
        `Sorry, I don't have a definition for "${query}".`,
        `Hmm, "${query}" doesn't seem to be in my dictionary.`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

export async function searchDictionary(input: SearchDictionaryInput): Promise<SearchDictionaryOutput> {
  const { query } = input;
  const url = new URL(`https://api.dictionaryapi.dev/api/v2/entries/en/${query}`);

  try {
    const response = await fetch(url.toString());
    const data = await response.json();

    if (!response.ok || !Array.isArray(data) || data.length === 0) {
      return { summary: getNotFoundResponse(query) };
    }

    const entry = data[0];
    const word = entry.word;
    
    const firstMeaning = entry.meanings?.[0];
    if (!firstMeaning) {
        return { summary: `I found an entry for "${word}", but it has no definitions.` };
    }

    const definition = firstMeaning.definitions?.[0]?.definition;

    let summary = `The definition of "${word}" is: ${definition}`;
    
    return { summary };

  } catch (error) {
    console.error('Error fetching from Dictionary API:', error);
    return { summary: 'There was an error connecting to the dictionary. Please try again later.' };
  }
}
