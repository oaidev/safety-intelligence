import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AudioFile {
  data?: string; // base64 - undefined if processed locally
  name: string;
  transcript?: string;
  processedLocally?: boolean;
}

interface DocumentFile {
  name: string;
  content: string;
  format: string;
  processedLocally?: boolean;
}

interface ImageFile {
  fileName: string;
  base64: string;
}

interface VideoFile {
  fileName: string;
  base64: string;
}

interface MultiEvidenceRequest {
  audioFiles?: AudioFile[];
  imageFiles?: ImageFile[];
  documentFiles?: DocumentFile[];
  videoFiles?: VideoFile[];
  textContext?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json() as MultiEvidenceRequest;
    const { audioFiles, imageFiles, documentFiles, videoFiles, textContext } = requestData;
    
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('[InvestigationReport] Processing request:', {
      audioCount: audioFiles?.length || 0,
      imageCount: imageFiles?.length || 0,
      documentCount: documentFiles?.length || 0,
      videoCount: videoFiles?.length || 0,
    });

    let allTranscripts: string[] = [];
    
    // Process audio files that need server-side transcription
    if (audioFiles && audioFiles.length > 0) {
      for (const audio of audioFiles) {
        if (audio.processedLocally && audio.transcript) {
          // Use locally processed transcript
          allTranscripts.push(`[${audio.name}]: ${audio.transcript}`);
          console.log(`[InvestigationReport] Using local transcript for ${audio.name}`);
        } else if (audio.data) {
          // Need to transcribe server-side using Lovable AI
          console.log(`[InvestigationReport] Transcribing ${audio.name} via AI...`);
          
          const mimeType = audio.name.endsWith('.wav') ? 'audio/wav' 
                         : audio.name.endsWith('.m4a') ? 'audio/mp4'
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
                          data: audio.data,
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
            console.error(`[InvestigationReport] Transcription error for ${audio.name}:`, errorText);
            
            if (transcriptResponse.status === 429) {
              throw new Error('Rate limit exceeded. Please try again later.');
            }
            if (transcriptResponse.status === 402) {
              throw new Error('Payment required. Please add credits.');
            }
            continue;
          }

          const transcriptResult = await transcriptResponse.json();
          const transcript = transcriptResult.choices?.[0]?.message?.content || '';
          allTranscripts.push(`[${audio.name}]: ${transcript}`);
        }
      }
    }

    // Combine all text context
    let combinedContext = textContext || '';
    
    if (allTranscripts.length > 0 && !combinedContext.includes('TRANSKRIP INTERVIEW')) {
      combinedContext = `=== TRANSKRIP INTERVIEW ===\n${allTranscripts.join('\n\n')}\n\n${combinedContext}`;
    }

    // Add document content if not already in context
    if (documentFiles && documentFiles.length > 0) {
      const docsWithContent = documentFiles.filter(d => d.content && d.content.length > 0);
      if (docsWithContent.length > 0 && !combinedContext.includes('DOKUMEN PENDUKUNG')) {
        const docSection = docsWithContent.map(d => 
          `--- ${d.name} (${d.format.toUpperCase()}) ---\n${d.content}`
        ).join('\n\n');
        combinedContext += `\n\n=== DOKUMEN PENDUKUNG ===\n${docSection}`;
      }
    }

    if (!combinedContext || combinedContext.length < 50) {
      throw new Error('Tidak ada konten yang cukup untuk dianalisis (minimum 50 karakter)');
    }

    console.log('[InvestigationReport] Combined context length:', combinedContext.length);

    // Fetch prompt template from database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: promptData, error: promptError } = await supabase.functions.invoke('get-system-prompt', {
      body: { prompt_id: 'investigation-report' }
    });

    let promptTemplate = '';
    if (promptError || !promptData?.prompt_template) {
      console.error('Failed to fetch prompt template, using default');
      promptTemplate = `Anda adalah investigator keselamatan kerja senior. Berdasarkan bukti-bukti berikut, buat laporan investigasi yang komprehensif dalam Bahasa Indonesia.

BUKTI INVESTIGASI:
{CONTEXT}

Buat laporan investigasi dengan format:

# LAPORAN INVESTIGASI INSIDEN

## 1. RINGKASAN EKSEKUTIF
(Ringkasan singkat insiden)

## 2. KRONOLOGI KEJADIAN
(Timeline detail)

## 3. ANALISIS FAKTOR PENYEBAB
### 3.1 Faktor Langsung
### 3.2 Faktor Dasar
### 3.3 Root Cause

## 4. TEMUAN INVESTIGASI
(Daftar temuan utama)

## 5. REKOMENDASI
### 5.1 Tindakan Segera
### 5.2 Tindakan Jangka Panjang

## 6. KESIMPULAN`;
    } else {
      promptTemplate = promptData.prompt_template;
    }

    // Replace placeholder with actual context
    const promptText = promptTemplate.replace('{TRANSCRIPT}', combinedContext).replace('{CONTEXT}', combinedContext);

    // Build multimodal message content
    const messageContent: any[] = [
      {
        type: 'text',
        text: promptText
      }
    ];

    // Add images for visual analysis
    if (imageFiles && imageFiles.length > 0) {
      console.log(`[InvestigationReport] Including ${imageFiles.length} images`);
      
      for (const image of imageFiles) {
        const imageMimeType = image.fileName.endsWith('.png') ? 'image/png'
                            : image.fileName.endsWith('.webp') ? 'image/webp'
                            : 'image/jpeg';

        messageContent.push({
          type: 'image_url',
          image_url: {
            url: `data:${imageMimeType};base64,${image.base64}`
          }
        });
      }
    }

    // Note: Videos would require Gemini Video API - for now we note them in context
    if (videoFiles && videoFiles.length > 0) {
      console.log(`[InvestigationReport] ${videoFiles.length} videos provided - noted in context`);
      const videoNote = `\n\n[CATATAN: ${videoFiles.length} video bukti tersedia: ${videoFiles.map(v => v.fileName).join(', ')}]`;
      messageContent[0].text += videoNote;
    }

    // Call Lovable AI to generate report
    console.log('[InvestigationReport] Calling AI for report generation...');
    
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
      console.error('[InvestigationReport] AI error:', errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (response.status === 402) {
        throw new Error('Payment required. Please add credits.');
      }
      throw new Error(`AI generation error: ${response.status}`);
    }
    
    const result = await response.json();
    const reportText = result.choices?.[0]?.message?.content || '';
    
    if (!reportText) {
      throw new Error('AI tidak mengembalikan report');
    }
    
    console.log('[InvestigationReport] Report generated successfully, length:', reportText.length);

    // Build thinking process for transparency
    const thinkingProcess = {
      title: 'Investigation Report Generation',
      steps: [
        {
          title: 'Evidence Processing',
          status: 'completed' as const,
          details: `Processed ${audioFiles?.length || 0} audio, ${documentFiles?.length || 0} documents, ${imageFiles?.length || 0} images, ${videoFiles?.length || 0} videos`,
          timestamp: new Date().toISOString(),
        },
        {
          title: 'Context Aggregation',
          status: 'completed' as const,
          details: `Combined ${combinedContext.length} characters of context`,
          timestamp: new Date().toISOString(),
        },
        {
          title: 'AI Analysis',
          status: 'completed' as const,
          details: `Generated ${reportText.length} character report using multimodal AI`,
          timestamp: new Date().toISOString(),
        },
      ],
      summary: `Investigation report generated from ${(audioFiles?.length || 0) + (documentFiles?.length || 0) + (imageFiles?.length || 0) + (videoFiles?.length || 0)} evidence files`,
    };
    
    return new Response(
      JSON.stringify({ 
        report: reportText,
        generated_at: new Date().toISOString(),
        evidence_summary: {
          audio_count: audioFiles?.length || 0,
          document_count: documentFiles?.length || 0,
          image_count: imageFiles?.length || 0,
          video_count: videoFiles?.length || 0,
        },
        thinkingProcess,
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
