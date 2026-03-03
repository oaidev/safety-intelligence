

## Plan: Fix Investigation Report JSON Parsing

### Root Cause
Dari log terbaru, error masih terjadi di line 473 (kode lama) — artinya edge function belum terdeploy dengan kode parsing baru. Selain itu, perlu memperkuat client-side fallback sebagai jaring pengaman kedua.

### Perubahan

**File 1: `supabase/functions/generate-investigation-report/index.ts`**

Masalah utama: AI Gemini mengembalikan response dengan wrapper ` ```json ... ``` `. Parsing di server sudah benar di kode saat ini, tapi belum terdeploy. Akan:
- Redeploy edge function
- Tambahkan instruksi eksplisit di prompt agar AI **tidak** mengembalikan markdown code blocks — hanya raw JSON array

Tambahkan di prompt sebelum `{CONTEXT}`:
```
PENTING: Kembalikan HANYA JSON array tanpa markdown code blocks. Jangan gunakan ```json atau ``` pembungkus. Langsung mulai dengan [ dan akhiri dengan ].
```

**File 2: `src/components/InvestigationReportDisplay.tsx`**

Client-side fallback sudah ada tapi perlu diperkuat:
- Tambahkan handling untuk kasus `reportData` berupa string tapi `reportFormat` sudah `'json'` (edge case)
- Pastikan dependency array `useMemo` sections menggunakan `parsedData` bukan `reportData`

**File 3: `src/pages/InvestigationReportGenerator.tsx`**

Di handler SSE `data.report`, tambahkan fallback parsing client-side langsung sebelum `setReportData` — jika `reportFormat === 'text'` tapi `data.report` string yang berisi JSON valid, parse dulu baru set sebagai JSON.

### File yang Diubah

| File | Perubahan |
|------|-----------|
| `supabase/functions/generate-investigation-report/index.ts` | Tambah instruksi prompt "no markdown wrapping" + redeploy |
| `src/components/InvestigationReportDisplay.tsx` | Fix dependency array useMemo |
| `src/pages/InvestigationReportGenerator.tsx` | Tambah fallback JSON parsing di SSE handler sebelum setReportData |

