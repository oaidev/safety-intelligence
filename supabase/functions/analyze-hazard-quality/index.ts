import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HazardFormData {
  deskripsi_temuan: string;
  ketidaksesuaian: string;
  sub_ketidaksesuaian: string;
  tools_pengamatan: string;
  lokasi_detail: string;
  location_description?: string;
  quick_action: string;
  image_base64?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { formData }: { formData: HazardFormData } = await req.json();
    
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not found');
    }

    // Fetch prompt template from database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: promptData, error: promptError } = await supabase.functions.invoke('get-system-prompt', {
      body: { prompt_id: 'hazard-quality-scoring' }
    });

    if (promptError || !promptData?.prompt_template) {
      console.error('Failed to fetch prompt template, using fallback');
      throw new Error('Prompt template not available');
    }

    // Replace placeholders with actual form data
    const analysisPrompt = promptData.prompt_template
      .replace('{DESKRIPSI_TEMUAN}', formData.deskripsi_temuan)
      .replace('{KETIDAKSESUAIAN}', formData.ketidaksesuaian)
      .replace('{SUB_KETIDAKSESUAIAN}', formData.sub_ketidaksesuaian)
      .replace('{TOOLS_PENGAMATAN}', formData.tools_pengamatan)
      .replace('{LOKASI_DETAIL}', formData.lokasi_detail)
      .replace('{LOCATION_DESCRIPTION}', formData.location_description || 'Tidak ada')
      .replace('{QUICK_ACTION}', formData.quick_action);

    // Prepare the request for Gemini API
    const requestBody: any = {
      contents: [
        {
          parts: [
            { text: analysisPrompt }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };

    // If there's an image, add it to the request
    if (formData.image_base64) {
      requestBody.contents[0].parts.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: formData.image_base64
        }
      });
    }

    console.log('Making request to Gemini API for hazard quality analysis');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', response.status, errorText);
      throw new Error(`Gemini API request failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('Gemini API Response received');

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No candidates returned from Gemini API');
    }

    const generatedText = data.candidates[0].content.parts[0].text;
    
    // Parse the JSON response from Gemini
    let analysisResult;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', parseError);
      console.error('Raw response:', generatedText);
      throw new Error('Failed to parse analysis result');
    }

    // Validate that we have the expected structure
    if (!analysisResult.scores || !analysisResult.detailed_analysis) {
      throw new Error('Invalid analysis result structure');
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: analysisResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in analyze-hazard-quality function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Analysis failed',
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});