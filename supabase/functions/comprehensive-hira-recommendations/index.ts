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

    // Generate query embedding using the same model as HIRA import
    const searchQuery = `${non_compliance} ${hazard_description}`;
    const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke(
      'generate-embedding',
      { body: { text: searchQuery } }
    );

    if (embeddingError || !embeddingData?.embedding) {
      console.error('[HIRA-Comprehensive] Embedding error:', embeddingError);
      throw new Error('Failed to generate query embedding');
    }

    // Search HIRA knowledge base using vector similarity
    const { data: hiraChunks, error: searchError } = await supabase.rpc('similarity_search_hybrid', {
      query_embedding: embeddingData.embedding,
      kb_id: 'hira',
      match_count: 10,
      provider: 'client-side'
    });

    if (searchError) {
      console.error('[HIRA-Comprehensive] Search error:', searchError);
    }

    // STRATEGI 1: CEK HIRA FIRST - Filter chunks with good similarity (lowered threshold to 0.3)
    const relevantHiraChunks = hiraChunks?.filter((chunk: any) => chunk.similarity > 0.3) || [];
    
    console.log(`[HIRA-Comprehensive] Found ${hiraChunks?.length || 0} total chunks, ${relevantHiraChunks.length} with similarity > 0.3`);

    if (relevantHiraChunks.length >= 3) {
      // ✅ HIRA DIRECT: Ada cukup hasil bagus dari HIRA
      console.log('[HIRA-Direct] Using HIRA knowledge base directly (skip Gemini)');
      
      try {
        const recommendations = parseHiraChunksDirectly(
          relevantHiraChunks,
          hazard_description,
          location,
          non_compliance
        );
        recommendations.source = 'hira';
        recommendations.confidence = calculateConfidence(relevantHiraChunks);
        
        console.log(`[HIRA-Direct] Successfully parsed HIRA recommendations with confidence ${recommendations.confidence}`);
        
        return new Response(
          JSON.stringify({ 
            success: true,
            recommendations,
            strategy: 'HIRA_DIRECT',
            hira_chunks_found: relevantHiraChunks.length,
            average_similarity: (relevantHiraChunks.reduce((sum: number, c: any) => sum + c.similarity, 0) / relevantHiraChunks.length).toFixed(3)
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
        );
      } catch (parseError) {
        console.error('[HIRA-Direct] Failed to parse HIRA chunks:', parseError);
        console.log('[HIRA-Direct] Falling back to Gemini AI');
        // Continue to Gemini fallback below
      }
    }

    // STRATEGI 2: GEMINI FALLBACK - Tidak cukup HIRA atau parsing gagal
    console.log('[HIRA-Fallback] Insufficient HIRA matches or parsing failed, using Gemini AI');
    
    let hiraContext = '';
    if (hiraChunks && hiraChunks.length > 0) {
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
        strategy: 'GEMINI_FALLBACK',
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

// Parse HIRA chunks directly without AI
function parseHiraChunksDirectly(
  chunks: any[],
  hazardDescription: string,
  location: string,
  nonCompliance: string
): SimplifiedHiraRecommendation {
  console.log('[HIRA-Parser] Parsing HIRA chunks directly');
  
  // Aggregate all chunk texts
  const allText = chunks.map(c => c.chunk_text).join('\n\n');
  
  // Extract root cause information
  const lines = allText.split('\n').filter(l => l.trim());
  
  // Try to find structured HIRA data (format: "Category:Aspect:Cause:Actions")
  let hazardCategory = 'Kecelakaan kerja';
  let environmentalAspect = 'Kondisi kerja';
  let potentialCause = nonCompliance || 'Ketidaksesuaian prosedur';
  
  // Look for category patterns in chunks
  for (const line of lines) {
    if (line.includes(':')) {
      const parts = line.split(':');
      if (parts.length >= 3) {
        hazardCategory = parts[0]?.trim() || hazardCategory;
        environmentalAspect = parts[1]?.trim() || environmentalAspect;
        potentialCause = parts[2]?.trim() || potentialCause;
        break;
      }
    }
  }
  
  // Extract corrective actions from chunks
  const correctiveActionsMap = new Map<string, Array<string>>();
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Detect control type
    let controlType = 'Administrasi';
    if (lowerLine.includes('eliminasi')) controlType = 'Eliminasi';
    else if (lowerLine.includes('substitusi')) controlType = 'Substitusi';
    else if (lowerLine.includes('engineering') || lowerLine.includes('rekayasa')) controlType = 'Engineering';
    
    // Detect control level
    let controlLevel = 'Preventive';
    if (lowerLine.includes('detective') || lowerLine.includes('deteksi') || lowerLine.includes('observasi') || lowerLine.includes('inspeksi')) {
      controlLevel = 'Detective';
    } else if (lowerLine.includes('mitigative') || lowerLine.includes('mitigasi') || lowerLine.includes('mengurangi dampak')) {
      controlLevel = 'Mitigative';
    }
    
    const key = `${controlType}|${controlLevel}`;
    
    // Add action if it looks like an action (has verbs or is instructional)
    if (line.length > 20 && (
      lowerLine.includes('memastikan') ||
      lowerLine.includes('melakukan') ||
      lowerLine.includes('menggunakan') ||
      lowerLine.includes('menghentikan') ||
      lowerLine.includes('menyediakan') ||
      lowerLine.includes('memasang') ||
      lowerLine.includes('operator') ||
      lowerLine.includes('pengawas') ||
      lowerLine.includes('prosedur')
    )) {
      if (!correctiveActionsMap.has(key)) {
        correctiveActionsMap.set(key, []);
      }
      correctiveActionsMap.get(key)!.push(line.trim());
    }
  }
  
  // Convert map to array format
  const correctiveActions: Array<{
    controlType: string;
    controlLevel: string;
    actions: string[];
  }> = [];
  
  correctiveActionsMap.forEach((actions, key) => {
    const [controlType, controlLevel] = key.split('|');
    correctiveActions.push({
      controlType,
      controlLevel,
      actions: actions.slice(0, 5) // Limit to 5 actions per group
    });
  });
  
  // Fallback if no actions found
  if (correctiveActions.length === 0) {
    correctiveActions.push({
      controlType: 'Administrasi',
      controlLevel: 'Preventive',
      actions: [
        `Memastikan kepatuhan terhadap prosedur ${nonCompliance}`,
        `Melakukan pelatihan berkala untuk operator di ${location}`,
        `Pengawasan rutin oleh supervisor`
      ]
    });
  }
  
  const fullDescription = `${hazardCategory} / ${environmentalAspect} / ${potentialCause} menyebabkan risiko terkait ${hazardDescription}`;
  
  return {
    source: 'hira',
    confidence: 0.8, // Will be updated by calculateConfidence
    rootCauseAnalysis: {
      hazardCategory,
      environmentalAspect,
      potentialCause,
      fullDescription
    },
    correctiveActions
  };
}

// Calculate confidence based on HIRA chunk similarities
function calculateConfidence(chunks: any[]): number {
  if (!chunks || chunks.length === 0) return 0.6;
  
  const avgSimilarity = chunks.reduce((sum, c) => sum + (c.similarity || 0), 0) / chunks.length;
  
  if (avgSimilarity >= 0.7) return 0.9;
  if (avgSimilarity >= 0.5) return 0.75;
  return 0.6;
}
