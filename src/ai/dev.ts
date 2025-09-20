
/**
 * @fileoverview This file is the entry point for running Genkit in development mode.
 *
 * To run the Genkit developer UI, run `genkit start` in your terminal.
 */
import {dev} from 'genkit';
import {ai} from './genkit'; // This imports the configured AI instance

// Start the Genkit developer UI.
dev(ai);
