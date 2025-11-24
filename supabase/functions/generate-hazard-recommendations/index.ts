import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HazardData {
  deskripsi_temuan: string;
  lokasi: string;
  ketidaksesuaian: string;
  sub_ketidaksesuaian: string;
  quick_action?: string;
  image_base64?: string;
}

interface AIRecommendations {
  root_cause_analysis: string;
  corrective_actions: string;
  preventive_measures: string;
  risk_level: 'HIGH' | 'MEDIUM' | 'LOW';
  kategori_temuan: string;
  jenis_tindakan: string;
  alur_permasalahan: string;
  tindakan: string;
  due_date_suggestion: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { hazardData }: { hazardData: HazardData } = await req.json();
    
    if (!hazardData?.deskripsi_temuan) {
      return new Response(
        JSON.stringify({ error: 'Deskripsi temuan is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY not found');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Generating recommendations for hazard:', hazardData.deskripsi_temuan.substring(0, 100));

    // Fetch prompt template from database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: promptData, error: promptError } = await supabase.functions.invoke('get-system-prompt', {
      body: { prompt_id: 'hazard-recommendations' }
    });

    if (promptError || !promptData?.prompt_template) {
      console.error('Failed to fetch prompt template, using fallback');
      throw new Error('Prompt template not available');
    }

    // Replace placeholders with actual hazard data
    const prompt = promptData.prompt_template
      .replace('{DESKRIPSI_TEMUAN}', hazardData.deskripsi_temuan)
      .replace('{LOKASI}', hazardData.lokasi)
      .replace('{KETIDAKSESUAIAN}', hazardData.ketidaksesuaian)
      .replace('{SUB_KETIDAKSESUAIAN}', hazardData.sub_ketidaksesuaian)
      .replace('{QUICK_ACTION}', hazardData.quick_action || 'Tidak ada');

    // Create content array for Gemini API
    const content = [{
      role: "user",
      parts: [{ text: prompt }]
    }];

    // Add image if provided
    if (hazardData.image_base64) {
      content[0].parts.push({
        text: "Analisis juga gambar yang dilampirkan untuk memberikan rekomendasi yang lebih akurat."
      });
    }

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: content,
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
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
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    console.log('Gemini API response received');
    
    if (!geminiData.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Invalid Gemini response structure:', geminiData);
      throw new Error('Invalid response from Gemini API');
    }

    const responseText = geminiData.candidates[0].content.parts[0].text;
    console.log('Raw Gemini response:', responseText.substring(0, 200));

    // Parse JSON response from Gemini
    let recommendations: AIRecommendations;
    try {
      // Clean up the response text to extract JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const cleanJson = jsonMatch[0]
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      
      recommendations = JSON.parse(cleanJson);
      
      // Validate required fields
      if (!recommendations.root_cause_analysis || !recommendations.corrective_actions) {
        throw new Error('Missing required fields in AI response');
      }

      console.log('Successfully parsed AI recommendations');
      
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      console.error('Response text:', responseText);
      
      // Fallback recommendations
      recommendations = {
        root_cause_analysis: `Analisis akar masalah untuk ${hazardData.ketidaksesuaian} di lokasi ${hazardData.lokasi}. Faktor penyebab utama kemungkinan meliputi: kurangnya pengawasan, prosedur yang tidak diikuti, atau kondisi peralatan yang tidak memadai.`,
        corrective_actions: `Tindakan perbaikan segera: 1) Perbaiki kondisi yang tidak aman, 2) Lakukan briefing keselamatan, 3) Monitor implementasi perbaikan`,
        preventive_measures: `Langkah pencegahan: 1) Pelatihan berkala, 2) Inspeksi rutin, 3) Perbaikan sistem manajemen K3`,
        risk_level: hazardData.deskripsi_temuan.toLowerCase().includes('bahaya') ? 'HIGH' : 'MEDIUM',
        kategori_temuan: 'Kondisi Tidak Aman',
        jenis_tindakan: 'PERBAIKAN',
        alur_permasalahan: `Temuan ${hazardData.ketidaksesuaian} dapat berpotensi menyebabkan kecelakaan kerja jika tidak ditangani segera`,
        tindakan: `Lakukan perbaikan segera dan implementasi kontrol tambahan untuk mencegah kejadian serupa`,
        due_date_suggestion: 7
      };
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        recommendations 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in generate-hazard-recommendations function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate recommendations',
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});