
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { firebase } from '@genkit-ai/firebase';
import { defineFlow, runFlow } from 'genkit';
import { z } from 'zod';

import * as flow from './flows/moderate-link-flow';

const fns = {
  moderateLink: flow.moderateLink,
};

genkit({
  plugins: [
    firebase(),
    googleAI({
      apiVersion: 'v1beta',
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

export const moderateLink = defineFlow(
  {
    name: 'moderateLink',
    inputSchema: flow.ModerateLinkInputSchema,
    outputSchema: flow.ModerateLinkOutputSchema,
  },
  async (input) => {
    return await fns.moderateLink(input);
  }
);
