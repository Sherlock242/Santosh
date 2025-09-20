
import { genkit, configureGenkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error(
    'GEMINI_API_KEY environment variable not set. Please provide it in your .env.local file.'
  );
}

export const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY })],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
