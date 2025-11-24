import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory cache
const promptCache = new Map<string, { prompt: string; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt_id } = await req.json();
    
    if (!prompt_id) {
      return new Response(
        JSON.stringify({ error: 'prompt_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    // Check cache first
    const cached = promptCache.get(prompt_id);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
      console.log(`[get-system-prompt] Cache hit for ${prompt_id}`);
      return new Response(
        JSON.stringify({ 
          prompt_template: cached.prompt,
          source: 'cache'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    // Fetch from database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('system_prompts')
      .select('prompt_template, is_active')
      .eq('id', prompt_id)
      .single();

    if (error || !data) {
      console.error(`[get-system-prompt] Error fetching prompt ${prompt_id}:`, error);
      return new Response(
        JSON.stringify({ error: `Prompt not found: ${prompt_id}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    if (!data.is_active) {
      return new Response(
        JSON.stringify({ error: `Prompt ${prompt_id} is not active` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    // Update cache
    promptCache.set(prompt_id, {
      prompt: data.prompt_template,
      timestamp: Date.now()
    });

    console.log(`[get-system-prompt] Successfully fetched prompt ${prompt_id} from database`);

    return new Response(
      JSON.stringify({ 
        prompt_template: data.prompt_template,
        source: 'database'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );

  } catch (error) {
    console.error('[get-system-prompt] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch prompt',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );
  }
});