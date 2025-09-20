
'use server';
/**
 * @fileOverview A flow that uses Genkit to search Wikipedia and summarize the result.
 */

import { ai } from '@/app/ai/genkit';
import { z } from 'zod';

const WikipediaSearchInputSchema = z.object({
  query: z.string().describe('The search query for Wikipedia.'),
});
export type WikipediaSearchInput = z.infer<typeof WikipediaSearchInputSchema>;

const WikipediaSearchOutputSchema = z.object({
  summary: z
    .string()
    .describe('A concise, one or two-sentence summary of the Wikipedia article found.'),
});
export type WikipediaSearchOutput = z.infer<typeof WikipediaSearchOutputSchema>;

// A tool to fetch data from Wikipedia
const wikipediaSearchTool = ai.defineTool(
  {
    name: 'wikipediaSearch',
    description: 'Search for a topic on Wikipedia and get the introduction.',
    inputSchema: z.object({
      query: z.string(),
    }),
    outputSchema: z.string(),
  },
  async ({ query }) => {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      query
    )}`;
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Edengram/1.0 (contact@edengram.com)',
        },
      });
      if (!response.ok) {
        return `I couldn't find a Wikipedia page for "${query}". Please try a different search term.`;
      }
      const data = await response.json();
      return data.extract || 'No summary available for this topic.';
    } catch (error) {
      console.error('Wikipedia API error:', error);
      return 'Sorry, I encountered an error while trying to access Wikipedia.';
    }
  }
);

// Define the prompt that uses the tool
const summarizationPrompt = ai.definePrompt({
  name: 'wikipediaSummarizationPrompt',
  input: { schema: WikipediaSearchInputSchema },
  output: { schema: WikipediaSearchOutputSchema },
  tools: [wikipediaSearchTool],
  prompt: `Based on the user's query "{{query}}", use the wikipediaSearch tool to find information. Then, provide a very short, conversational summary of the result. If no information is found, say so politely.`,
});

// Define the main flow
const wikipediaSearchFlow = ai.defineFlow(
  {
    name: 'wikipediaSearchFlow',
    inputSchema: WikipediaSearchInputSchema,
    outputSchema: WikipediaSearchOutputSchema,
  },
  async (input) => {
    const {output} = await summarizationPrompt(input);
    if (!output) {
      return { summary: "I couldn't process that request. Please try again." };
    }
    return output;
  }
);

// Exported wrapper function
export async function searchWikipedia(
  input: WikipediaSearchInput
): Promise<WikipediaSearchOutput> {
  return await wikipediaSearchFlow(input);
}
