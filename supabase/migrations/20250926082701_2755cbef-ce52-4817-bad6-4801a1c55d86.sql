-- Update TBC knowledge base with comprehensive detailed content
UPDATE knowledge_bases 
SET 
  prompt_template = 'Berdasarkan konteks TBC Hazard berikut:
{RETRIEVED_CONTEXT}

Analisis hazard concern ini: "{USER_INPUT}"

Tentukan kategori TBC yang paling sesuai dari 14 kategori:
1. Deviasi pengoperasian kendaraan/unit
2. Deviasi penggunaan APD  
3. Geotech & Hydrology
4. Posisi Pekerja pada Area Tidak Aman/Pekerjaan Tidak Sesuai Prosedur
5. Deviasi Loading/Dumping
6. Tidak terdapat pengawas/pengawas tidak memadai
7. LOTO (Lock Out Tag Out)
8. Deviasi Road Management
9. Kesesuaian Dokumen Kerja
10. Tools Tidak Standard/Penggunaan Tools Tidak Tepat
11. Bahaya Elektrikal
12. Bahaya Biologis
13. Aktivitas Drill and Blast
14. Technology

Format jawaban:
KATEGORI TBC: [pilih salah satu dari 14 kategori di atas]
CONFIDENCE: [0-100%]
ALASAN: [penjelasan singkat mengapa masuk kategori TBC tersebut]',
  updated_at = now()
WHERE id = 'tbc';

-- Update the knowledge base chunks for TBC with the new detailed content
DELETE FROM knowledge_base_chunks WHERE knowledge_base_id = 'tbc';

-- Insert the new comprehensive TBC content as chunks
INSERT INTO knowledge_base_chunks (knowledge_base_id, chunk_text, chunk_index) VALUES
('tbc', 'TO BE CONCERN (TBC) HAZARD - DETAILED VERSION:

1. Deviasi pengoperasian kendaraan/unit: Fatigue (yawning, microsleep, closed eyes), melakukan aktivitas lain (menggunakan headset/menggunakan handphone/makan/minum/merokok/memberi barang dari atau ke unit lain), tidak menggunakan seatbelt, pengoperasian unit yang tidak layak operasi (kondisi tyre tidak memadai, pengereman tidak berfungsi, tidak dilengkapi radio komunikasi), pengoperasian unit tanpa SIMPER, unit tidak komunikasi 2 arah, tidak melakukan P2H/Pelaksanaan P2H tidak sesuai, tidak menjaga jarak beriringan unit saat beroperasi/antri, overspeed ≤ 5 km/jam, memodifikasi alat keselamatan pada unit, meninggalkan unit dalam kondisi unit masih menyala, melintas pada jalur berlawanan, membawa HP ke dalam unit Hauler dan A2B, jam tidur kurang 6 jam saat verifikasi Fit To Work, seatbelt rusak dari hasil inspeksi (diluar temuan P2H), tidak dilakukan pemeriksaan Crack Test Kendaraan Transport, tidak membunyikan klakson maju/mundur, driver tidak speak up self declare, penyiraman tidak putus-putus pada tanjakan dan turunan.', 1),

('tbc', '2. Deviasi penggunaan APD: Tidak menggunakan APD yang sesuai/dengan benar/layak, ditemukan kondisi APD yang tidak layak (walau belum digunakan), berada di dekat air tanpa menggunakan pelampung, bekerja di ketinggian lebih dari 1,8 m tanpa body harness + double lanyard yang dikaitkan, tidak memasang welding screen saat aktivitas welding, penempatan lokasi prasarana pada radius area rawan longsor, tidak menggunakan APD/APD yang digunakan tidak layak.

3. Geotech & Hydrology: Retakan, aktivitas penambangan pada area yang tidak memenuhi faktor keamanan sesuai rekomendasi kajian geoteknik, tidak terdapat kajian geoteknik pada area kerja dengan risiko geoteknik yang sudah berjalan, tidak dilakukan pemantauan kestabilan lereng tambang dan timbunan, terdapat potensi bahaya yang dapat mengakibatkan isu geoteknik/hidrologi di area tambang yang dapat membahayakan pekerja, landslide.', 2),

('tbc', '4. Posisi Pekerja pada Area Tidak aman/Pekerjaan Tidak Sesuai Prosedur: Berada di luar kabin/pos/pondok pada area tambang, berpijak pada tempat yang tidak semestinya, turun dari unit tidak memperhatikan 3 titik tumpu, berada dalam jarak <1,5x tebing/dinding galian, berada di atas crest atau tanggul dengan beda tinggi, buang air kecil dari atas unit, berenang di sump, memasuki area khusus tanpa izin (blasting, land clearing, etc), tidak turun dari unit saat proses penyebrangan, tidur di disposal/area tambang terbuka, pekerja berada pada radius manuver unit, berada pada jarak <6 meter (untuk tyreman) dan <10 meter (untuk selain tyreman) saat pompaan tyre, berada di dibawah beban yang sedang diangkat/di bawah unit yang sedang dimaintenance yang berpotensi menimbulkan bahaya/berada pada radius manuver unit, pekerjaan dilakukan pada area tidak memadai (ruang kerja sempit, area kerja tidak sesuai, kurang pencahayaan), pengelasan velg tanpa melepas ban unit, pekerja (operator dan pengawas) baru <1 tahun bekerja di area highrisk.', 3),

('tbc', '5. Deviasi Loading/Dumping: Jarak dumping kurang dari 20m (rawa), 10m (air), 4-5m (kering), dumping menyentuh/menaiki tanggul, undercut, material/dinding galian melebihi tinggi kabin, tidak ada tanggul pengaman pada top loading, batas dumping tidak ada/tidak ditutup.

6. Tidak terdapat pengawas/pengawas tidak memadai: Tidak ada pengawas/spotter/trafficman, pengawas tidak memiliki kompetensi yang memadai, pengawas tidak melaksanakan SAP, pengawas tidak mengisi checklist aktivitas awal shift (khususnya aktivitas kritis), pengawas ikut bekerja atau melakukan pekerjaan.', 4),

('tbc', '7. LOTO (Lock Out Tag Out): Tidak memasang LOTO/personal tag LOTO, melepas LOTO pekerja lain, mengoperasikan unit yang terdapat tanda perawatan, tag LOTO pudar/rusak/tidak tersedia, kunci LOTO digantung tanpa dilepas pada gembok, tidak mengisi formulir LOTO.

8. Deviasi Road Management: Akses area yang tidak aktif belum ditutup, jalan shortcut, ketidaksesuaian persimpangan (simpang 3 atau lebih), tanggul area red zone tidak ada/tidak standar, grade jalan >10% tanpa pengendalian, jalan licin pasca hujan sudah digunakan sebelum slippery selesai, tidak ada median pada persimpangan jalan, terdapat jalan blindspot, tidak ada tanggul pengaman, lebar jalan tidak standar (belum selesai construct/maintenance tidak berjalan) tanpa pengendalian, superelevasi terbalik, ketidaksesuaian persimpangan (simpang 5 atau lebih).', 5),

('tbc', '9. Kesesuaian Dokumen Kerja: Pekerjaan dilakukan tidak sesuai DOP/tidak ada DOP pekerjaan, pengawas tidak memiliki izin bekerja atau ketidaksesuaian actual di lapangan dengan yang ada pada IKK, tidak membawa ID card/memakai ID card orang lain, bekerja tidak mempunyai kompetensi/KIMPER/SIMPER yang sesuai, bekerja di ruang terbatas tanpa izin, pekerja tidak memiliki izin bekerja atau ketidaksesuaian actual di lapangan dengan yang ada pada IKK, bekerja tanpa ada JSA pekerjaan/tidak disosialisasikan, ketersediaan atau kesesuaian MPRP.

10. Tools Tidak Standard/Penggunaan Tools Tidak Tepat: Tools yang digunakan tidak standard, penggunaan tools yang tidak sesuai peruntukkan, penggunaan alat angkat pengganti yang tidak sesuai dan tidak memadau karena ketidaktersediaan overhead crane, tidak terdapat pengaman tambahan untuk menahan/menopang kabin unit yang sedang diperbaiki agar tidak jatuh, modifikasi tools tanpa kajian/sertifikasi.', 6),

('tbc', '11. Bahaya Elektrikal: Potensi percikan api, tidak terdapat pengecekan instalasi listrik, tidak ada barikade atau penandaan pada area tegangan tinggi, perbaikan instalasi tanpa memutus aliran listrik, instalasi listrik tidak standar.

12. Bahaya Biologis: Tidak terdapat identifikasi bahaya biologis, terdapat tanaman merambat yang lebat di area kerja yang berpotensi menjadi sarang ular, tidak tersedia serum anti bisa ular (SABU) di fasilitas kesehatan, terdapat bahaya biologi yang belum terkendali (pohon kering belum dilakukan pemotongan), tidak melaporkan kejadian tergigit ular kepada rekan kerja dan atasan sehingga terjadi keterlambatan penanganan.', 7),

('tbc', '13. Aktivitas Drill and Blast: Akses menuju lokasi peledakan/gudang handak tidak layak, jarak unit bor terlalu dekat dengan unit MPU/peledakan, tanggul lokasi peledakan tidak sesuai standar, permukaan kerja area peledakan tidak keras/kering, tidak ada area parkir area drill & blast, area parkir drill & blast tidak standar, tidak ada rambu parkir pada area drill & blast, barikade/safety line pada area drilling, rambu aktivitas pengeboran tidak terpasang, penempatan aksesoris peledakan di area peledakan tidak aman, area maneuver unit MPU tidak memadai, terdapat lubang panas di area peledakan, jarak lubang ledak terhadap jalan aktif terlalu dekat, terdapat lubang collapse/lumpur/miring, berada di lokasi saat kondisi cuaca petir, pita batas radius peledakan/sleepblast tidak ada, tidak ada pondok area sleepblast, lampu flip flop area sleepblast belum ada, rambu aktivitas peledakan/peledakan tidur tidak terpasang, tidak terdapat rambu atau bendera radius aman manusia, aktivitas charging berdekatan dengan aktivitas front loading, mobilisasi unit drilling machine tanpa menurunkan drilling mast.

14. Technology: Terdapat area/aktivitas kritis yang tidak tercover oleh CCTV/Mining Eyes, P2H control room DMS/Mining Eyes tidak dilakukan.', 8);