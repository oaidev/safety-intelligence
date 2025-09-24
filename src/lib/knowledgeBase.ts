// Knowledge Base Configuration for Multi-Knowledge RAG System

export interface KnowledgeBaseConfig {
  id: string;
  name: string;
  content: string;
  promptTemplate: string;
  color: string;
  description: string;
}

export const KNOWLEDGE_BASES: Record<string, KnowledgeBaseConfig> = {
  golden_rules: {
    id: 'golden_rules',
    name: 'Safety Golden Rules',
    color: 'info',
    description: 'Core safety regulations and procedures',
    content: `SAFETY GOLDEN RULES BERAU COAL

KELAYAKAN KENDARAAN DAN UNIT:
Pekerja dilarang mengoperasikan kendaraan atau unit yang diketahui fungsi rem, kemudi, atau sabuk pengaman rusak. Pekerja dilarang mengoperasikan kendaraan di area tambang tanpa buggy-whip, radio komunikasi dan lampu strobo. Dilarang merubah/menghilangkan fungsi alat keselamatan pada kendaraan dan unit yang sudah diuji kelayakan.

PENGOPERASIAN KENDARAAN DAN UNIT:
Dilarang mengoperasikan kendaraan atau unit di luar batas kecepatan yang ditentukan. Dilarang mengemudi dalam kondisi pengaruh alkohol dan/atau obat terlarang. Dilarang menggunakan HP ketika mengemudi kecuali menggunakan alat bantu. Dilarang mengangkut pekerja di atas/luar kabin kendaraan. Dilarang mengoperasikan kendaraan di jarak kurang dari 30m dari tepi jenjang. Wajib menggunakan sabuk pengaman ketika mengemudi.

LOCK OUT & TAG OUT (LOTO):
Harus memasang personal LOTO dengan benar pada saat melakukan perbaikan atau perawatan yang membutuhkan label & penandaan. Dilarang menjadikan alat mekanis sebagai LOTO. Dilarang melepas peralatan keselamatan atau alat pelindung lainnya yang terdapat tanda perawatan.

KESELAMATAN BEKERJA DI KETINGGIAN:
Dilarang memanjat pada peralatan bergerak jika tidak dilengkapi fasilitas permanen untuk bekerja di ketinggian. Dilarang bekerja pada ketinggian lebih dari 1,8 meter tanpa menggunakan alat pelindung jatuh (full body harness).

KESELAMATAN BEKERJA DI RUANG TERBATAS:
Dilarang memasuki ruang terbatas tanpa izin kerja (permit) yang sah. Wajib memastikan proses isolasi energi, ventilasi yang memadai, pengukuran gas, pengawasan petugas siaga, serta prosedur penyelamatan darurat telah tersedia dan aktif.

KESELAMATAN ALAT ANGKAT DAN ALAT PENYANGGA:
Pekerja dilarang mengoperasikan alat angkat tanpa memiliki SIMPER atau KIMPER. Dilarang berdiri di bawah beban yang sedang diangkat. Pekerja angkat dan penyangga wajib menggunakan peralatan yang sesuai dan pengamanan yang lengkap.

BEKERJA DI DEKAT TEBING ATAU DINDING GALIAN:
Dilarang bekerja di bawah lereng/dinding galian yang mudah longsor, kecuali gudang berada dalam kondisi aman, telah diperkuat, atau ada penyangga. Dilarang melakukan penggalian dengan sistem jenjang tanpa pengawasan dan pengendalian.

BEKERJA PADA AREA PELEDAKAN:
Dilarang mendekat area peledakan (blasting area) tanpa izin. Dilarang membawa perangkat komunikasi/elektronik tertentu yang dapat memicu peledakan di area terlarang.

BEKERJA DI DEKAT AIR:
Dilarang bekerja di atas ponton/jembatan kerja/talang air tanpa dilengkapi pagar pembatas dan pelampung keselamatan. Wajib menggunakan life jacket saat bekerja di atas air atau di dekat air.

BEKERJA DI AREA DISPOSAL:
Dilarang melakukan pembuangan material di area disposal yang tidak stabil atau tidak ditentukan. Dilarang parkir di area disposal yang aktif tanpa pengamanan.

BEKERJA PADA AREA PEMBERSIHAN LAHAN:
Dilarang mendekat ke area penebangan/penarikan pohon tanpa pengamanan. Wajib memastikan jalur evakuasi jelas dan aman.`,
    promptTemplate: `Berdasarkan konteks Safety Golden Rules berikut:
{RETRIEVED_CONTEXT}

Analisis deskripsi hazard ini: "{USER_INPUT}"

Tentukan kategori hazard yang paling sesuai dari pilihan berikut:
1. Kelayakan Kendaraan & Unit
2. Pengoperasian Kendaraan & Unit  
3. Lock Out & Tag Out
4. Keselamatan Bekerja Di Ketinggian
5. Keselamatan Bekerja Di Ruang Terbatas
6. Keselamatan Alat Angkat & Angkut
7. Bekerja Di Dekat Tebing Atau Dinding Galian
8. Bekerja Pada Area Peledakan
9. Bekerja Di Dekat Air
10. Bekerja Di Disposal
11. Bekerja Pada Area Pembersihan Lahan
12. Tidak Melanggar Golden Rules

Berikan jawaban dalam format:
KATEGORI: [pilih salah satu dari 12 kategori di atas]
CONFIDENCE: [0-100%]
ALASAN: [penjelasan singkat mengapa masuk kategori tersebut]`
  },

  pspp: {
    id: 'pspp',
    name: 'PSPP - Peraturan Sanksi Pelanggaran Prosedur',
    color: 'warning',
    description: 'Violation procedures and sanctions',
    content: `PERATURAN SANKSI PELANGGARAN PROSEDUR (PSPP):

1. Tidak membawa/menunjukkan SIMPER yang masih berlaku saat mengoperasikan unit atau kendaraan perusahaan di area operasi PT Berau Coal.

2. Tidak mengoperasikan Strobe Light/Flash Lamp/Blitz Lamp/Rotary Lamp pada saat mengoperasikan unit/kendaraan di area tambang dan jalan hauling.

3. Tidak menyalakan lampu besar saat mengoperasikan unit/kendaraan di area tambang dan jalan hauling.

4. Pengemudi menghentikan unit/kendaraan di daerah terlarang atau berbahaya, diantaranya pada tanjakan, jembatan, tikungan, turunan, tengah jalan, kecuali dalam keadaan darurat.

5. Saat mengalami kerusakan di jalan tambang dan jalan hauling, kendaraan/unit tidak memasang Traffic Cone/segitiga keselamatan dan ganjal ban.

6. Mengangkut barang yang melebihi salah satu sisi atau lebih dari kendaraan/unit tanpa memasang pita reflective.

7. Mendahului kendaraan di jalan tambang dan jalan hauling pada daerah yang terdapat rambu/tanda larangan mendahului.

8. Tidak mengindahkan rambu-rambu yang tertera di jalan tambang & hauling kecuali yang disebutkan khusus dalam standar ini.

9. Memarkir kendaraan atau unit di depan fasilitas keadaan darurat seperti Fire Hydrant, Ambulance, Fire Truck atau memarkir kendaraan pada area dilarang parkir.

10. Melanggar kecepatan maksimum di semua jalan tambang dan jalan hauling melebihi kecepatan maksimum > 5 km/jam.

11. Melakukan tindakan tidak aman sehingga mengakibatkan kecelakaan baik terhadap unit/kendaraan yang dioperasikan maupun unit lain dan menimbulkan kerugian langsung < Rp. 100.000.000.

12. Mengoperasikan unit/kendaraan yang ijin pengoperasian (sticker commissioning) telah berakhir.

13. Tidak melakukan P2H (prosedur pemeriksaan harian) sebelum mengoperasikan Unit/Kendaraan.

14. Meninggalkan kunci kontak di unit/kendaraan pada saat parkir.

15. Meninggalkan kendaraan/unit dalam kondisi mesin hidup dan atau menghidupkan kendaraan/unit saat sedang parkir/istirahat.

16. Melanggar kecepatan maksimum di semua jalan tambang dan jalan hauling melebihi kecepatan maksimum > 10 km/jam.

17. Memasang sticker, gordyn/tirai atau accessories lain yang tidak dipersyaratkan dalam standar kelayakan kendaraan/unit yang dapat mengganggu pandangan driver/operator.

18. Tidak menggunakan sepatu keselamatan/safety shoes saat sedang mengoperasikan kendaraan/unit operasional.

19. Melakukan aktifitas lain saat sedang berada di atas kendaraan/unit yang dapat berpotensi bahaya seperti: buang air kecil/besar, menerima/memberi barang apapun dari kendaraan/unit ke kendaraan/unit lain.

20. Melakukan tindakan tidak aman sehingga mengakibatkan kecelakaan baik terhadap unit/kendaraan yang dioperasikan maupun unit lain dan menimbulkan kerugian langsung Rp 100.000.000 ≤ s/d Rp 250.000.000.

21. Melakukan tindakan tidak aman sehingga mengakibatkan kecelakaan baik terhadap unit/kendaraan yang dioperasikan maupun unit lain dan menimbulkan kerugian langsung > Rp 250.000.000.

22. Mengoperasikan kendaraan ringan (Light Vehicle) di jalan tambang maupun hauling tanpa menggunakan Buggy Whip.

23. Melanggar kecepatan maksimum di semua jalan tambang dan jalan hauling melebihi kecepatan maksimum > 20 km/jam.

24. Membawa penumpang melebihi kapasitas tempat duduk pada kendaraan.

25. Memberi tumpangan pada unit produksi/support seperti Crane Truck dan sejenisnya, Water Truck, Fuel Truck dan Service Truck dan sejenisnya kecuali Trainer/Instruktur, orang yang diberi ijin KTT untuk kepentingan investigasi, penelitian dan atau studi.

26. Mengoperasikan kendaraan/unit memasuki daerah terlarang contoh tidak terbatas pada: area peledakan, area batas peledakan, gudang bahan peledak, area land clearing tanpa persetujuan dari penanggung jawab area atau orang yang berwenang.

27. Operator/Driver/Pengemudi/Penumpang merokok di dalam kabin kendaraan/unit operasional perusahaan baik di dalam maupun di luar area operasional.

28. Tidak melaporkan kejadian kecelakaan yang dialami atau menerima laporan kecelakaan dari bawahannya namun tidak dilaporkan ke Command Centre Room (CCR) PT Berau Coal lebih dari 1x24 jam sejak kejadian.

29. Mengoperasikan mesin/peralatan yang memiliki risiko tinggi, digerakkan dengan tangan dan membutuhkan keahlian khusus serta mesin/alat tersebut membutuhkan sumber energi lain untuk menggerakkannya tanpa KIMPER.

30. Membawa keluar dari lingkungan perusahaan, gambar teknik atau dokumen yang merupakan rahasia perusahaan serta mempublikasikan foto/gambar kecelakaan atau kerusakan lingkungan ke media sosial kecuali telah mendapat ijin dari KTT PT Berau Coal.

31. Tidak berhenti pada rambu STOP saat mengoperasikan kendaraan/unit di area Operasional Tambang.

32. Melakukan perubahan/penambahan/modifikasi/menghilangkan fungsi alat keselamatan yang terdapat pada peralatan, unit/kendaraan yang telah lulus uji kelayakan.

33. Melakukan aktivitas di tongkang pada malam hari tanpa menggunakan safety helmet yang sudah terintegrasi dengan head lamp yang berfungsi dengan baik.

34. Aktivitas mooring–unmooring tidak menjalankan buddy system (minimal 2 orang).

35. Mengoperasikan winch machine di kapal selain crew kapal tersebut.

36. Tidak menggunakan pelampung sesuai spesifikasi yang ditetapkan PT Berau Coal dan layak digunakan pada saat kegiatan mooring–unmooring.

37. Meminjamkan kendaraan/unit operasional kepada orang yang tidak memiliki SIMPER di daerah operasi PT Berau Coal.

38. Mengajar orang untuk mengoperasikan kendaraan/unit operasional di daerah operasi PT Berau Coal kecuali trainer (dalam rangka pelatihan).

39. Mengoperasikan kendaraan/unit operasional dibawah pengaruh alkohol atau obat terlarang/mabuk.`,
    promptTemplate: `Berdasarkan konteks PSPP berikut:
{RETRIEVED_CONTEXT}

Analisis pelanggaran ini: "{USER_INPUT}"

Tentukan nomor PSPP yang paling sesuai dari 39 item PSPP (1-39).

Format jawaban:
KATEGORI PSPP: [nomor 1-39]
CONFIDENCE: [0-100%]
ALASAN: [penjelasan singkat mengapa masuk kategori PSPP tersebut]`
  },

  tbc: {
    id: 'tbc',
    name: 'TBC - To be Concern Hazard',
    color: 'success',
    description: 'Critical concern areas and hazards',
    content: `TO BE CONCERN (TBC) HAZARD:

1. Deviasi pengoperasian kendaraan/unit: Fatigue (yawning, microsleep, closed eyes), melakukan aktivitas lain (headset, handphone, makan, minum, merokok, memberi barang dari/ke unit lain), pengoperasian unit yang tidak layak operasi, unit tidak komunikasi 2 arah, tidak menjaga jarak beriringan unit saat beroperasi, overspeed, melintas pada jalur berlawanan, membawa HP ke dalam unit Hauler dan A2B, jam tidur kurang 6 jam saat verifikasi Fit To Work, seatbelt rusak dari hasil inspeksi, tidak dilakukan pemeriksaan Crack Test Kendaraan Transport, tidak membunyikan klakson maju/mundur, driver tidak speak up self declare, penyiraman tidak putus-putus pada tanjakan dan turunan.

2. Deviasi penggunaan APD: Tidak menggunakan APD yang sesuai/dengan benar/layak, ditemukan kondisi APD yang tidak layak, tidak memasang welding screen saat aktivitas welding.

3. Geotech & Hydrology: Penempatan prasarana pada radius area rawan longsor, retakan, aktivitas penambangan tidak sesuai rekomendasi kajian geoteknik, tidak terdapat kajian geoteknik pada area kerja dengan risiko geoteknik, tidak dilakukan pemantauan kestabilan lereng dan timbunan, terdapat potensi bahaya yang dapat mengakibatkan isu geoteknik/hidrologi di area tambang.

4. Posisi Pekerja pada Area Tidak Aman/Pekerjaan Tidak Sesuai Prosedur: Berada di luar kabin/pos/pondok pada area tambang, berpijak pada tempat yang tidak semestinya, turun dari unit tidak memperhatikan 3 titik tumpu, pekerja berada pada radius manuver unit, berada dalam jarak <1,5x tebing/dinding galian, memasuki area khusus tanpa izin, tidak turun dari unit saat proses penyebrangan, berada pada jarak <6m (tyreman)/<10m (lainnya) saat pemompaan tyre, pekerjaan dilakukan pada area tidak memadai, pengelasan velg tanpa melepas ban unit, pekerja baru <1 tahun bekerja di area high risk.

5. Deviasi Loading/Dumping: Jarak dumping <20m (rawa), <10m (air), 4-5m (kering), dumping menyentuh/menaiki tanggul, undercut, material/dinding galian melebihi tinggi kabin, tidak ada tanggul pengaman pada top loading, batas dumping tidak ada/tidak diupdate.

6. Tidak terdapat pengawas/pengawas tidak memadai: Tidak ada pengawas/spotter/trafficman, pengawas tidak memiliki kompetensi memadai, pengawas tidak melaksanakan SAP, pengawas tidak mengisi checklist aktivitas awal shift, pengawas ikut bekerja atau melakukan pekerjaan.

7. LOTO (Lock Out Tag Out): Tag LOTO pudar/rusak/tidak tersedia, kunci LOTO digantung tanpa dilepas pada gembok, tidak mengisi formulir LOTO.

8. Deviasi Road Management: Akses area yang tidak aktif belum ditutup, jalan shortcut, ketidaksesuaian persimpangan (simpang 5 atau lebih), tanggul area red zone tidak ada/tidak standar, grade jalan >10% tanpa pengendalian, jalan licin pasca hujan sudah digunakan sebelum slippery selesai, tidak ada median pada persimpangan jalan, terdapat jalan blindspot, tidak ada tanggul pengaman, lebar jalan tidak standard tanpa pengendalian, superelevasi terbalik.

9. Kesesuaian Dokumen Kerja: Pekerjaan dilakukan tidak sesuai DOP/tidak ada DOP pekerjaan, pengawas tidak memiliki izin bekerja atau ketidaksesuaian actual di lapangan dengan yang ada pada IKK, tidak membawa ID card/menggunakan ID card orang lain, bekerja tidak mempunyai kompetensi/KIMPER/SIMPER yang sesuai, bekerja di ruang terbatas tanpa izin, bekerja tanpa JSA pekerjaan/tidak disosialisasikan, ketersediaan atau kesesuaian MPRP.

10. Tools Tidak Standard/Penggunaan Tools Tidak Tepat: Tools yang digunakan tidak standard, penggunaan tools tidak sesuai peruntukkan, penggunaan alat angkat pengganti yang tidak sesuai, tidak terdapat pengaman tambahan untuk menahan/menopang kabin unit yang sedang diperbaiki, modifikasi tools tanpa kajian/sertifikasi.

11. Bahaya Elektrikal: Potensi percikan api, tidak ada pengecekan instalasi listrik, tidak ada barikade/penandaan area tegangan tinggi, perbaikan instalasi tanpa memutus aliran listrik, instalasi listrik tidak standar.

12. Bahaya Biologis: Tidak ada identifikasi bahaya biologis, tanaman merambat lebat berpotensi jadi sarang ular, tidak tersedia serum anti bisa ular (SABU) di fasilitas kesehatan, bahaya biologi belum terkendali (pohon kering belum dipotong).

13. Aktivitas Drill and Blast: Akses lokasi peledakan/gudang handak tidak layak, jarak unit bor terlalu dekat dengan MPU/peledakan, tanggul lokasi peledakan tidak standar, permukaan kerja area peledakan tidak keras/kering, tidak ada area parkir drill & blast, area parkir drill & blast tidak standar, tidak ada rambu parkir area drill & blast, tidak ada barikade/safety line pada area drilling, rambu aktivitas pengeboran tidak terpasang, aksesoris peledakan di area peledakan tidak aman, area manuver unit MPU tidak memadai, terdapat lubang panas di area peledakan, jarak lubang ledak ke jalan aktif terlalu dekat, lubang collapse/lumpur/miring, berada di lokasi saat cuaca petir, tidak ada pita batas radius peledakan/sleepblast, tidak ada pondok area sleepblast, lampu flip flop area sleepblast belum ada, rambu aktivitas peledakan/peledakan tidur tidak terpasang, tidak ada rambu/bendera radius aman manusia, aktivitas charging berdekatan dengan front loading, mobilisasi drilling machine tanpa turunkan mast.

14. Technology: Terdapat area/aktivitas kritis tidak tercover CCTV/Mining Eyes, P2H control room DMS/Mining Eyes tidak dilakukan.`,
    promptTemplate: `Berdasarkan konteks TBC Hazard berikut:
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
ALASAN: [penjelasan singkat mengapa masuk kategori TBC tersebut]`
  }
};

export const EXAMPLE_HAZARDS = [
  "Operator tidak menggunakan sabuk pengaman saat mengemudikan excavator",
  "Pekerja memasuki ruang tangki bahan bakar tanpa permit kerja dan pengukuran gas",
  "Teknisi melakukan perbaikan conveyor belt tanpa memasang LOTO",
  "Pekerja mengganti lampu di ketinggian 3 meter tanpa harness",
  "Driver mengoperasikan unit tanpa SIMPER yang valid",
  "Unit hauler melaju dengan kecepatan 45 km/jam di area tambang (batas 35 km/jam)",
  "Pekerja tidak menggunakan safety shoes saat mengoperasikan forklift",
  "Driver terlihat mengantuk dan sering menguap saat mengoperasikan dump truck"
];