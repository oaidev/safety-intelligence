

## Plan: Fix Toast Non-Teknis & Robust JSON Parsing

### Masalah 1: Toast sukses masih teknikal
Baris 496-499 di `InvestigationReportGenerator.tsx`:
```
title: 'Report generated!'
description: 'Investigation report with video analysis and PDF OCR complete'
```
Harus diganti ke bahasa non-teknis.

### Masalah 2: Output AI kadang tampil sebagai raw JSON (bukan table)
Dari screenshot user, terlihat output ditampilkan sebagai teks `\`\`\`json [...]` — bukan tabel.

**Root cause**: Di edge function (baris 536-567), parsing JSON bisa gagal jika:
- AI output truncated (bracket tidak lengkap)
- Format markdown tidak match regex

Ketika parsing gagal, `reportFormat` jadi `'text'` dan raw JSON ditampilkan apa adanya.

**Fix**: Tambahkan fallback JSON parsing di **client-side** (`InvestigationReportDisplay.tsx`). Jika `reportFormat === 'text'` tapi isi `reportData` terdeteksi sebagai JSON array valid, parse dan tampilkan sebagai tabel.

### Masalah 3: SSE progress messages dari server masih teknikal
Beberapa `onProgress` messages di edge function masih menyebut "OCR PDF", "via Vision", dll. Ini ditampilkan ke user via `addThinkingMessage(data.message)` (baris 430).

### Perubahan

**File 1:** `src/pages/InvestigationReportGenerator.tsx`

| Baris | Sebelum | Sesudah |
|-------|---------|---------|
| 497-498 | `title: 'Report generated!'` + `description: '...video analysis and PDF OCR complete'` | `title: 'Laporan berhasil dibuat!'` + `description: 'Laporan investigasi siap untuk ditinjau'` |

**File 2:** `src/components/InvestigationReportDisplay.tsx`

Tambahkan logic di awal component untuk mendeteksi dan memperbaiki kasus ketika `reportFormat === 'text'` tapi `reportData` sebenarnya adalah JSON string yang bisa di-parse:

```typescript
// Di dalam component, sebelum render
const { parsedData, effectiveFormat } = useMemo(() => {
  if (reportFormat === 'json' && Array.isArray(reportData)) {
    return { parsedData: reportData, effectiveFormat: 'json' as const };
  }
  
  // Fallback: try to parse text as JSON if it looks like JSON
  if (typeof reportData === 'string') {
    try {
      let jsonStr = reportData.trim();
      // Remove markdown code blocks
      const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();
      // Find JSON array
      const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
      if (arrayMatch) jsonStr = arrayMatch[0];
      
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].Section) {
        return { parsedData: parsed, effectiveFormat: 'json' as const };
      }
    } catch {}
  }
  
  return { parsedData: reportData, effectiveFormat: reportFormat };
}, [reportData, reportFormat]);
```

Lalu gunakan `parsedData` dan `effectiveFormat` sebagai pengganti `reportData` dan `reportFormat` di seluruh render.

**File 3:** `supabase/functions/generate-investigation-report/index.ts`

Sederhanakan SSE progress messages:

| Baris | Sebelum | Sesudah |
|-------|---------|---------|
| 252 | `OCR PDF: ${doc.name}...` | `Membaca ${doc.name}...` |
| 293 | `Selesai OCR ${doc.name}` | `Selesai membaca ${doc.name}` |
| 414 | `Menyiapkan context untuk AI...` | `Menyiapkan analisis...` |
| 472 | `Menyertakan ${n} gambar untuk analisis visual...` | `Memproses ${n} gambar...` |
| 489 | `AI menganalisis dan menyusun laporan investigasi...` | `Menyusun laporan investigasi...` |

### Juga perbaiki JSON parsing di edge function (baris 536-567)

Tambahkan recovery untuk truncated JSON — coba perbaiki bracket yang tidak lengkap:

```typescript
// After initial parse fails, try to fix truncated JSON
let jsonString = reportText.trim();
// ... existing cleanup ...
try {
  reportData = JSON.parse(jsonString);
} catch {
  // Try to fix truncated JSON by closing open brackets
  const fixedJson = fixTruncatedJson(jsonString);
  reportData = JSON.parse(fixedJson);
}
```

### File yang Diubah

| File | Perubahan |
|------|-----------|
| `src/pages/InvestigationReportGenerator.tsx` | Toast sukses non-teknis |
| `src/components/InvestigationReportDisplay.tsx` | Client-side fallback JSON parsing |
| `supabase/functions/generate-investigation-report/index.ts` | SSE messages non-teknis + robust JSON parsing dengan truncation recovery |

