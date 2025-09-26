
import { serve } from 'https://deno.land/std@0.177.0/http/mod.ts';
import { corsHeaders } from '../_shared/cors.ts';

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
const GOOGLE_CSE_ID = Deno.env.get('GOOGLE_CSE_ID');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
      console.error('Google API Key or CSE ID not configured in environment variables.');
      return new Response(JSON.stringify({ error: 'Search service is not configured.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    
    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', GOOGLE_API_KEY);
    url.searchParams.set('cx', GOOGLE_CSE_ID);
    url.searchParams.set('q', query);
    url.searchParams.set('num', '1'); // Get the top result

    const res = await fetch(url.toString());

    if (!res.ok) {
        const errorData = await res.json();
        console.error('Google Search API error:', errorData);
        throw new Error(errorData.error.message || `API request failed with status ${res.status}`);
    }

    const data = await res.json();

    let summary = "I couldn't find any relevant information for that query on the web.";

    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      summary = `According to a web search: "${item.title}". ${item.snippet}`;
    }

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
