
'use server';
/**
 * @fileOverview A Google Custom Search Engine (CSE) utility.
 *
 * - searchGoogle - A function that handles the Google CSE search process.
 * - GoogleSearchInput - The input type for the searchGoogle function.
 * - GoogleSearchOutput - The return type for the searchGoogle function.
 */

import { createSupabaseServerClient } from '@/lib/supabaseServer';

export interface GoogleSearchInput {
  query: string;
}

export interface GoogleSearchOutput {
  summary: string;
}

export async function searchGoogle(input: GoogleSearchInput): Promise<GoogleSearchOutput> {
  const { query } = input;
  const supabase = createSupabaseServerClient(true); // Use admin client to invoke functions

  const { data, error } = await supabase.functions.invoke('google-search', {
    body: { query },
  });

  if (error) {
    console.error('Error invoking Google Search Edge Function:', error);
    return { summary: "I'm having trouble with my web search tool at the moment. Please try again later." };
  }

  if (data && data.summary) {
    return { summary: data.summary };
  }

  return { summary: "I couldn't find any relevant information for that query on the web." };
}
