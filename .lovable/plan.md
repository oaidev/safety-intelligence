

## Plan: Maksimalkan Limit Upload Berdasarkan Gemini API

Berdasarkan limit terbaru Gemini API (Jan 2026): inline data hingga **100MB**, video hingga **2GB** via Files API.

### Limit Saat Ini vs Limit Baru

| Tipe | Saat Ini | Baru | Referensi |
|------|----------|------|-----------|
| Audio | 100MB | **100MB** (tetap) | Gemini inline limit |
| Foto | 10MB | **100MB** | Gemini inline limit |
| Dokumen | 50MB | **100MB** | Gemini inline limit |
| Video | 20MB | **100MB** | Gemini inline limit |

Video bisa sampai 2GB via Files API, tapi karena edge function memproses inline (base64), limit praktis tetap 100MB.

### Perubahan

**File 1:** `src/components/InvestigationMultiInputForm.tsx`
- Foto: `10MB` → `100MB`
- Dokumen: `50MB` → `100MB`
- Video: `20MB` → `100MB`

**File 2:** `src/components/InvestigationInputForm.tsx`
- Foto: `20MB` → `100MB`

**File 3:** `src/pages/InvestigationReportGenerator.tsx`
- Payload limit: `50MB` → `200MB` (agar bisa menampung beberapa file besar sekaligus)
- Update pesan error sesuai limit baru

**File 4:** `src/components/AudioUploadStep.tsx`
- Sudah 100MB, tidak perlu diubah

Total: 3 file diubah, 6 nilai limit diperbarui.

