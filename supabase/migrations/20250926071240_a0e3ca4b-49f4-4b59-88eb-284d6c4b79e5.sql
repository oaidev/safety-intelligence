-- Update existing knowledge bases with new content
UPDATE knowledge_bases SET 
  prompt_template = 'Analyze the following hazard report against the Golden Rules safety standards of PT Berau Coal. These rules are designed to prevent serious injuries and fatalities in mining operations.

**CONTEXT:**
{RETRIEVED_CONTEXT}

**HAZARD TO ANALYZE:**
{USER_INPUT}

**ANALYSIS INSTRUCTIONS:**
1. Identify which Golden Rule category this hazard falls under
2. Determine the specific violation or potential violation
3. Assess the severity based on the sanctions mentioned (Warning, Termination, etc.)
4. Provide clear reasoning for your assessment

**RESPONSE FORMAT:**
Category: [Specific Golden Rule category name]
Confidence: [High/Medium/Low] ([percentage]%)
Reasoning: [Detailed explanation of which specific rule was violated, potential consequences, and why this categorization is appropriate]'
WHERE id = 'golden_rules';

UPDATE knowledge_bases SET 
  prompt_template = 'Analyze the following hazard report against the PSPP (Peraturan Sanksi Pelanggaran Prosedur) violations and sanctions of PT Berau Coal.

**CONTEXT:**
{RETRIEVED_CONTEXT}

**HAZARD TO ANALYZE:**
{USER_INPUT}

**ANALYSIS INSTRUCTIONS:**
1. Identify which PSPP violation category this hazard represents
2. Determine the appropriate sanction level (L1, L2, L3, SP1, SP2, SP3, PHK)
3. Assess the severity and compliance implications
4. Provide clear reasoning for your assessment

**RESPONSE FORMAT:**
Category: [Specific PSPP violation category]
Confidence: [High/Medium/Low] ([percentage]%)
Reasoning: [Detailed explanation of the specific violation, applicable sanction level, and justification for this categorization]'
WHERE id = 'pspp';

UPDATE knowledge_bases SET 
  prompt_template = 'Analyze the following hazard report against the TBC (To be Concern) hazard categories of PT Berau Coal. These are potential safety concerns that require attention before they become serious incidents.

**CONTEXT:**
{RETRIEVED_CONTEXT}

**HAZARD TO ANALYZE:**
{USER_INPUT}

**ANALYSIS INSTRUCTIONS:**
1. Identify which TBC hazard category this observation falls under
2. Assess the potential risk level and likelihood of escalation
3. Determine appropriate preventive measures
4. Provide clear reasoning for your assessment

**RESPONSE FORMAT:**
Category: [Specific TBC hazard category name]
Confidence: [High/Medium/Low] ([percentage]%)
Reasoning: [Detailed explanation of the potential hazard, risk assessment, and why this TBC categorization is appropriate]'
WHERE id = 'tbc';

-- Clear existing knowledge base chunks for golden_rules, pspp, and tbc to update with new content
DELETE FROM knowledge_base_chunks WHERE knowledge_base_id IN ('golden_rules', 'pspp', 'tbc');

-- Insert new Golden Rules content
INSERT INTO knowledge_base_chunks (knowledge_base_id, chunk_text, chunk_index) VALUES
('golden_rules', '1. KELAYAKAN KENDARAAN & UNIT - ANDA HARUS MENGERTI DAN MEMATUHI PERATURAN KELAYAKAN KENDARAAN & UNIT DI SELURUH AREA KERJA PT BERAU COAL. AWAS! PENGOPERASIAN KENDARAAN/UNIT YANG TIDAK LAYAK TELAH MENYEBABKAN CEDERA SERIUS HINGGA KEMATIAN. Pekerja DILARANG mengoperasikan kendaraan atau unit yang diketahui fungsi rem, atau kemudi, atau sabuk pengaman rusak. Pekerja DILARANG mengoperasikan kendaraan di area tambang tanpa buggy-whip, radio komunikasi dan lampu strobe. DILARANG merubah/menghilangkan fungsi alat keselamatan pada kendaraan dan unit tanpa telah lulus uji kelayakan. SANKSI: PELANGGARAN PERTAMA: PERINGATAN TERAKHIR, PELANGGARAN KEDUA: PHK', 1),
('golden_rules', '2. PENGOPERASIAN KENDARAAN & UNIT - ANDA HARUS MENGERTI DAN MENGIKUTI ATURAN LALU LINTAS SEBELUM MENGOPERASIKAN KENDARAAN DAN UNIT DI AREA KERJA PT BERAU COAL. AWAS! MENGOPERASIKAN KENDARAAN SECARA TIDAK LAYAK/BENAR TELAH MENYEBABKAN CEDERA SERIUS HINGGA KEMATIAN. DILARANG mengoperasikan kendaraan atau unit tanpa memiliki SIMPER. DILARANG melebihi kecepatan lebih dari 30 km/jam di atas kecepatan yang telah ditetapkan. Semua orang di dalam kendaraan atau unit saat bergerak HARUS menggunakan sabuk pengaman dengan benar. DILARANG mengoperasikan kendaraan atau unit dalam keadaan tidak bugar (lelah, mengantuk & tidak konsentrasi). DILARANG menggunakan telepon genggam, dan alat bantu dengar (headset) ketika sedang mengoperasikan kendaraan atau unit. DILARANG berhenti, parkir mendahului atau memasuki area perakaran (manuver) alat berat yang sedang bergerak tanpa mendapat ijin dari operator alat berat tersebut. SANKSI: PELANGGARAN PERTAMA: PERINGATAN TERAKHIR, PELANGGARAN KEDUA: PHK', 2),
('golden_rules', '3. LOCK OUT & TAG OUT (LOTO) - ANDA HARUS MENGETAHUI DAN MEMATUHI STANDAR LABEL & PENANDAAN SEBELUM MELAKUKAN PERBAIKAN PADA KENDARAAN, UNIT, DAN LISTRIK DI AREA KERJA PT BERAU COAL. AWAS! PELANGGARAN ATURAN KESELAMATAN PENGGUNAAN LOTO DAPAT MENYEBABKAN CEDERA SERIUS HINGGA KEMATIAN. Anda HARUS memasang personal LOTO dengan benar pada saat melakukan perbaikan atau perawatan yang memerlukan isolasi. DILARANG memindahkan atau melepaskan LOTO milik pekerja lain. DILARANG mengoperasikan kendaraan/unit dan/atau peralatan listrik yang terdapat tanda perawatan (label dan penandaan). SANKSI: PELANGGARAN PERTAMA: PERINGATAN TERAKHIR, PELANGGARAN KEDUA: PHK', 3),
('golden_rules', '4. KESELAMATAN BEKERJA DI KETINGGIAN - ANDA HARUS MEMAHAMI DAN MEMATUHI PROSEDUR BEKERJA DI KETINGGIAN SEBELUM MELAKUKAN PEKERJAAN DI LINGKUNGAN PT BERAU COAL. AWAS! PELANGGARAN ATURAN KESELAMATAN BEKERJA DI KETINGGIAN DAPAT MENYEBABKAN CEDERA SERIUS HINGGA KEMATIAN. Pekerja yang berada pada ketinggian lebih dari 1,8 meter dari permukaan tanah atau lantai kerja yang tidak dilengkapi dengan pagar HARUS menggunakan full body harness yang dilengkapi dengan dua tali pengaman (double lanyard) yang dikaitkan pada titik yang kuat. SANKSI: PHK', 4),
('golden_rules', '5. KESELAMATAN BEKERJA DI RUANG TERBATAS - ANDA HARUS MEMAHAMI DAN MEMATUHI PROSEDUR RUANG TERBATAS (CONFINED SPACE) SEBELUM MELAKUKAN PEKERJAAN DI AREA KERJA PT BERAU COAL. AWAS! PELANGGARAN PERSYARATAN KESELAMATAN BEKERJA DI RUANG TERBATAS DAPAT MENYEBABKAN KEMATIAN. DILARANG memasuki ruang terbatas tanpa ijin. Ruang terbatas adalah: Bukan ruangan kerja rutin, Hanya memiliki 1 pintu masuk/keluar, Memiliki sirkulasi udara terbatas, Memiliki potensi keracunan gas, Memiliki potensi terperangkap seperti tangki, man hole, bunker, palka kapal, cerobong, silo, pipa saluran, ruang bawah tanah. SANKSI: PHK', 5);

-- Continue with remaining Golden Rules
INSERT INTO knowledge_base_chunks (knowledge_base_id, chunk_text, chunk_index) VALUES
('golden_rules', '6. KESELAMATAN ALAT ANGKAT & ALAT PENYANGGA - ANDA HARUS MENGERTI DAN MEMATUHI PROSEDUR ALAT ANGKAT & PENYANGGA SEBELUM MELAKUKAN PEKERJAAN PENGANGKATAN DAN PENYANGGAAN DI AREA KERJA PT BERAU COAL. AWAS! PELANGGARAN BEKERJA DENGAN ALAT ANGKAT DAN PENYANGGA DAPAT MENYEBABKAN KEMATIAN. Pekerja DILARANG mengoperasikan alat angkat tanpa memiliki SIMPER atau KIMPER. DILARANG berada di bawah beban yang sedang diangkat. Pekerjaan pengangkatan & penyanggaan HARUS menggunakan alat/peralatan yang sesuai dengan fungsinya dan lulus uji kelayakan. SANKSI: PHK', 6),
('golden_rules', '7. BEKERJA DI DEKAT TEBING ATAU DINDING GALIAN - ANDA HARUS MEMAHAMI DAN MEMATUHI PROSEDUR PENGGALIAN DAN PEMBENTUKAN DESAIN LERENG PADA AREA MATERIAL LUNAK SEBELUM BEKERJA DI AREA KERJA PT BERAU COAL. AWAS! PELANGGARAN ATURAN BEKERJA DI DEKAT TEBING ATAU DINDING GALIAN TELAH MENYEBABKAN KEMATIAN. DILARANG berada dalam jarak kurang dari 1.5x tinggi tebing atau dinding galian yang mudah longsor sesuai hasil assessment geoteknik, kecuali berada dalam unit A2B yang dilengkapi kabin pengaman. DILARANG melakukan penggalian dengan sistem potong bawah (undercut) pada tebing atau dinding galian yang melebihi tinggi kabin unit alat gali yang digunakan. DILARANG berada di atas tanggul pada tepi tebing (crest) pit. DILARANG berada di dalam jarak 15 m dari batas rencana penggalian material lunak. SANKSI: PELANGGARAN PERTAMA: PERINGATAN TERAKHIR, PELANGGARAN KEDUA: PHK', 7),
('golden_rules', '8. BEKERJA PADA AREA PELEDAKAN - ANDA HARUS MEMAHAMI DAN MEMATUHI PROSEDUR PENGAMANAN PELEDAKAN SEBELUM MEMULAI BEKERJA DI PT BERAU COAL. AWAS! PELANGGARAN ATURAN BEKERJA AMAN DI AREA PELEDAKAN DAPAT MENYEBABKAN CEDERA SERIUS HINGGA KEMATIAN. DILARANG memasuki area peledakan (blasting area) tanpa izin dari Pengawas Peledakan. SANKSI: PELANGGARAN PERTAMA: PERINGATAN TERAKHIR, PELANGGARAN KEDUA: PHK', 8),
('golden_rules', '9. BEKERJA DI DEKAT AIR - ANDA HARUS MEMAHAMI DAN MEMATUHI PROSEDUR BEKERJA DI ATAS AIR / DEKAT AIR SEBELUM MEMULAI PEKERJAAN DI AREA KERJA PT BERAU COAL. AWAS! PELANGGARAN ATURAN BEKERJA AMAN DI DEKAT AIR DAPAT MENYEBABKAN CEDERA SERIUS HINGGA KEMATIAN. DILARANG bekerja/berada di tepi/atas air yang tidak dilengkapi alat pelindung jatuh dengan kedalaman air lebih dari 1 meter tanpa menggunakan pelampung keselamatan (life jacket / work vest). SANKSI: PELANGGARAN PERTAMA: PERINGATAN TERAKHIR, PELANGGARAN KEDUA: PHK', 9),
('golden_rules', '10. BEKERJA DI DISPOSAL - ANDA HARUS MEMAHAMI DAN MEMATUHI PROSEDUR DUMPING DI AREA DISPOSAL SEBELUM MEMULAI PEKERJAAN DI AREA PT BERAU COAL. AWAS! PELANGGARAN ATURAN BEKERJA DI AREA DISPOSAL INI TELAH MENYEBABKAN KEMATIAN. DILARANG melakukan penimbunan / pembuangan material langsung ke kolam (sump) melewati bibir tebing (crest line). DILARANG tidur di area disposal atau area terbuka lainnya di area tambang. SANKSI: PELANGGARAN PERTAMA: PERINGATAN TERAKHIR, PELANGGARAN KEDUA: PHK', 10),
('golden_rules', '11. BEKERJA PADA AREA PEMBERSIHAN LAHAN - ANDA HARUS MEMAHAMI DAN MEMATUHI PROSEDUR LAND CLEARING SEBELUM MEMULAI PEKERJAAN DI AREA KERJA PT BERAU COAL. AWAS! PELANGGARAN ATURAN BEKERJA DI AREA LAND CLEARING INI TELAH MENYEBABKAN KEMATIAN. DILARANG memasuki area pembersihan lahan / land clearing tanpa ijin dari pengawas land clearing. SANKSI: PELANGGARAN PERTAMA: PERINGATAN TERAKHIR, PELANGGARAN KEDUA: PHK', 11);

-- Insert PSPP content (sample chunks)
INSERT INTO knowledge_base_chunks (knowledge_base_id, chunk_text, chunk_index) VALUES
('pspp', 'L1 Violations: Tidak membawa/menunjukkan SIMPER yang masih berlaku saat mengoperasikan unit atau kendaraan perusahaan di area operasional PT Berau Coal. Tidak mengoperasikan Strobe Light/Flash Lamp/Blitz Lamp/Rotary Lamp pada saat mengoperasikan unit/kendaraan di area tambang dan jalan hauling. Tidak menyalakan lampu besar saat mengoperasikan unit/kendaraan di area tambang dan jalan hauling. Pengemudi menghentikan unit/kendaraan di daerah terlarang atau berbahaya. Melanggar kecepatan maksimum > 5 km/jam.', 1),
('pspp', 'L2 Violations: Mengoperasikan unit/kendaraan yang ijin pengoperasian (sticker commissioning) telah berakhir. Tidak melakukan P2H sebelum mengoperasikan Unit/Kendaraan. Meninggalkan kunci kontak di unit/kendaraan pada saat parkir. Melanggar kecepatan maksimum > 10 km/jam. Tidak menggunakan sepatu keselamatan saat mengoperasikan kendaraan/unit operasional.', 2),
('pspp', 'L3 Violations: Mengoperasikan kendaraan ringan di jalan tambang tanpa Buggy Whip. Melanggar kecepatan maksimum > 20 km/jam. Membawa penumpang melebihi kapasitas tempat duduk. Mengoperasikan kendaraan/unit memasuki daerah terlarang. Operator/Driver/Penumpang merokok di dalam kabin kendaraan/unit operasional.', 3),
('pspp', 'SP (Surat Peringatan) Violations: SP1 - Tidak melaporkan kejadian kecelakaan lebih dari 1x24 jam. SP2 - Mengoperasikan mesin/peralatan yang memiliki risiko tinggi tanpa KIMPER. SP3 - Membawa keluar dokumen rahasia perusahaan, tidak berhenti pada rambu STOP, melakukan modifikasi alat keselamatan.', 4),
('pspp', 'PHK (Pemutusan Hubungan Kerja): Meminjamkan kendaraan/unit kepada orang yang tidak memiliki SIMPER. Mengajar orang mengoperasikan kendaraan/unit kecuali trainer. Mengoperasikan kendaraan/unit dibawah pengaruh alkohol atau obat terlarang.', 5);

-- Insert TBC content (sample chunks)
INSERT INTO knowledge_base_chunks (knowledge_base_id, chunk_text, chunk_index) VALUES
('tbc', 'Deviasi pengoperasian kendaraan/unit: Fatigue (yawning, microsleep, closed eyes), melakukan aktivitas lain (headset, handphone, makan, minum, merokok), pengoperasian unit tidak layak (kondisi tyre tidak memadai, pengereman tidak berfungsi, tidak dilengkapi radio komunikasi), unit tidak komunikasi 2 arah, tidak menjaga jarak beriringan unit, overspeed ≤ 5 km/jam, melintas pada jalur berlawanan.', 1),
('tbc', 'Deviasi penggunaan APD: Tidak menggunakan APD yang sesuai/dengan benar/layak, ditemukan kondisi APD yang tidak layak, tidak memasang welding screen saat aktivitas welding.', 2),
('tbc', 'Geotech & Hydrology: Penempatan prasarana pada radius area rawan longsor, retakan, aktivitas penambangan tidak sesuai rekomendasi kajian geoteknik, tidak terdapat kajian Geoteknik pada area kerja dengan risiko Geoteknik, tidak dilakukan pemantauan kestabilan lereng dan timbunan.', 3),
('tbc', 'Posisi Pekerja pada Area Tidak Aman: Berada di luar kabin/pos/pondok pada area tambang, berpijak pada tempat yang tidak semestinya, turun dari unit tidak memperhatikan 3 titik tumpu, pekerja berada pada radius manuver unit, berada dalam jarak < 1,5x tebing/dinding galian, memasuki area khusus tanpa izin.', 4),
('tbc', 'Deviasi Loading/Dumping: Jarak dumping <20m (rawa), <10m (air), 4–5m (kering), dumping menyentuh/menaiki tanggul, undercut, material/dinding galian melebihi tinggi kabin, tidak ada tanggul pengaman pada Top Loading, batas dumping tidak ada/tidak diupdate.', 5);

-- Create new HIRA knowledge base
INSERT INTO knowledge_bases (id, name, description, color, prompt_template) VALUES (
  'hira',
  'HIRA (Hazard Identification Risk Assessment)',
  'Hazard Identification and Risk Assessment database for land clearing and mining operations',
  '#10b981',
  'Analyze the following hazard report against the HIRA (Hazard Identification Risk Assessment) database for mining operations, specifically focusing on land clearing activities and associated risks.

**CONTEXT:**
{RETRIEVED_CONTEXT}

**HAZARD TO ANALYZE:**
{USER_INPUT}

**ANALYSIS INSTRUCTIONS:**
1. Identify which HIRA category and specific hazard type this report matches
2. Assess the risk level and potential consequences
3. Identify applicable preventive, detective, and mitigative controls
4. Provide recommendations based on established risk controls

**RESPONSE FORMAT:**
Category: [Specific HIRA activity and hazard type]
Confidence: [High/Medium/Low] ([percentage]%)
Reasoning: [Detailed analysis of the hazard identification, risk assessment, and recommended controls based on HIRA database]'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  color = EXCLUDED.color,
  prompt_template = EXCLUDED.prompt_template;