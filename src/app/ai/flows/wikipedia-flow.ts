
'use server';
/**
 * @fileOverview A Wikipedia search AI agent.
 *
 * - searchWikipedia - A function that handles the Wikipedia search process.
 * - SearchWikipediaInput - The input type for the searchWikipedia function.
 * - SearchWikipediaOutput - The return type for the searchWikipedia function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SearchWikipediaInputSchema = z.object({
  query: z.string().describe('The search query for Wikipedia.'),
});
export type SearchWikipediaInput = z.infer<typeof SearchWikipediaInputSchema>;

const SearchWikipediaOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the Wikipedia article found.'),
});
export type SearchWikipediaOutput = z.infer<typeof SearchWikipediaOutputSchema>;

export async function searchWikipedia(input: SearchWikipediaInput): Promise<SearchWikipediaOutput> {
  return searchWikipediaFlow(input);
}

const prompt = ai.definePrompt({
  name: 'searchWikipediaPrompt',
  input: {schema: SearchWikipediaInputSchema},
  output: {schema: SearchWikipediaOutputSchema},
  prompt: `You are an expert researcher. Your task is to provide a concise summary of the Wikipedia page for the given query.

Query: {{{query}}}

Please provide a summary of the main points from the Wikipedia article. If no article is found, say so.`,
});

const searchWikipediaFlow = ai.defineFlow(
  {
    name: 'searchWikipediaFlow',
    inputSchema: SearchWikipediaInputSchema,
    outputSchema: SearchWikipediaOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
