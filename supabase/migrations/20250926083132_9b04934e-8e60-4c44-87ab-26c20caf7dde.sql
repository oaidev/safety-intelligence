-- Update PSPP knowledge base with comprehensive detailed content including severity levels
UPDATE knowledge_bases 
SET 
  prompt_template = 'Berdasarkan konteks PSPP berikut:
{RETRIEVED_CONTEXT}

Analisis pelanggaran ini: "{USER_INPUT}"

Tentukan nomor PSPP yang paling sesuai dari 39 item PSPP dengan tingkat sanksi:

TINGKAT SANKSI:
- L1 (Level 1): Sanksi ringan - item 1-11
- L2 (Level 2): Sanksi sedang - item 12-20
- L3 (Level 3): Sanksi berat - item 21-26
- SP1-SP3: Surat Peringatan 1-3 - item 27-32
- PHK: Pemutusan Hubungan Kerja - item 33-39

Format jawaban:
KATEGORI PSPP: [nomor 1-39]
TINGKAT SANKSI: [L1/L2/L3/SP1/SP2/SP3/PHK]
CONFIDENCE: [0-100%]
ALASAN: [penjelasan singkat mengapa masuk kategori PSPP tersebut]',
  updated_at = now()
WHERE id = 'pspp';

-- Update the knowledge base chunks for PSPP with the new detailed content
DELETE FROM knowledge_base_chunks WHERE knowledge_base_id = 'pspp';

-- Insert the new comprehensive PSPP content as chunks optimized for RAG
INSERT INTO knowledge_base_chunks (knowledge_base_id, chunk_text, chunk_index) VALUES
('pspp', 'PERATURAN SANKSI PELANGGARAN PROSEDUR (PSPP) - DETAILED VERSION:

LEVEL 1 VIOLATIONS (L1) - SANKSI RINGAN:
1. Tidak membawa/menunjukkan SIMPER yang masih berlaku saat mengoperasikan unit atau kendaraan perusahaan di area operasional PT Berau Coal — L1
2. Tidak mengoperasikan Strobe Light/Flash Lamp/Blitz Lamp/Rotary Lamp pada saat mengoperasikan unit/kendaraan di area tambang dan jalan hauling (berlaku selama operasional siang dan malam) — L1
3. Tidak menyalakan lampu besar saat mengoperasikan unit/kendaraan di area tambang dan jalan hauling — L1
4. Pengemudi menghentikan unit/kendaraan di daerah terlarang atau berbahaya, diantaranya pada tanjakan, jembatan, tikungan, turunan, tengah jalan, kecuali dalam keadaan darurat — L1
5. Saat mengalami kerusakan di jalan tambang dan jalan hauling, kendaraan/unit tidak memasang Traffic Cone/segitiga keselamatan (sesuai dengan Standar Kelayakan Kendaraan/Unit) dan ganjal ban (ukuran disesuaikan dengan besaran ban) — L1', 1),

('pspp', 'LEVEL 1 VIOLATIONS (L1) - SANKSI RINGAN (LANJUTAN):
6. Mengangkut barang yang melebihi salah satu sisi atau lebih dari kendaraan/unit tanpa memasang pita reflective — L1
7. Mendahului kendaraan di jalan tambang dan jalan hauling pada daerah yang terdapat rambu/tanda larangan mendahului — L1
8. Tidak mengindahkan rambu-rambu yang tertera di jalan tambang & hauling kecuali yang disebutkan khusus dalam standar ini — L1
9. Memarkir kendaraan atau unit di depan fasilitas keadaan darurat seperti Fire Hydrant, Ambulance, Fire Truck atau memarkir kendaraan pada area dilarang parkir — L1
10. Melanggar kecepatan maksimum di semua jalan tambang dan jalan hauling melebihi kecepatan maksimum > 5 km/jam — L1
11. Melakukan tindakan tidak aman sehingga mengakibatkan kecelakaan baik terhadap unit/kendaraan yang dioperasikan maupun unit lain dan menimbulkan kerugian langsung < Rp. 100.000.000 — L1', 2),

('pspp', 'LEVEL 2 VIOLATIONS (L2) - SANKSI SEDANG:
12. Mengoperasikan unit/kendaraan yang ijin pengoperasian (sticker commissioning) telah berakhir — L2
13. Tidak melakukan P2H (prosedur pemeriksaan harian) sebelum mengoperasikan Unit/Kendaraan — L2
14. Meninggalkan kunci kontak di unit/kendaraan pada saat parkir — L2
15. Meninggalkan kendaraan/unit dalam kondisi mesin hidup dan atau menghidupkan kendaraan/unit saat sedang parkir/istirahat — L2
16. Melanggar kecepatan maksimum di semua jalan tambang dan jalan hauling melebihi kecepatan maksimum > 10 km/jam — L2
17. Memasang sticker, gordyn/tirai atau accessories lain yang tidak dipersyaratkan dalam standar kelayakan kendaraan/unit yang dapat mengganggu pandangan driver/operator — L2', 3),

('pspp', 'LEVEL 2 VIOLATIONS (L2) - SANKSI SEDANG (LANJUTAN):
18. Tidak menggunakan sepatu keselamatan/safety shoes saat sedang mengoperasikan kendaraan/unit operasional — L2
19. Melakukan aktifitas lain saat sedang berada di atas kendaraan/unit yang dapat berpotensi bahaya seperti: buang air kecil/besar, menerima/memberi barang dari kendaraan/unit ke kendaraan/unit lain — L2
20. Melakukan tindakan tidak aman sehingga mengakibatkan kecelakaan baik terhadap unit/kendaraan yang dioperasikan maupun unit lain dan menimbulkan kerugian langsung Rp 100.000.000 ≤ Rp 250.000.000 — L2', 4),

('pspp', 'LEVEL 3 VIOLATIONS (L3) - SANKSI BERAT:
21. Melakukan tindakan tidak aman sehingga mengakibatkan kecelakaan baik terhadap unit/kendaraan yang dioperasikan maupun unit lain dan menimbulkan kerugian langsung > Rp 250.000.000 — L3
22. Mengoperasikan kendaraan ringan (Light Vehicle) di jalan tambang maupun hauling tanpa menggunakan Buggy Whip — L3
23. Melanggar kecepatan maksimum di semua jalan tambang dan jalan hauling melebihi kecepatan maksimum > 20 km/jam — L3
24. Membawa penumpang melebihi kapasitas tempat duduk pada kendaraan — L3
25. Memberi tumpangan pada unit produksi/support seperti Crane Truck dan sejenisnya, Water Truck, Fuel Truck dan Service Truck dan sejenisnya kecuali Trainer/Instruktur, orang yang diberi ijin KTT untuk kepentingan investigasi, penelitian dan atau studi — L3
26. Mengoperasikan kendaraan/unit memasuki daerah terlarang contoh tidak terbatas pada: area peledakan, area batas peledakan, gudang bahan peledak, area land clearing tanpa persetujuan dari penanggung jawab area atau orang yang berwenang — L3', 5),

('pspp', 'WARNING LETTER VIOLATIONS - SURAT PERINGATAN:
27. Operator/Driver/Pengemudi/Penumpang merokok di dalam kabin kendaraan/unit operasional perusahaan baik di dalam maupun di luar area operasional — L3-SP1
28. Tidak melaporkan kejadian kecelakaan yang dialami atau menerima laporan kecelakaan dari bawahannya namun tidak dilaporkan ke Command Centre Room (CCR) PT Berau Coal lebih dari 1x24 jam sejak kejadian — SP1
29. Mengoperasikan mesin/peralatan yang memiliki risiko tinggi, digerakkan dengan tangan dan membutuhkan keahlian khusus serta mesin/alat tersebut membutuhkan sumber energi lain untuk menggerakkannya tanpa KIMPER — SP2
30. Membawa keluar dari lingkungan perusahaan, gambar teknik atau dokumen yang merupakan rahasia perusahaan serta mempublikasikan foto/gambar kecelakaan atau kerusakan lingkungan ke media sosial kecuali telah mendapat ijin dari KTT PT Berau Coal — SP3
31. Tidak berhenti pada rambu STOP saat mengoperasikan kendaraan/unit di area Operasional Tambang — L3-SP3
32. Melakukan perubahan/penambahan/modifikasi/menghilangkan fungsi alat keselamatan yang terdapat pada peralatan, unit/kendaraan yang telah lulus uji kelayakan — L3-SP3', 6),

('pspp', 'MARITIME OPERATIONS - PROGRESSIVE SANCTIONS:
33. Melakukan aktivitas di tongkang pada malam hari tanpa menggunakan safety helmet yang sudah terintegrasi dengan head lamp yang berfungsi dengan baik — Pelanggaran Pertama: SP3, Pelanggaran Kedua: PHK
34. Aktivitas mooring-unmooring tidak menjalankan buddy system (minimal 2 orang) — Pelanggaran Pertama: SP3, Pelanggaran Kedua: PHK
35. Mengoperasikan winch machine di kapal selain crew kapal tersebut — Pelanggaran Pertama: SP3, Pelanggaran Kedua: PHK
36. Tidak menggunakan pelampung sesuai spesifikasi yang ditetapkan PT Berau Coal dan layak digunakan pada saat kegiatan mooring-unmooring — Pelanggaran Pertama: SP3, Pelanggaran Kedua: PHK', 7),

('pspp', 'TERMINATION VIOLATIONS (PHK) - PEMUTUSAN HUBUNGAN KERJA:
37. Meminjamkan kendaraan/unit operasional kepada orang yang tidak memiliki SIMPER di daerah operasi PT Berau Coal — PHK
38. Mengajar orang untuk mengoperasikan kendaraan/unit operasional di daerah operasi PT Berau Coal kecuali trainer (dalam rangka pelatihan) — PHK
39. Mengoperasikan kendaraan/unit operasional dibawah pengaruh alkohol atau obat terlarang/mabuk — PHK

STRUKTUR SANKSI PSPP:
- L1 (Level 1): Sanksi ringan untuk pelanggaran dasar (item 1-11)
- L2 (Level 2): Sanksi sedang untuk pelanggaran serius (item 12-20)  
- L3 (Level 3): Sanksi berat untuk pelanggaran berbahaya (item 21-26)
- SP1-SP3: Surat Peringatan bertingkat (item 27-32)
- PHK: Pemutusan Hubungan Kerja untuk pelanggaran fatal (item 33-39)', 8);