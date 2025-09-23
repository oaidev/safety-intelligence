import { cn } from "@/lib/utils";

interface CategoryBadgeProps {
  category: string;
  confidence?: string;
  className?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Kelayakan Kendaraan & Unit': 'bg-category-vehicle text-white',
  'Pengoperasian Kendaraan & Unit': 'bg-category-operation text-white',
  'Lock Out & Tag Out': 'bg-category-loto text-white',
  'Keselamatan Bekerja Di Ketinggian': 'bg-category-height text-white',
  'Keselamatan Bekerja Di Ruang Terbatas': 'bg-category-confined text-white',
  'Keselamatan Alat Angkat & Angkut': 'bg-category-lifting text-white',
  'Bekerja Di Dekat Tebing Atau Dinding Galian': 'bg-category-excavation text-white',
  'Bekerja Pada Area Peledakan': 'bg-category-blasting text-white',
  'Bekerja Di Dekat Air': 'bg-category-water text-white',
  'Bekerja Di Disposal': 'bg-category-disposal text-white',
  'Bekerja Pada Area Pembersihan Lahan': 'bg-category-clearing text-white',
  'Tidak Melanggar Golden Rules': 'bg-category-safe text-white',
  'Unknown': 'bg-muted text-muted-foreground',
};

export function CategoryBadge({ category, confidence, className }: CategoryBadgeProps) {
  const colorClass = CATEGORY_COLORS[category] || CATEGORY_COLORS['Unknown'];
  
  return (
    <div className={cn("category-badge inline-flex items-center gap-2", colorClass, className)}>
      <span className="font-semibold">{category}</span>
      {confidence && (
        <span className="text-xs opacity-90 bg-white/20 px-2 py-0.5 rounded-full">
          {confidence}
        </span>
      )}
    </div>
  );
}