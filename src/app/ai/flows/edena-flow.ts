
'use server';
/**
 * @fileOverview The primary AI assistant for Edena.
 *
 * This flow uses a tool-based approach to answer user queries. It can
 * search Wikipedia to provide information on a wide range of topics.
 */

import { ai } from '@/app/ai/genkit';
import { searchWikipedia } from './wikipedia-flow';
import { z } from 'zod';

const EdenaInputSchema = z.object({
  query: z.string(),
});

const EdenaOutputSchema = z.object({
  answer: z.string(),
});

export type EdenaInput = z.infer<typeof EdenaInputSchema>;
export type EdenaOutput = z.infer<typeof EdenaOutputSchema>;

const wikipediaTool = ai.defineTool(
  {
    name: 'searchWikipedia',
    description: 'Search Wikipedia for a given query.',
    input: {
      schema: z.object({ query: z.string() }),
    },
    output: {
      schema: z.object({ summary: z.string() }),
    },
  },
  async (input) => searchWikipedia(input)
);

const edenaAssistantPrompt = ai.definePrompt({
  name: 'edenaAssistantPrompt',
  tools: [wikipediaTool],
  input: { schema: EdenaInputSchema },
  output: { schema: EdenaOutputSchema },
  prompt: `
    You are Edena, a helpful AI assistant integrated into the Edengram application.
    Your goal is to answer the user's query accurately and concisely.
    If you need to look up information to answer the question, use the provided Wikipedia tool.
    Do not invent information. If you cannot find an answer, say so.
    
    User Query: {{{query}}}
  `,
});

const edenaFlow = ai.defineFlow(
  {
    name: 'edenaFlow',
    inputSchema: EdenaInputSchema,
    outputSchema: EdenaOutputSchema,
  },
  async (input) => {
    const llmResponse = await edenaAssistantPrompt(input);
    const output = llmResponse.output();
    if (!output) {
      throw new Error("The model did not return a valid response.");
    }
    return output;
  }
);

export async function edenaAssistant(input: EdenaInput): Promise<EdenaOutput> {
  return edenaFlow(input);
}
