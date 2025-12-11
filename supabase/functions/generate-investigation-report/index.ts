import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AudioFile {
  data?: string;
  name: string;
  transcript?: string;
  processedLocally?: boolean;
}

interface DocumentFile {
  name: string;
  content: string;
  format: string;
  base64?: string; // For PDF/scanned documents
  processedLocally?: boolean;
}

interface ImageFile {
  fileName: string;
  base64: string;
}

interface VideoFile {
  fileName: string;
  base64: string;
  durationSeconds?: number;
}

interface MultiEvidenceRequest {
  audioFiles?: AudioFile[];
  imageFiles?: ImageFile[];
  documentFiles?: DocumentFile[];
  videoFiles?: VideoFile[];
  textContext?: string;
  stream?: boolean;
}

// SSE Helper
function createSSEStream() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array>;
  
  const stream = new ReadableStream({
    start(c) {
      controller = c;
    },
  });

  return {
    stream,
    send: (event: string, data: any) => {
      const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      controller.enqueue(encoder.encode(message));
    },
    close: () => {
      controller.close();
    },
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json() as MultiEvidenceRequest;
    const { audioFiles, imageFiles, documentFiles, videoFiles, textContext, stream: useSSE } = requestData;
    
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // SSE Streaming Mode
    if (useSSE) {
      const sse = createSSEStream();
      
      // Process in background
      (async () => {
        try {
          sse.send('progress', { step: 'start', message: 'Memulai pemrosesan bukti...' });
          
          const result = await processEvidence({
            audioFiles, imageFiles, documentFiles, videoFiles, textContext,
            lovableApiKey,
            onProgress: (step, message, details) => {
              sse.send('progress', { step, message, details });
            },
          });
          
          sse.send('complete', result);
        } catch (error) {
          sse.send('error', { message: error.message });
        } finally {
          sse.close();
        }
      })();

      return new Response(sse.stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Non-streaming mode (original behavior)
    const result = await processEvidence({
      audioFiles, imageFiles, documentFiles, videoFiles, textContext,
      lovableApiKey,
      onProgress: (step, message) => {
        console.log(`[InvestigationReport] ${step}: ${message}`);
      },
    });

    return new Response(
      JSON.stringify(result),
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

interface ProcessOptions {
  audioFiles?: AudioFile[];
  imageFiles?: ImageFile[];
  documentFiles?: DocumentFile[];
  videoFiles?: VideoFile[];
  textContext?: string;
  lovableApiKey: string;
  onProgress: (step: string, message: string, details?: any) => void;
}

async function processEvidence(options: ProcessOptions) {
  const { audioFiles, imageFiles, documentFiles, videoFiles, textContext, lovableApiKey, onProgress } = options;

  console.log('[InvestigationReport] Processing request:', {
    audioCount: audioFiles?.length || 0,
    imageCount: imageFiles?.length || 0,
    documentCount: documentFiles?.length || 0,
    videoCount: videoFiles?.length || 0,
  });

  let allTranscripts: string[] = [];
  let videoAnalyses: string[] = [];
  let pdfContents: string[] = [];
  
  // Process audio files
  if (audioFiles && audioFiles.length > 0) {
    onProgress('audio', `Memproses ${audioFiles.length} file audio...`);
    
    for (const audio of audioFiles) {
      if (audio.processedLocally && audio.transcript) {
        allTranscripts.push(`[${audio.name}]: ${audio.transcript}`);
        console.log(`[InvestigationReport] Using local transcript for ${audio.name}`);
      } else if (audio.data) {
        onProgress('audio', `Transkripsi ${audio.name}...`);
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
        onProgress('audio', `Selesai transkripsi ${audio.name}`, { transcript: transcript.substring(0, 100) + '...' });
      }
    }
  }

  // Process PDF documents with Gemini Vision OCR
  if (documentFiles && documentFiles.length > 0) {
    onProgress('documents', `Memproses ${documentFiles.length} dokumen...`);
    
    for (const doc of documentFiles) {
      if (doc.processedLocally && doc.content) {
        // Already has content from local processing
        continue;
      }
      
      // Process PDF with Gemini Vision
      if (doc.format === 'pdf' && doc.base64) {
        onProgress('documents', `OCR PDF: ${doc.name}...`);
        console.log(`[InvestigationReport] Processing PDF via Vision: ${doc.name}`);
        
        try {
          const pdfResponse = await fetch(
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
                        text: 'Ekstrak SEMUA teks dari dokumen PDF ini. Pertahankan struktur dan format asli. Jika ada tabel, format sebagai tabel markdown. Tulis hanya konten yang diekstrak tanpa komentar tambahan.'
                      },
                      {
                        type: 'image_url',
                        image_url: {
                          url: `data:application/pdf;base64,${doc.base64}`
                        }
                      }
                    ]
                  }
                ],
                max_tokens: 8000,
                temperature: 0.1
              })
            }
          );

          if (pdfResponse.ok) {
            const pdfResult = await pdfResponse.json();
            const extractedText = pdfResult.choices?.[0]?.message?.content || '';
            pdfContents.push(`--- ${doc.name} (PDF OCR) ---\n${extractedText}`);
            onProgress('documents', `Selesai OCR ${doc.name}`, { wordCount: extractedText.split(/\s+/).length });
          } else {
            console.error(`[InvestigationReport] PDF OCR failed for ${doc.name}`);
          }
        } catch (error) {
          console.error(`[InvestigationReport] PDF processing error:`, error);
        }
      }
    }
  }

  // Process videos with Gemini Video Analysis
  if (videoFiles && videoFiles.length > 0) {
    onProgress('videos', `Menganalisis ${videoFiles.length} video...`);
    
    for (const video of videoFiles) {
      onProgress('videos', `Analisis video: ${video.fileName}...`);
      console.log(`[InvestigationReport] Processing video: ${video.fileName}`);
      
      // Determine MIME type
      const videoMimeType = video.fileName.endsWith('.mp4') ? 'video/mp4'
                          : video.fileName.endsWith('.webm') ? 'video/webm'
                          : video.fileName.endsWith('.mov') ? 'video/quicktime'
                          : video.fileName.endsWith('.avi') ? 'video/x-msvideo'
                          : 'video/mp4';

      try {
        // Use Gemini's video understanding capability
        const videoResponse = await fetch(
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
                      text: `Analisis video bukti investigasi ini dengan detail. Jelaskan dalam Bahasa Indonesia:

1. DESKRIPSI VISUAL: Apa yang terlihat di video? Lokasi, kondisi, objek, aktivitas.
2. KRONOLOGI KEJADIAN: Urutan peristiwa yang terjadi dalam video.
3. TEMUAN KUNCI: Observasi penting terkait keselamatan kerja atau insiden.
4. AUDIO/SUARA: Jika ada audio, transkrip atau deskripsi suara yang terdengar.
5. BUKTI RELEVAN: Bukti visual yang dapat digunakan untuk investigasi.

Berikan analisis menyeluruh dan profesional.`
                    },
                    {
                      type: 'video_url',
                      video_url: {
                        url: `data:${videoMimeType};base64,${video.base64}`
                      }
                    }
                  ]
                }
              ],
              max_tokens: 4000,
              temperature: 0.2
            })
          }
        );

        if (videoResponse.ok) {
          const videoResult = await videoResponse.json();
          const analysis = videoResult.choices?.[0]?.message?.content || '';
          videoAnalyses.push(`=== ANALISIS VIDEO: ${video.fileName} ===\n${analysis}`);
          onProgress('videos', `Selesai analisis ${video.fileName}`, { analysisLength: analysis.length });
        } else {
          const errorText = await videoResponse.text();
          console.error(`[InvestigationReport] Video analysis failed for ${video.fileName}:`, errorText);
          
          // Fallback: just note the video exists
          videoAnalyses.push(`=== VIDEO: ${video.fileName} ===\n[Video tersedia untuk review manual]`);
        }
      } catch (error) {
        console.error(`[InvestigationReport] Video processing error:`, error);
        videoAnalyses.push(`=== VIDEO: ${video.fileName} ===\n[Error saat memproses video]`);
      }
    }
  }

  // Combine all context
  let combinedContext = textContext || '';
  
  if (allTranscripts.length > 0 && !combinedContext.includes('TRANSKRIP INTERVIEW')) {
    combinedContext = `=== TRANSKRIP INTERVIEW ===\n${allTranscripts.join('\n\n')}\n\n${combinedContext}`;
  }

  // Add PDF OCR content
  if (pdfContents.length > 0) {
    combinedContext += `\n\n=== DOKUMEN PDF (OCR) ===\n${pdfContents.join('\n\n')}`;
  }

  // Add document content
  if (documentFiles && documentFiles.length > 0) {
    const docsWithContent = documentFiles.filter(d => d.content && d.content.length > 0);
    if (docsWithContent.length > 0 && !combinedContext.includes('DOKUMEN PENDUKUNG')) {
      const docSection = docsWithContent.map(d => 
        `--- ${d.name} (${d.format.toUpperCase()}) ---\n${d.content}`
      ).join('\n\n');
      combinedContext += `\n\n=== DOKUMEN PENDUKUNG ===\n${docSection}`;
    }
  }

  // Add video analyses
  if (videoAnalyses.length > 0) {
    combinedContext += `\n\n=== ANALISIS VIDEO BUKTI ===\n${videoAnalyses.join('\n\n')}`;
  }

  if (!combinedContext || combinedContext.length < 50) {
    throw new Error('Tidak ada konten yang cukup untuk dianalisis (minimum 50 karakter)');
  }

  console.log('[InvestigationReport] Combined context length:', combinedContext.length);
  onProgress('analysis', 'Menyiapkan context untuk AI...', { contextLength: combinedContext.length });

  // Fetch prompt template
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
(Timeline detail berdasarkan interview dan video)

## 3. ANALISIS FAKTOR PENYEBAB
### 3.1 Faktor Langsung
### 3.2 Faktor Dasar
### 3.3 Root Cause

## 4. TEMUAN INVESTIGASI
(Daftar temuan dari semua sumber bukti)

## 5. ANALISIS BUKTI VISUAL
(Korelasi foto dan video dengan temuan)

## 6. REKOMENDASI
### 6.1 Tindakan Segera
### 6.2 Tindakan Jangka Panjang

## 7. KESIMPULAN`;
  } else {
    promptTemplate = promptData.prompt_template;
  }

  const promptText = promptTemplate.replace('{TRANSCRIPT}', combinedContext).replace('{CONTEXT}', combinedContext);

  // Build multimodal message
  const messageContent: any[] = [
    { type: 'text', text: promptText }
  ];

  // Add images
  if (imageFiles && imageFiles.length > 0) {
    onProgress('analysis', `Menyertakan ${imageFiles.length} gambar untuk analisis visual...`);
    
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

  // Generate report
  onProgress('analysis', 'AI menganalisis dan menyusun laporan investigasi...');
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
        messages: [{ role: 'user', content: messageContent }],
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
  onProgress('complete', 'Laporan investigasi berhasil dibuat!');

  // Build thinking process - simplified format matching ThinkingProcessViewer interface
  const totalFiles = (audioFiles?.length || 0) + (documentFiles?.length || 0) + (imageFiles?.length || 0) + (videoFiles?.length || 0);
  
  const thinkingProcess = {
    steps: [
      {
        step: 1,
        name: 'Proses Audio',
        description: `${audioFiles?.length || 0} file audio diproses (${allTranscripts.length} transkripsi)`,
        timestamp: Date.now(),
        duration: 0,
        details: { message: audioFiles?.length ? `${allTranscripts.length} transkripsi berhasil` : 'Tidak ada file audio' },
        status: (audioFiles?.length || 0) > 0 ? 'success' : 'warning' as const,
      },
      {
        step: 2,
        name: 'Proses Dokumen',
        description: `${documentFiles?.length || 0} dokumen, ${pdfContents.length} PDF via OCR`,
        timestamp: Date.now(),
        duration: 0,
        details: { message: documentFiles?.length ? `${documentFiles.length} dokumen berhasil diproses` : 'Tidak ada dokumen' },
        status: (documentFiles?.length || 0) > 0 ? 'success' : 'warning' as const,
      },
      {
        step: 3,
        name: 'Analisis Video',
        description: `${videoFiles?.length || 0} video dianalisis via AI`,
        timestamp: Date.now(),
        duration: 0,
        details: { message: videoFiles?.length ? `${videoAnalyses.length} video berhasil dianalisis` : 'Tidak ada video' },
        status: (videoFiles?.length || 0) > 0 ? 'success' : 'warning' as const,
      },
      {
        step: 4,
        name: 'Analisis Gambar',
        description: `${imageFiles?.length || 0} gambar disertakan`,
        timestamp: Date.now(),
        duration: 0,
        details: { message: imageFiles?.length ? `${imageFiles.length} gambar untuk analisis visual` : 'Tidak ada gambar' },
        status: (imageFiles?.length || 0) > 0 ? 'success' : 'warning' as const,
      },
      {
        step: 5,
        name: 'Laporan Dibuat',
        description: `Laporan investigasi ${reportText.length.toLocaleString()} karakter`,
        timestamp: Date.now(),
        duration: 0,
        details: { message: 'Laporan investigasi berhasil dibuat' },
        status: 'success' as const,
      },
    ],
    totalDuration: 0,
    summary: `Laporan investigasi dari ${totalFiles} file bukti berhasil dibuat`,
    metadata: { category: 'investigation' },
  };
  
  return { 
    report: reportText,
    generated_at: new Date().toISOString(),
    evidence_summary: {
      audio_count: audioFiles?.length || 0,
      document_count: documentFiles?.length || 0,
      image_count: imageFiles?.length || 0,
      video_count: videoFiles?.length || 0,
      video_analyzed: videoAnalyses.length,
      pdf_ocr_count: pdfContents.length,
    },
    thinkingProcess,
  };
}
