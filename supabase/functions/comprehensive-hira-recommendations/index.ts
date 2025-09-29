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

interface ComprehensiveRecommendation {
  source: 'hira' | 'ai';
  confidence: number;
  
  potentialRootCauses: {
    humanFactors: string[];
    systemFactors: string[];
    environmentalFactors: string[];
    organizationalFactors: string[];
  };
  
  correctiveActions: {
    elimination: string[];
    substitution: string[];
    engineeringControls: string[];
    administrativeControls: string[];
  };
  
  preventiveControls: {
    procedural: string[];
    technical: string[];
    management: string[];
  };
  
  detectiveControls: {
    routineInspections: string[];
    continuousMonitoring: string[];
    auditsAndReview: string[];
  };
  
  mitigativeControls: {
    emergencyResponse: string[];
    damageControl: string[];
    recoveryPlans: string[];
  };
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

    const comprehensivePrompt = `Anda adalah ahli HIRA (Hazard Identification and Risk Assessment) yang berpengalaman. Berikan analisis komprehensif berdasarkan temuan hazard berikut:

INFORMASI HAZARD:
- Deskripsi: ${hazard_description}
- Lokasi: ${location}
- Ketidaksesuaian: ${non_compliance}

KONTEKS HIRA KNOWLEDGE BASE:
${hiraContext || 'Tidak ada konteks HIRA yang relevan ditemukan'}

Berikan respons dalam format JSON yang valid dengan struktur berikut:

{
  "confidence": 0.85,
  "potentialRootCauses": {
    "humanFactors": ["faktor manusia spesifik seperti fatigue, lack of awareness, dll"],
    "systemFactors": ["kegagalan sistem, gaps prosedur, defisiensi training"],
    "environmentalFactors": ["kondisi lingkungan, masalah peralatan, desain tempat kerja"],
    "organizationalFactors": ["pengawasan manajemen, breakdown komunikasi, keterbatasan resource"]
  },
  "correctiveActions": {
    "elimination": ["solusi eliminasi hazard sepenuhnya"],
    "substitution": ["penggantian dengan alternatif yang lebih aman"],
    "engineeringControls": ["kontrol teknis, barrier fisik, safety devices"],
    "administrativeControls": ["prosedur kerja, training, rotasi kerja"]
  },
  "preventiveControls": {
    "procedural": ["P5M, program training, sertifikasi"],
    "technical": ["standar peralatan, protokol maintenance"],
    "management": ["standar supervisi, protokol komunikasi, fitness for work"]
  },
  "detectiveControls": {
    "routineInspections": ["checklist harian, inspeksi area, pemeriksaan peralatan"],
    "continuousMonitoring": ["observasi perilaku, condition monitoring"],
    "auditsAndReview": ["assessment berkala, compliance check, evaluasi efektivitas"]
  },
  "mitigativeControls": {
    "emergencyResponse": ["prosedur evakuasi, kontak darurat, protokol P3K"],
    "damageControl": ["tindakan segera, containment measures, sistem backup"],
    "recoveryPlans": ["pelaporan insiden, prosedur investigasi, lessons learned"]
  }
}

PENTING: Berikan respons HANYA dalam format JSON yang valid. Gunakan bahasa Indonesia yang profesional dan spesifik sesuai konteks industri pertambangan.`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [{ text: comprehensivePrompt }]
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
    let recommendations: ComprehensiveRecommendation;
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
      
      console.log('[HIRA-Comprehensive] Successfully parsed comprehensive recommendations');
      
    } catch (parseError) {
      console.error('[HIRA-Comprehensive] Parse error:', parseError);
      
      // Fallback recommendations
      recommendations = {
        source: 'ai',
        confidence: 0.6,
        potentialRootCauses: {
          humanFactors: [`Faktor manusia terkait ${non_compliance} - perlu investigasi mendalam`],
          systemFactors: ['Evaluasi prosedur dan sistem yang ada'],
          environmentalFactors: ['Analisis kondisi lingkungan kerja'],
          organizationalFactors: ['Review struktur organisasi dan komunikasi']
        },
        correctiveActions: {
          elimination: ['Evaluasi kemungkinan eliminasi hazard'],
          substitution: ['Pertimbangkan substitusi dengan alternatif lebih aman'],
          engineeringControls: ['Implementasi kontrol teknis yang sesuai'],
          administrativeControls: ['Perbaikan prosedur dan pelatihan']
        },
        preventiveControls: {
          procedural: ['Implementasi P5M yang efektif', 'Program pelatihan berkala'],
          technical: ['Maintenance preventif', 'Inspeksi peralatan rutin'],
          management: ['Pengawasan ketat', 'Komunikasi yang jelas']
        },
        detectiveControls: {
          routineInspections: ['Inspeksi harian', 'Checklist keselamatan'],
          continuousMonitoring: ['Monitoring kondisi', 'Observasi perilaku'],
          auditsAndReview: ['Audit berkala', 'Review efektivitas']
        },
        mitigativeControls: {
          emergencyResponse: ['Prosedur darurat', 'Training emergency'],
          damageControl: ['Containment plan', 'Komunikasi darurat'],
          recoveryPlans: ['Investigasi insiden', 'Lessons learned']
        }
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