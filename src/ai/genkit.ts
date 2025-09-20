
'use server';

/**
 * @fileoverview This file initializes and configures the Genkit AI library.
 */
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Initialize Genkit with the Google AI plugin.
export const ai = genkit({
  plugins: [googleAI()],
});
