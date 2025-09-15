
'use server';
/**
 * @fileOverview A link moderation AI agent.
 *
 * - moderateLink - A function that handles the link moderation process.
 * - ModerateLinkInput - The input type for the moderateLink function.
 * - ModerateLinkOutput - The return type for the moderateLink function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

export const ModerateLinkInputSchema = z.object({
  title: z.string().describe('The title of the link.'),
  url: z.string().describe('The URL of the link.'),
});
export type ModerateLinkInput = z.infer<typeof ModerateLinkInputSchema>;

export const ModerateLinkOutputSchema = z.object({
  isAppropriate: z.boolean().describe('Whether or not the link is appropriate.'),
  reason: z.string().optional().describe('The reason why the link is not appropriate.'),
});
export type ModerateLinkOutput = z.infer<typeof ModerateLinkOutputSchema>;

export async function moderateLink(input: ModerateLinkInput): Promise<ModerateLinkOutput> {
  return moderateLinkFlow(input);
}

const prompt = ai.definePrompt({
  name: 'moderateLinkPrompt',
  input: {schema: ModerateLinkInputSchema},
  output: {schema: ModerateLinkOutputSchema},
  prompt: `You are a content moderator for a social media platform called Edengram.
Your task is to determine if a user-submitted link is appropriate.

A link is considered inappropriate if it falls into any of these categories:
- Contains sexually explicit content, nudity, or pornography.
- Promotes violence, hate speech, or harassment.
- Is a scam, phishing attempt, or malware.
- Promotes illegal activities or substances.

Analyze the following link title and URL.

Title: {{{title}}}
URL: {{{url}}}

Based on this information, decide if the link is appropriate. If it is not appropriate, provide a brief reason.
Set the isAppropriate field to false if the content is inappropriate, and true otherwise.
`,
});

const moderateLinkFlow = ai.defineFlow(
  {
    name: 'moderateLinkFlow',
    inputSchema: ModerateLinkInputSchema,
    outputSchema: ModerateLinkOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
