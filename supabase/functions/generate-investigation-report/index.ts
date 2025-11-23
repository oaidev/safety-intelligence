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
    
    // Comprehensive investigation report prompt
    const promptText = `Anda adalah AI investigator keselamatan kerja mining & marine operations. Tugas Anda adalah membuat laporan investigasi kecelakaan lengkap berdasarkan transcript audio wawancara investigasi yang diberikan.

=== TEMPLATE LAPORAN WAJIB ===

LAPORAN INVESTIGASI INSIDEN

Notifikasi Insiden Kapal
Nama Kapal : [ekstrak dari transcript]
Nama Nahkoda : [ekstrak dari transcript]
Tanggal : [format: DD MMMM YYYY]
Jam Kejadian : [format: HH.MM WITA]
Jam Pelaporan CCR : [format: HH.MM WITA]
Lokasi : [ekstrak lokasi spesifik]
Korban : [Nama (Jabatan)]

A. Kronologi Kejadian

Pra Kontak
[Jelaskan kondisi dan aktivitas sebelum kejadian]
[Kondisi lingkungan, cuaca, pencahayaan]
[Persiapan kerja yang dilakukan]

Kontak
[Jelaskan moment tepat terjadinya kecelakaan]
[Urutan kejadian dengan detail]
[Posisi korban dan equipment]

Pasca Kontak
[Tindakan pertolongan yang dilakukan]
[Pelaporan ke CCR dan timeline]
[Evakuasi atau penanganan lanjutan]

B. Data Personel
[INSTRUKSI: Identifikasi semua personel dari transcript dan kategorikan berdasarkan peran aktual]

Korban/Pekerja yang Terlibat:
[Nama lengkap (Jabatan) - Status: Korban langsung/tidak langsung]

Supervisor/Pengawas:
[Jika disebutkan dalam transcript]

Saksi/Pekerja Lain:
[Yang menyaksikan kejadian]

Tim Emergency/Medis:
[Yang menangani korban]

C. Data & Fakta
[List fakta objektif kejadian dengan timeline]

D. Analisa PEEPO

People (Faktor Manusia):
- Posisi korban: [dari transcript]
- Tindakan yang dilakukan: [aktivitas saat kejadian]
- Komunikasi: [efektif/tidak efektif]
- Kondisi fisik/mental: [jika disebutkan]

Environment (Faktor Lingkungan):
- Kondisi cuaca: [dari transcript]
- Pencahayaan: [siang/malam/terbatas]
- Kondisi area kerja: [sempit/luas/kondisi]
- Visibilitas: [jarak pandang]

Equipment (Faktor Peralatan):
- Kendaraan/unit utama: [yang terlibat]
- Tools/equipment: [yang digunakan]
- Safety equipment: [APD, safety device]
- Maintenance status: [jika disebutkan]

Process (Faktor Proses Kerja):
- Prosedur kerja: [sesuai SOP atau tidak]
- Urutan pekerjaan: [normal/ada penyimpangan]
- Koordinasi tim: [komunikasi antar pekerja]
- Pengawasan: [ada/tidak pengawas]

Organization (Faktor Organisasi):
- SOP/prosedur: [tersedia/dijalankan atau tidak]
- Training: [status training korban]
- Safety culture: [budaya keselamatan]
- Management commitment: [dukungan K3]

E. Analisa Penyebab (5-Layer Analysis)
[Berdasarkan transcript, analisis setiap layer dan identifikasi gap]

Layer I - Organization:
□ HIRA: [Ada/tidak, memadai/tidak]
□ SOP: [Tersedia/tidak, diikuti/tidak]
□ Training: [Korban sudah training/tidak]
□ Golden Rules: [Ada pelanggaran/tidak]

Layer II - Plan Readiness:
□ JSA: [Ada/tidak untuk aktivitas ini]
□ Maintenance: [Equipment laik operasi/tidak]
□ Emergency Preparedness: [Tim ERG siap/tidak]

Layer III - Work Readiness:
□ Safety Briefing: [Dilakukan/tidak]
□ P2H: [Equipment dicheck/tidak]
□ Pengawasan: [Ada pengawas/tidak]
□ Fit to Work: [Pekerja dalam kondisi fit/tidak]

Layer IV - Preventive Defense:
□ APD: [Digunakan/tidak, sesuai standar/tidak]
□ Safety Devices: [Ada/tidak, berfungsi/tidak]
□ Physical Barriers: [Ada pelindung/tidak]

Layer V - Contact Defense:
□ Warning Systems: [Alarm aktif/tidak]
□ Emergency Response: [Respons saat kejadian]
□ Monitoring: [CCTV, komunikasi tersedia/tidak]

Root Cause Analysis:
- Human Factors: [Faktor manusia yang berkontribusi]
- Equipment Factors: [Kondisi equipment]
- Environmental Factors: [Faktor lingkungan]
- Procedural Gaps: [Gap dalam prosedur]

F. Temuan Investigasi

RC (Root Cause) - Akar Penyebab Utama:
RC-1: [Akar penyebab sistem/manajemen]
RC-2: [Akar penyebab prosedur/metode]
RC-3: [Akar penyebab equipment/fisik]

NC (Non Conformity) - Ketidaksesuaian:
NC-1: [Pelanggaran SOP/Prosedur]
NC-2: [Pelanggaran Golden Rules]
NC-3: [Pelanggaran Regulasi/Standard]

IM (Improvement) - Perbaikan:
IM-1: [Immediate action - PIC: [Posisi] - Target: [Waktu]]
IM-2: [Short term improvement]
IM-3: [Long term strategic improvement]

G. Rekomendasi

1. Engineering Controls:
- [Modifikasi fisik/desain] - PIC: [Engineering Manager] - Timeline: [2-3 bulan]
- [Safety device installation] - PIC: [Technical Manager] - Timeline: [1-2 bulan]

2. Administrative Controls:
- [Revisi SOP/prosedur] - PIC: [HSE Manager] - Timeline: [1 bulan]
- [Policy enhancement] - PIC: [Site Manager] - Timeline: [2 weeks]

3. Training & Competency:
- [Specific training] - PIC: [Training Coordinator] - Timeline: [Monthly ongoing]
- [Competency certification] - PIC: [HR Manager] - Timeline: [6 bulan]

4. Monitoring & Supervision:
- [Enhanced supervision] - PIC: [Operations Supervisor] - Timeline: [Immediate]
- [Performance monitoring] - PIC: [HSE Manager] - Timeline: [2 bulan]

H. Respon Cepat

Immediate Response (0-5 menit):
- [First aid yang diberikan berdasarkan transcript]
- [Immediate safety control yang dilakukan]

Communication & Reporting:
- [Timeline pelaporan internal dan ke CCR]
- [Metode komunikasi yang digunakan]

Medical Emergency Response:
- [Pertolongan medis yang diberikan]
- [Proses evakuasi korban]

Operational Continuity:
- [Status operasi setelah kejadian]
- [Tindakan untuk melanjutkan operasi dengan aman]

=== INSTRUKSI KHUSUS ===
1. Transkripsi dan ekstrak informasi kunci dari transcript
2. Jika informasi tidak lengkap, tulis "[PERLU INVESTIGASI LANJUTAN]"
3. Gunakan bahasa Indonesia profesional dan formal
4. Fokus pada fakta objektif, hindari spekulasi
5. Berikan rekomendasi yang spesifik dan actionable
6. Setiap rekomendasi harus memiliki PIC dan timeline yang jelas

TRANSCRIPT AUDIO UNTUK DIANALISIS:
${finalTranscript}`;

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
