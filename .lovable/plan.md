

## Plan: Hapus Detail Teknis dari Thinking Messages

### Masalah
Saat AI menganalisis, user melihat pesan teknis seperti:
- "Menggunakan Whisper lokal untuk Audio.aac..."
- "Mengekstrak teks dari DOCX: file.docx..."
- "PDF akan diproses via OCR server: file.pdf..."
- "Mengompresi dan menyiapkan foto bukti..."

Ini melanggar prinsip **hide technical complexity** — user tidak perlu tahu teknologi yang dipakai.

### Perubahan

**File:** `src/pages/InvestigationReportGenerator.tsx`

Ganti semua `addThinkingMessage` yang menyebut teknologi menjadi pesan sederhana:

| Baris | Sebelum | Sesudah |
|-------|---------|---------|
| 177 | `Memulai transkripsi audio interview...` | `Memproses audio interview...` |
| 195 | `Menggunakan Whisper lokal untuk ${file.name}...` | `Memproses ${file.name}...` |
| 227 | `Mengekstrak konten dokumen...` | `Membaca dokumen...` |
| 247 | `Mengekstrak teks dari DOCX: ${file.name}...` | `Membaca ${file.name}...` |
| 258 | `Mengekstrak data dari Excel: ${file.name}...` | `Membaca ${file.name}...` |
| 264 | `PDF akan diproses via OCR server: ${file.name}...` | `Membaca ${file.name}...` |
| 298 | `Mengompresi dan menyiapkan foto bukti...` | `Menyiapkan foto bukti...` |
| 339 | `Menyiapkan video: ${file.name}...` | `Memproses video ${file.name}...` |
| 357 | `Mengirim data ke AI untuk analisis komprehensif...` | `Menganalisis seluruh bukti...` |

Total: **9 pesan** diubah menjadi bahasa non-teknis.

### File yang Diubah

| File | Perubahan |
|------|-----------|
| `src/pages/InvestigationReportGenerator.tsx` | 9 string thinking message disederhanakan |

