import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    // Build the analysis prompt
    const analysisPrompt = `
Analisis kualitas laporan hazard berikut menggunakan 4 aspek scoring:

FORM DATA:
Deskripsi Temuan: "${formData.deskripsi_temuan}"
Ketidaksesuaian: "${formData.ketidaksesuaian}"
Sub Ketidaksesuaian: "${formData.sub_ketidaksesuaian}"
Tools Pengamatan: "${formData.tools_pengamatan}"
Lokasi: "${formData.lokasi_detail}"
Quick Action: "${formData.quick_action}"

Berikan scoring 1-100 untuk setiap aspek berikut:

1. CONSISTENCY SCORE (Konsistensi Antar Field)
Apakah Deskripsi Temuan sesuai dengan Ketidaksesuaian yang dipilih?
Apakah Sub Ketidaksesuaian relevan dengan Ketidaksesuaian utama?
Apakah Quick Action sesuai dengan severity temuan?

2. COMPLETENESS SCORE (Kelengkapan Deskripsi)
Evaluasi kelengkapan berdasarkan 5W1H:
WHO: Siapa yang terlibat? (pekerja, operator, pengawas)
WHAT: Apa yang terjadi? (aktivitas, pelanggaran spesifik)
WHERE: Dimana kejadian? (lokasi spesifik, area kerja)
WHEN: Kapan terjadi? (waktu, shift, kondisi)
WHY: Mengapa terjadi? (root cause, kondisi pemicu)
HOW: Bagaimana terjadi? (sequence of events, mekanisme)

3. IMAGE RELEVANCE SCORE (Kesesuaian Gambar)
Apakah image menunjukkan hazard yang dideskripsikan?
Apakah image mendukung claims dalam Deskripsi Temuan?
Kualitas image (clarity, angle, detail visibility)
Apakah image menunjukkan konteks lokasi yang sesuai?

4. ACTIONABILITY SCORE (Dapat Ditindaklanjuti)
Apakah deskripsi cukup spesifik untuk investigasi?
Apakah ada informasi yang memungkinkan corrective action?
Apakah Quick Action sesuai dengan tingkat risiko?
Apakah informasi cukup untuk prevention measures?

WAJIB: Berikan response dalam format JSON yang valid berikut:
{
  "scores": {
    "consistency": 85,
    "completeness": 70,
    "image_relevance": 90,
    "actionability": 75,
    "overall": 80
  },
  "detailed_analysis": {
    "consistency": {
      "score": 85,
      "findings": ["Deskripsi temuan sesuai dengan ketidaksesuaian APD"],
      "issues": ["Quick action mungkin kurang tegas untuk pelanggaran ini"]
    },
    "completeness": {
      "score": 70,
      "missing_elements": ["Waktu kejadian tidak disebutkan"],
      "strong_points": ["Lokasi spesifik jelas"]
    },
    "image_relevance": {
      "score": 90,
      "findings": ["Image clearly shows the hazard"],
      "issues": ["Image angle could be better"]
    },
    "actionability": {
      "score": 75,
      "strengths": ["Specific violation identified"],
      "improvements": ["Need more context about work conditions"]
    }
  },
  "recommendations": [
    "HIGH PRIORITY: Tambahkan informasi waktu kejadian",
    "MEDIUM: Sertakan informasi pengawas"
  ],
  "suggested_improvements": {
    "deskripsi_temuan": "Tambahkan informasi waktu dan konteks",
    "quick_action": "Pertimbangkan tindakan yang lebih tegas"
  }
}`;

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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`,
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