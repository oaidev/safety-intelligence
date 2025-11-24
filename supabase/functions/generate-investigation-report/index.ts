import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvestigationReportRequest {
  audio?: string; // base64
  audioFileName: string;
  image?: string; // base64 (optional)
  imageFileName?: string;
  transcript?: string; // If already transcribed locally
  useLocalWhisper?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio, audioFileName, image, imageFileName, transcript, useLocalWhisper } = await req.json() as InvestigationReportRequest;
    
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    let finalTranscript = transcript || '';

    // If local Whisper was not used, we need to transcribe using Lovable AI (Gemini)
    if (!useLocalWhisper && audio) {
      console.log('[InvestigationReport] Using Lovable AI (Gemini) for audio transcription');
      
      // Determine MIME type from file extension
      const mimeType = audioFileName.endsWith('.wav') ? 'audio/wav' 
                     : audioFileName.endsWith('.m4a') ? 'audio/mp4'
                     : 'audio/mpeg';

      const transcriptResponse = await fetch(
        'https://ai.gateway.lovable.dev/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Transkripsi audio ini ke Bahasa Indonesia. Tulis hanya hasil transkripsi tanpa tambahan komentar.'
                  },
                  {
                    type: 'input_audio',
                    input_audio: {
                      data: audio,
                      format: mimeType.split('/')[1]
                    }
                  }
                ]
              }
            ],
            max_tokens: 4000,
            temperature: 0.1
          })
        }
      );

      if (!transcriptResponse.ok) {
        const errorText = await transcriptResponse.text();
        console.error('[InvestigationReport] Lovable AI transcription error:', errorText);
        
        if (transcriptResponse.status === 429) {
          throw new Error('Rate limit exceeded. Please try again in a few moments.');
        }
        if (transcriptResponse.status === 402) {
          throw new Error('Payment required. Please add credits to your Lovable AI workspace.');
        }
        throw new Error(`AI transcription error: ${transcriptResponse.status}`);
      }

      const transcriptResult = await transcriptResponse.json();
      finalTranscript = transcriptResult.choices?.[0]?.message?.content || '';
      console.log('[InvestigationReport] Transcript generated, length:', finalTranscript.length);
    }

    if (!finalTranscript || finalTranscript.length < 50) {
      throw new Error('Transcript terlalu pendek atau tidak valid (minimum 50 karakter)');
    }
    
    console.log('[InvestigationReport] Generating report for transcript length:', finalTranscript.length);
    
    // Fetch prompt template from database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: promptData, error: promptError } = await supabase.functions.invoke('get-system-prompt', {
      body: { prompt_id: 'investigation-report' }
    });

    if (promptError || !promptData?.prompt_template) {
      console.error('Failed to fetch prompt template, using fallback');
      throw new Error('Prompt template not available');
    }

    // Replace placeholders with actual transcript
    const promptText = promptData.prompt_template
      .replace('{TRANSCRIPT}', finalTranscript);

    // Build message content with text and optional image
    const messageContent: any[] = [
      {
        type: 'text',
        text: promptText
      }
    ];

    // Add image if provided
    if (image) {
      const imageMimeType = imageFileName?.endsWith('.png') ? 'image/png'
                          : imageFileName?.endsWith('.webp') ? 'image/webp'
                          : 'image/jpeg';

      messageContent.push({
        type: 'image_url',
        image_url: {
          url: `data:${imageMimeType};base64,${image}`
        }
      });

      console.log('[InvestigationReport] Including image evidence in analysis');
    }

    // Call Lovable AI (Gemini) with multimodal prompt
    const response = await fetch(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'user',
              content: messageContent
            }
          ],
          max_tokens: 8000,
          temperature: 0.3
        })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[InvestigationReport] Lovable AI error:', errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a few moments.');
      }
      if (response.status === 402) {
        throw new Error('Payment required. Please add credits to your Lovable AI workspace.');
      }
      throw new Error(`AI generation error: ${response.status}`);
    }
    
    const result = await response.json();
    const reportText = result.choices?.[0]?.message?.content || '';
    
    if (!reportText) {
      throw new Error('Gemini tidak mengembalikan report text');
    }
    
    console.log('[InvestigationReport] Report generated successfully, length:', reportText.length);
    
    return new Response(
      JSON.stringify({ 
        report: reportText,
        generated_at: new Date().toISOString(),
        transcript: finalTranscript,
        has_image: !!image
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[InvestigationReport] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        details: error.toString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
