import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HazardAnalysisRequest {
  hazard_description: string;
  location: string;
  non_compliance: string;
}

interface SimplifiedHiraRecommendation {
  source: 'hira' | 'ai';
  confidence: number;
  
  rootCauseAnalysis: {
    hazardCategory: string;
    environmentalAspect: string;
    potentialCause: string;
    fullDescription: string;
  };
  
  correctiveActions: Array<{
    controlType: string;
    controlLevel: string;
    actions: string[];
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { hazard_description, location, non_compliance }: HazardAnalysisRequest = await req.json();
    
    console.log('[HIRA-Comprehensive] Processing request for:', hazard_description?.substring(0, 100));

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Search HIRA knowledge base using vector similarity
    const { data: hiraChunks, error: searchError } = await supabase.rpc('similarity_search_hybrid', {
      query_embedding: await generateEmbedding(hazard_description),
      kb_id: 'hira',
      match_count: 10,
      provider: 'client-side'
    });

    if (searchError) {
      console.error('[HIRA-Comprehensive] Search error:', searchError);
    }

    let hiraContext = '';
    if (hiraChunks && hiraChunks.length > 0) {
      console.log(`[HIRA-Comprehensive] Found ${hiraChunks.length} relevant HIRA chunks`);
      hiraContext = hiraChunks
        .filter((chunk: any) => chunk.similarity > 0.3)
        .map((chunk: any) => chunk.chunk_text)
        .join('\n\n');
    }

    // Generate comprehensive recommendations using Gemini
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const simplifiedPrompt = `Anda adalah ahli HIRA (Hazard Identification and Risk Assessment) yang berpengalaman. Berikan analisis HIRA dalam format yang sederhana dan terstruktur.

INFORMASI HAZARD:
- Deskripsi: ${hazard_description}
- Lokasi: ${location}
- Ketidaksesuaian: ${non_compliance}

KONTEKS HIRA KNOWLEDGE BASE:
${hiraContext || 'Tidak ada konteks HIRA yang relevan ditemukan'}

Berikan respons dalam format JSON yang valid dengan struktur berikut:

{
  "confidence": 0.85,
  "rootCauseAnalysis": {
    "hazardCategory": "kategori bahaya utama",
    "environmentalAspect": "aspek lingkungan yang terkait",
    "potentialCause": "penyebab potensial spesifik",
    "fullDescription": "deskripsi lengkap dalam format: [hazardCategory] / [environmentalAspect] / [potentialCause] menyebabkan [dampak]"
  },
  "correctiveActions": [
    {
      "controlType": "Administrasi",
      "controlLevel": "Preventive",
      "actions": [
        "Memastikan operator unit fit untuk bekerja sesuai dengan prosedur fatigue management melalui form fit to work",
        "Pengawas melakukan komunikasi kontak positif dengan operator",
        "Menghentikan kegiatan operator jika terdapat tanda tanda kelelahan/fatique sesuai prosedur Pengelolaan Kelelahan (fatigue management)"
      ]
    },
    {
      "controlType": "Administrasi",
      "controlLevel": "Detective",
      "actions": [
        "Pengawas melakukan observasi operator saat bekerja"
      ]
    }
  ]
}

PENTING:
1. Berikan respons HANYA dalam format JSON yang valid
2. Gunakan bahasa Indonesia yang profesional dan spesifik sesuai konteks industri pertambangan
3. controlType harus salah satu dari: "Eliminasi", "Substitusi", "Engineering", "Administrasi"
4. controlLevel harus salah satu dari: "Preventive", "Detective", "Mitigative"
5. Bisa ada multiple groups dengan tipe dan level yang berbeda
6. fullDescription harus menjelaskan akar permasalahan secara lengkap dengan format "[Bahaya] / [Aspek Lingkungan] / [Penyebab Potensial] menyebabkan [dampak]"`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [{ text: simplifiedPrompt }]
          }],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error('No response from Gemini');
    }

    console.log('[HIRA-Comprehensive] Raw Gemini response:', responseText.substring(0, 200));

    // Parse JSON response
    let recommendations: SimplifiedHiraRecommendation;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const cleanJson = jsonMatch[0]
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      
      recommendations = JSON.parse(cleanJson);
      recommendations.source = hiraContext ? 'hira' : 'ai';
      
      console.log('[HIRA-Simplified] Successfully parsed simplified recommendations');
      
    } catch (parseError) {
      console.error('[HIRA-Simplified] Parse error:', parseError);
      
      // Fallback recommendations
      recommendations = {
        source: 'ai',
        confidence: 0.6,
        rootCauseAnalysis: {
          hazardCategory: 'Kecelakaan kerja',
          environmentalAspect: 'Kondisi operator',
          potentialCause: `Faktor terkait ${non_compliance}`,
          fullDescription: `Kecelakaan kerja / Kondisi operator / Faktor terkait ${non_compliance} menyebabkan potensi insiden`
        },
        correctiveActions: [
          {
            controlType: 'Administrasi',
            controlLevel: 'Preventive',
            actions: [
              'Implementasi prosedur keselamatan yang ketat',
              'Pelatihan berkala untuk operator',
              'Pengawasan rutin oleh supervisor'
            ]
          }
        ]
      };
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        recommendations,
        hira_chunks_found: hiraChunks?.length || 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[HIRA-Comprehensive] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate comprehensive recommendations',
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Simple embedding generation function (fallback)
async function generateEmbedding(text: string): Promise<number[]> {
  // For now, return a dummy embedding for vector search
  // In production, this should use the same embedding model as the client
  return new Array(384).fill(0).map(() => Math.random() - 0.5);
}