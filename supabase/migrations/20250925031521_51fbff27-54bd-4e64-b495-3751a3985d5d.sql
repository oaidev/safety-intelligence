-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create knowledge_bases table for storing knowledge base metadata
CREATE TABLE public.knowledge_bases (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create knowledge_base_chunks table for storing text chunks with embeddings
CREATE TABLE public.knowledge_base_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  knowledge_base_id TEXT NOT NULL REFERENCES public.knowledge_bases(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  embedding vector(384), -- bge-small-en-v1.5 produces 384-dimensional embeddings
  chunk_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_knowledge_base_chunks_kb_id ON public.knowledge_base_chunks(knowledge_base_id);
CREATE INDEX idx_knowledge_base_chunks_embedding ON public.knowledge_base_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Insert initial knowledge base configurations
INSERT INTO public.knowledge_bases (id, name, description, color, prompt_template) VALUES
('golden_rules', 'Safety Golden Rules', 'Core safety regulations and procedures', 'info', 'Berdasarkan konteks Safety Golden Rules berikut:
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
ALASAN: [penjelasan singkat mengapa masuk kategori tersebut]'),

('pspp', 'PSPP - Peraturan Sanksi Pelanggaran Prosedur', 'Violation procedures and sanctions', 'warning', 'Berdasarkan konteks PSPP berikut:
{RETRIEVED_CONTEXT}

Analisis pelanggaran ini: "{USER_INPUT}"

Tentukan nomor PSPP yang paling sesuai dari 39 item PSPP (1-39).

Format jawaban:
KATEGORI PSPP: [nomor 1-39]
CONFIDENCE: [0-100%]
ALASAN: [penjelasan singkat mengapa masuk kategori PSPP tersebut]'),

('tbc', 'TBC - To be Concern Hazard', 'Critical concern areas and hazards', 'success', 'Berdasarkan konteks TBC Hazard berikut:
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
ALASAN: [penjelasan singkat mengapa masuk kategori TBC tersebut]');

-- Enable Row Level Security
ALTER TABLE public.knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_chunks ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (these are public knowledge bases)
CREATE POLICY "Knowledge bases are publicly viewable" 
ON public.knowledge_bases 
FOR SELECT 
USING (true);

CREATE POLICY "Knowledge base chunks are publicly viewable" 
ON public.knowledge_base_chunks 
FOR SELECT 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_knowledge_bases_updated_at
BEFORE UPDATE ON public.knowledge_bases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();