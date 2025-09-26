-- Update HIRA knowledge base with new BMO 1 prompt template
UPDATE knowledge_bases 
SET 
  prompt_template = 'Berdasarkan knowledge base HIRA BMO 1 berikut:
{RETRIEVED_CONTEXT}

Analisis hazard dan risk ini: "{USER_INPUT}"

Berikan rekomendasi berdasarkan HIRA BMO 1:

AKAR MASALAH POTENSIAL:
[Identifikasi root cause berdasarkan pola hazard serupa dalam HIRA]

TINDAKAN PERBAIKAN YANG DIREKOMENDASIKAN:
[Saran corrective action berdasarkan control measures yang terbukti efektif]

PENCEGAHAN (PREVENTIVE CONTROLS):
[Langkah-langkah preventif dari knowledge base]

DETEKSI (DETECTIVE CONTROLS):
[Sistem monitoring dan inspeksi yang relevan]

MITIGASI (MITIGATIVE CONTROLS):
[Rencana tanggap darurat dan mitigasi]

TINGKAT RISIKO:
[Estimasi level risiko berdasarkan severity dan likelihood dari HIRA serupa]

Format jawaban:
AKAR MASALAH: [analisis root cause]
TINDAKAN PERBAIKAN: [recommended corrective actions]
PENCEGAHAN: [preventive measures]
DETEKSI: [monitoring systems]
MITIGASI: [emergency response]
TINGKAT RISIKO: [High/Medium/Low]
REFERENSI HIRA: [nomor atau kategori HIRA yang relevan]',
  description = 'BMO 1 Land Clearing Operations - Comprehensive Hazard Identification and Risk Assessment database with proven control measures and risk mitigation strategies',
  updated_at = now()
WHERE id = 'hira';

-- Clear existing HIRA chunks if any
DELETE FROM knowledge_base_chunks WHERE knowledge_base_id = 'hira';

-- Insert BMO 1 HIRA content as knowledge base chunks
INSERT INTO knowledge_base_chunks (knowledge_base_id, chunk_text, chunk_index) VALUES
('hira', 'HAZARD IDENTIFICATION AND RISK ASSESSMENT (HIRA) - BMO 1 OPERATIONS:

LAND CLEARING - DOZER/EXCAVATOR OPERATIONS:

FATIGUE AND CONCENTRATION HAZARDS:
- Kurang konsentrasi dalam melakukan pekerjaan (kelelahan/fatigue) menyebabkan unit menabrak sesuatu
- Unit menabrak sesuatu sehingga unit mengalami kerusakan hingga cedera pada operator
- Control Preventive: Memastikan operator unit fit untuk bekerja sesuai prosedur fatigue management melalui form fit to work
- Control Preventive: Pengawas melakukan komunikasi kontak positif dengan operator
- Control Detective: Pengawas melakukan observasi operator saat bekerja', 1),

('hira', 'SITUATIONAL AWARENESS HAZARDS:
- Operator tidak mengetahui kondisi sekitar (parit, batu besar, tanah tidak stabil, tepi sungai terjal)
- Unit menabrak sesuatu sehingga unit mengalami kerusakan hingga cedera pada operator
- Control Preventive: P5M di awal shift tentang kondisi area kerja
- Control Preventive: Memberikan Training Land Clearing kepada pekerja
- Control Preventive: Radio komunikasi dan unit dilengkapi wireless
- Control Detective: Pengawas melakukan inspeksi sesuai form Checklist Land Clearing', 2),

('hira', 'BEHAVIORAL HAZARDS:
- Operator terlalu percaya diri/ceroboh
- Unit menabrak sesuatu/terperosok hingga menyebabkan kerusakan pada unit dan/atau cidera pada orang hingga kematian
- Cidera (terjepit saat membuka/menutup pintu unit)
- Control Preventive: Pembuatan tanggul pengaman di sekeliling fasilitas tambang sesuai standar K3
- Control Preventive: Refresh training pasca cuti sesuai prosedur Ijin Kerja di Daerah Operasi
- Control Preventive: P5M kepada karyawan mengenai aspek K3L sosialisasi SOP, IK, STD sesuai jenis pekerjaan
- Control Mitigative: Pemasangan tanda peringatan bahaya/stiker peringatan titik jepit di semua unit', 3),

('hira', 'ENVIRONMENTAL CONTAMINATION HAZARDS:
- Ceceran solar/oli bekas menyebabkan pencemaran tanah
- Emisi gas buang unit menyebabkan penurunan kualitas udara
- Control Preventive: Memastikan unit yang digunakan sesuai dengan standar kendaraan dan unit
- Control Preventive: Memahami dan melakukan prosedur pengelolaan B3 dan limbah B3 jika ada ceceran
- Control Detective: Maintenance Unit rutin dan melakukan P2H Unit sesuai Checklist', 4),

('hira', 'GROUND CONDITIONS HAZARDS:
- Landasan kerja terdapat beda tinggi, lembek/rawa
- Amblas, unit terbalik/terperosok menyebabkan kerusakan atau cidera pada manusia
- Control Preventive: Pemetaan design area kerja lembek/rawa dari planning terhadap kontur rawa sesuai standar desain pit
- Control Preventive: Pembuatan teras pada area kerja dengan tebing yang tinggi
- Control Preventive: Memahami dan melakukan sosialisasi prosedur Land Clearing
- Control Detective: Pengawas melakukan inspeksi sesuai form Checklist Land Clearing
- Control Mitigative: Melaporkan ke Emergency jika ada keadaan darurat', 5),

('hira', 'FALLING OBJECT HAZARDS:
- Jatuhan dahan/ranting/potongan kayu
- Unit rusak/cedera pada pengawas hingga menyebabkan kematian
- Control Preventive: Memahami dan melakukan sosialisasi prosedur land clearing
- Control Preventive: Memastikan unit mengikuti standar kendaraan untuk area land clearing
- Control Preventive: Pengawas berada pada radius aman land clearing
- Control Mitigative: Melaporkan ke Emergency jika terjadi keadaan darurat', 6),

('hira', 'BIOLOGICAL HAZARDS:
- Serangan binatang/serangga (tawon, lebah, beruang, macan, ular)
- Tersengat, cidera, keracunan, kematian
- Control Preventive: Memahami dan melakukan sosialisasi prosedur land clearing
- Control Preventive: Memahami dan melakukan prosedur bekerja di area terpencil
- Control Detective: Pengawas melakukan inspeksi area land clearing di awal shift
- Control Mitigative: Membuat jalur evakuasi sesuai Prosedur Kesiapsiagaan dan Tanggap Darurat
- Control Mitigative: Menyediakan first aid box di area kerja
- Control Mitigative: Melapor Emergency saat terjadi keadaan darurat', 7),

('hira', 'GEOTECHNICAL HAZARDS:
- Erosi/longsor menyebabkan penurunan kualitas tanah
- Control Preventive: Memahami dan mensosialisasikan prosedur pengelolaan tanah
- Control Detective: Melakukan inspeksi area rawan erosi/longsor
- Control Mitigative: Melaporkan Emergency jika ada keadaan darurat', 8),

('hira', 'BOUNDARY VIOLATION HAZARDS:
- Land clearing melebihi batas yang sudah direncanakan
- Vegetasi hilang hingga ganti rugi vegetasi
- Control Preventive: Memastikan land clearing dilakukan di area rencana sesuai prosedur
- Control Preventive: Pemasangan patok/penandaan batas area land clearing', 9),

('hira', 'COMMUNITY SAFETY HAZARDS:
- Warga sekitar masuk area land clearing
- Manusia mengalami cedera hingga kematian
- Control Mitigative: Melaporkan Emergency saat ada warga masuk', 10);