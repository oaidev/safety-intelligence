-- Create system_prompts table for centralized prompt management
CREATE TABLE IF NOT EXISTS public.system_prompts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  default_template TEXT NOT NULL,
  placeholders JSONB NOT NULL DEFAULT '[]'::jsonb,
  validation_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_prompts ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "System prompts are publicly readable"
  ON public.system_prompts FOR SELECT
  USING (true);

CREATE POLICY "System prompts are publicly updatable"
  ON public.system_prompts FOR UPDATE
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_system_prompts_updated_at
  BEFORE UPDATE ON public.system_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default prompts for the 4 AI features
INSERT INTO public.system_prompts (id, name, category, prompt_template, default_template, placeholders, validation_rules, description) VALUES

-- 1. AI Quality Scoring
('hazard-quality-scoring', 'AI Quality Scoring', 'Quality Analysis', 
'Analisis kualitas laporan hazard berikut menggunakan 3 aspek scoring:

FORM DATA:
Deskripsi Temuan: "{DESKRIPSI_TEMUAN}"
Ketidaksesuaian: "{KETIDAKSESUAIAN}"
Sub Ketidaksesuaian: "{SUB_KETIDAKSESUAIAN}"
Tools Pengamatan: "{TOOLS_PENGAMATAN}"
Lokasi: "{LOKASI_DETAIL}"
Keterangan Lokasi: "{LOCATION_DESCRIPTION}"
Quick Action: "{QUICK_ACTION}"

Berikan scoring 1-100 untuk setiap aspek berikut:

1. CONSISTENCY SCORE (Konsistensi Antar Field) - 35% weight
Apakah Deskripsi Temuan sesuai dengan Ketidaksesuaian yang dipilih?
Apakah Sub Ketidaksesuaian relevan dengan Ketidaksesuaian utama?
Apakah Quick Action sesuai dengan severity temuan?

2. COMPLETENESS SCORE (Kelengkapan Deskripsi) - 40% weight
Evaluasi kelengkapan berdasarkan 5W1H termasuk keterangan lokasi:
WHO: Siapa yang terlibat? (pekerja, operator, pengawas)
WHAT: Apa yang terjadi? (aktivitas, pelanggaran spesifik)
WHERE: Dimana kejadian? (lokasi spesifik, area kerja, keterangan lokasi detail)
WHEN: Kapan terjadi? (waktu, shift, kondisi)
WHY: Mengapa terjadi? (root cause, kondisi pemicu)
HOW: Bagaimana terjadi? (sequence of events, mekanisme)

3. IMAGE RELEVANCE SCORE (Kesesuaian Gambar) - 25% weight
JIKA TIDAK ADA IMAGE: return score 0
JIKA ADA IMAGE:
- Apakah image menunjukkan hazard yang dideskripsikan?
- Apakah image mendukung claims dalam Deskripsi Temuan?
- Kualitas image (clarity, angle, detail visibility)
- Apakah image menunjukkan konteks lokasi yang sesuai?

WAJIB: Berikan response dalam format JSON yang valid berikut:
{
  "scores": {
    "consistency": 85,
    "completeness": 70,
    "image_relevance": 0,
    "overall": 62
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
      "strong_points": ["Lokasi spesifik jelas", "Keterangan lokasi detail"]
    },
    "image_relevance": {
      "score": 0,
      "findings": [],
      "issues": ["Tidak ada gambar yang disertakan"]
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
}',
'Analisis kualitas laporan hazard berikut menggunakan 3 aspek scoring:

FORM DATA:
Deskripsi Temuan: "{DESKRIPSI_TEMUAN}"
Ketidaksesuaian: "{KETIDAKSESUAIAN}"
Sub Ketidaksesuaian: "{SUB_KETIDAKSESUAIAN}"
Tools Pengamatan: "{TOOLS_PENGAMATAN}"
Lokasi: "{LOKASI_DETAIL}"
Keterangan Lokasi: "{LOCATION_DESCRIPTION}"
Quick Action: "{QUICK_ACTION}"

Berikan scoring 1-100 untuk setiap aspek berikut:

1. CONSISTENCY SCORE (Konsistensi Antar Field) - 35% weight
Apakah Deskripsi Temuan sesuai dengan Ketidaksesuaian yang dipilih?
Apakah Sub Ketidaksesuaian relevan dengan Ketidaksesuaian utama?
Apakah Quick Action sesuai dengan severity temuan?

2. COMPLETENESS SCORE (Kelengkapan Deskripsi) - 40% weight
Evaluasi kelengkapan berdasarkan 5W1H termasuk keterangan lokasi:
WHO: Siapa yang terlibat? (pekerja, operator, pengawas)
WHAT: Apa yang terjadi? (aktivitas, pelanggaran spesifik)
WHERE: Dimana kejadian? (lokasi spesifik, area kerja, keterangan lokasi detail)
WHEN: Kapan terjadi? (waktu, shift, kondisi)
WHY: Mengapa terjadi? (root cause, kondisi pemicu)
HOW: Bagaimana terjadi? (sequence of events, mekanisme)

3. IMAGE RELEVANCE SCORE (Kesesuaian Gambar) - 25% weight
JIKA TIDAK ADA IMAGE: return score 0
JIKA ADA IMAGE:
- Apakah image menunjukkan hazard yang dideskripsikan?
- Apakah image mendukung claims dalam Deskripsi Temuan?
- Kualitas image (clarity, angle, detail visibility)
- Apakah image menunjukkan konteks lokasi yang sesuai?

WAJIB: Berikan response dalam format JSON yang valid berikut:
{
  "scores": {
    "consistency": 85,
    "completeness": 70,
    "image_relevance": 0,
    "overall": 62
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
      "strong_points": ["Lokasi spesifik jelas", "Keterangan lokasi detail"]
    },
    "image_relevance": {
      "score": 0,
      "findings": [],
      "issues": ["Tidak ada gambar yang disertakan"]
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
}',
'["{DESKRIPSI_TEMUAN}", "{KETIDAKSESUAIAN}", "{SUB_KETIDAKSESUAIAN}", "{TOOLS_PENGAMATAN}", "{LOKASI_DETAIL}", "{LOCATION_DESCRIPTION}", "{QUICK_ACTION}"]'::jsonb,
'{"required_placeholders": ["{DESKRIPSI_TEMUAN}", "{KETIDAKSESUAIAN}", "{SUB_KETIDAKSESUAIAN}"], "min_length": 500}'::jsonb,
'Prompt untuk analisis kualitas hazard report dengan scoring Consistency, Completeness, dan Image Relevance'),

-- 2. Hazard Recommendations Generator
('hazard-recommendations', 'Hazard Recommendations', 'Safety Analysis',
'Anda adalah ahli K3 (Keselamatan dan Kesehatan Kerja) yang berpengalaman dalam menganalisis hazard dan memberikan rekomendasi. Berdasarkan informasi berikut, berikan analisis mendalam dan rekomendasi yang komprehensif:

INFORMASI TEMUAN:
- Deskripsi Temuan: {DESKRIPSI_TEMUAN}
- Lokasi: {LOKASI}
- Ketidaksesuaian: {KETIDAKSESUAIAN}
- Sub Ketidaksesuaian: {SUB_KETIDAKSESUAIAN}
- Quick Action: {QUICK_ACTION}

Berikan respons dalam format JSON yang valid dengan struktur berikut:

{
  "root_cause_analysis": "Analisis akar masalah yang mendalam, mencakup faktor manusia, peralatan, lingkungan, dan sistem manajemen yang berkontribusi terhadap temuan ini",
  "corrective_actions": "Tindakan perbaikan segera yang spesifik dan dapat diimplementasikan untuk mengatasi temuan ini",
  "preventive_measures": "Langkah-langkah pencegahan jangka panjang untuk mencegah terulangnya temuan serupa",
  "risk_level": "HIGH/MEDIUM/LOW berdasarkan tingkat bahaya dan konsekuensi potensial",
  "kategori_temuan": "Kondisi Tidak Aman atau Tindakan Tidak Aman",
  "jenis_tindakan": "PERBAIKAN/PELATIHAN/INVESTIGASI/MONITORING",
  "alur_permasalahan": "Penjelasan alur bagaimana masalah ini dapat berkembang menjadi insiden",
  "tindakan": "Tindakan spesifik yang harus dilakukan dengan prioritas dan timeline yang jelas",
  "due_date_suggestion": "Jumlah hari untuk penyelesaian (1-30 hari berdasarkan tingkat risiko)"
}

PENTING: 
- Berikan respons HANYA dalam format JSON yang valid
- Gunakan bahasa Indonesia yang profesional
- Sesuaikan rekomendasi dengan konteks industri dan lokasi kerja
- Pertimbangkan regulasi K3 Indonesia dan standar internasional',
'Anda adalah ahli K3 (Keselamatan dan Kesehatan Kerja) yang berpengalaman dalam menganalisis hazard dan memberikan rekomendasi. Berdasarkan informasi berikut, berikan analisis mendalam dan rekomendasi yang komprehensif:

INFORMASI TEMUAN:
- Deskripsi Temuan: {DESKRIPSI_TEMUAN}
- Lokasi: {LOKASI}
- Ketidaksesuaian: {KETIDAKSESUAIAN}
- Sub Ketidaksesuaian: {SUB_KETIDAKSESUAIAN}
- Quick Action: {QUICK_ACTION}

Berikan respons dalam format JSON yang valid dengan struktur berikut:

{
  "root_cause_analysis": "Analisis akar masalah yang mendalam, mencakup faktor manusia, peralatan, lingkungan, dan sistem manajemen yang berkontribusi terhadap temuan ini",
  "corrective_actions": "Tindakan perbaikan segera yang spesifik dan dapat diimplementasikan untuk mengatasi temuan ini",
  "preventive_measures": "Langkah-langkah pencegahan jangka panjang untuk mencegah terulangnya temuan serupa",
  "risk_level": "HIGH/MEDIUM/LOW berdasarkan tingkat bahaya dan konsekuensi potensial",
  "kategori_temuan": "Kondisi Tidak Aman atau Tindakan Tidak Aman",
  "jenis_tindakan": "PERBAIKAN/PELATIHAN/INVESTIGASI/MONITORING",
  "alur_permasalahan": "Penjelasan alur bagaimana masalah ini dapat berkembang menjadi insiden",
  "tindakan": "Tindakan spesifik yang harus dilakukan dengan prioritas dan timeline yang jelas",
  "due_date_suggestion": "Jumlah hari untuk penyelesaian (1-30 hari berdasarkan tingkat risiko)"
}

PENTING: 
- Berikan respons HANYA dalam format JSON yang valid
- Gunakan bahasa Indonesia yang profesional
- Sesuaikan rekomendasi dengan konteks industri dan lokasi kerja
- Pertimbangkan regulasi K3 Indonesia dan standar internasional',
'["{DESKRIPSI_TEMUAN}", "{LOKASI}", "{KETIDAKSESUAIAN}", "{SUB_KETIDAKSESUAIAN}", "{QUICK_ACTION}"]'::jsonb,
'{"required_placeholders": ["{DESKRIPSI_TEMUAN}", "{LOKASI}", "{KETIDAKSESUAIAN}"], "min_length": 400}'::jsonb,
'Prompt untuk generate rekomendasi K3 dengan root cause analysis dan corrective actions'),

-- 3. Comprehensive HIRA Recommendations  
('comprehensive-hira', 'Comprehensive HIRA', 'HIRA Analysis',
'Anda adalah ahli HIRA (Hazard Identification and Risk Assessment) yang berpengalaman. Berikan analisis HIRA dalam format yang sederhana dan terstruktur.

INFORMASI HAZARD:
- Deskripsi: {HAZARD_DESCRIPTION}
- Lokasi: {LOCATION}
- Ketidaksesuaian: {NON_COMPLIANCE}

KONTEKS HIRA KNOWLEDGE BASE:
{HIRA_CONTEXT}

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
6. fullDescription harus menjelaskan akar permasalahan secara lengkap dengan format "[Bahaya] / [Aspek Lingkungan] / [Penyebab Potensial] menyebabkan [dampak]"',
'Anda adalah ahli HIRA (Hazard Identification and Risk Assessment) yang berpengalaman. Berikan analisis HIRA dalam format yang sederhana dan terstruktur.

INFORMASI HAZARD:
- Deskripsi: {HAZARD_DESCRIPTION}
- Lokasi: {LOCATION}
- Ketidaksesuaian: {NON_COMPLIANCE}

KONTEKS HIRA KNOWLEDGE BASE:
{HIRA_CONTEXT}

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
6. fullDescription harus menjelaskan akar permasalahan secara lengkap dengan format "[Bahaya] / [Aspek Lingkungan] / [Penyebab Potensial] menyebabkan [dampak]"',
'["{HAZARD_DESCRIPTION}", "{LOCATION}", "{NON_COMPLIANCE}", "{HIRA_CONTEXT}"]'::jsonb,
'{"required_placeholders": ["{HAZARD_DESCRIPTION}", "{HIRA_CONTEXT}"], "min_length": 600}'::jsonb,
'Prompt untuk HIRA analysis dengan control types dan levels untuk industri mining/marine'),

-- 4. Investigation Report Generator
('investigation-report', 'Investigation Report', 'Investigation',
'Anda adalah AI investigator keselamatan kerja mining & marine operations. Tugas Anda adalah membuat laporan investigasi kecelakaan lengkap berdasarkan transcript audio wawancara investigasi yang diberikan.

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
{TRANSCRIPT}',
'Anda adalah AI investigator keselamatan kerja mining & marine operations. Tugas Anda adalah membuat laporan investigasi kecelakaan lengkap berdasarkan transcript audio wawancara investigasi yang diberikan.

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
{TRANSCRIPT}',
'["{TRANSCRIPT}"]'::jsonb,
'{"required_placeholders": ["{TRANSCRIPT}"], "min_length": 2000}'::jsonb,
'Prompt untuk generate investigation report lengkap dari transcript audio dengan PEEPO analysis dan 5-Layer Analysis');