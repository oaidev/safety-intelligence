

## Plan: Ubah Fungsi Button "Salin" ke Copy JSON

### Perubahan

**File:** `src/components/InvestigationReportDisplay.tsx`

Ubah handler `copyToClipboard` agar meng-copy JSON format (`JSON.stringify(reportData, null, 2)`) alih-alih raw text/reportRaw.

**Sebelum:**
```typescript
const copyToClipboard = () => {
  const content = reportRaw || (typeof reportData === 'string' ? reportData : JSON.stringify(reportData, null, 2));
  navigator.clipboard.writeText(content);
  ...
};
```

**Sesudah:**
```typescript
const copyToClipboard = () => {
  const content = Array.isArray(reportData) 
    ? JSON.stringify(reportData, null, 2) 
    : (typeof reportData === 'string' ? reportData : JSON.stringify(reportData, null, 2));
  navigator.clipboard.writeText(content);
  ...
};
```

Prioritaskan JSON format ketika `reportData` adalah array (format structured), sehingga user selalu mendapat JSON standard saat klik "Salin".

### File yang Diubah

| File | Perubahan |
|------|-----------|
| `src/components/InvestigationReportDisplay.tsx` | Ubah `copyToClipboard` agar copy JSON |

