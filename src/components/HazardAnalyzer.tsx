import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ApiKeyInput } from '@/components/ApiKeyInput';
import { CategoryBadge } from '@/components/CategoryBadge';
import { ragService, type AnalysisResult } from '@/lib/ragService';
import { useToast } from '@/hooks/use-toast';
import {
  AlertTriangle,
  Search,
  BookOpen,
  MessageSquare,
  Clock,
  Copy,
  RefreshCw,
  Sparkles,
  RotateCcw
} from 'lucide-react';

const DEFAULT_KNOWLEDGE_BASE = `SAFETY GOLDEN RULES BERAU COAL

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
Dilarang mendekat ke area penebangan/penarikan pohon tanpa pengamanan. Wajib memastikan jalur evakuasi jelas dan aman.`;

const DEFAULT_PROMPT = `Berdasarkan konteks Safety Golden Rules berikut:
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
ALASAN: [penjelasan singkat mengapa masuk kategori tersebut]`;

const EXAMPLE_HAZARDS = [
  "Operator tidak menggunakan sabuk pengaman saat mengemudikan excavator",
  "Pekerja memasuki ruang tangki bahan bakar tanpa permit kerja dan pengukuran gas",
  "Teknisi melakukan perbaikan conveyor belt tanpa memasang LOTO",
  "Pekerja mengganti lampu di ketinggian 3 meter tanpa harness",
];

export function HazardAnalyzer() {
  const [hazardDescription, setHazardDescription] = useState('');
  const [knowledgeBase, setKnowledgeBase] = useState(DEFAULT_KNOWLEDGE_BASE);
  const [promptTemplate, setPromptTemplate] = useState(DEFAULT_PROMPT);
  const [apiKey, setApiKey] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  const handleApiKeyChange = (newApiKey: string) => {
    setApiKey(newApiKey);
    ragService.setApiKey(newApiKey);
  };

  const handleAnalyze = async () => {
    if (!apiKey) {
      toast({
        title: 'Error',
        description: 'Please enter your Google AI API key first',
        variant: 'destructive',
      });
      return;
    }

    if (!hazardDescription.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a hazard description',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      ragService.clearKnowledgeBase(); // Clear previous knowledge base
      const analysisResult = await ragService.analyzeHazard(
        hazardDescription,
        knowledgeBase,
        promptTemplate
      );
      setResult(analysisResult);
      toast({
        title: 'Analysis Complete',
        description: `Processing completed in ${analysisResult.processingTime}ms`,
      });
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: 'Analysis Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied',
        description: 'Content copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setHazardDescription('');
    setKnowledgeBase(DEFAULT_KNOWLEDGE_BASE);
    setPromptTemplate(DEFAULT_PROMPT);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-primary rounded-full shadow-elegant">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Safety Hazard RAG Analyzer
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Advanced AI-powered safety hazard categorization using Retrieval Augmented Generation
          </p>
        </div>

        {/* API Key Section */}
        <ApiKeyInput onApiKeyChange={handleApiKeyChange} />

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            {/* Hazard Description */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Hazard Description
                </CardTitle>
                <CardDescription>
                  Describe the safety hazard you want to analyze
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Enter the safety hazard description here..."
                  value={hazardDescription}
                  onChange={(e) => setHazardDescription(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                
                {/* Example buttons */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Quick Examples:</p>
                  <div className="flex flex-wrap gap-2">
                    {EXAMPLE_HAZARDS.map((example, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => setHazardDescription(example)}
                        className="text-xs h-auto py-2 px-3 whitespace-normal text-left"
                      >
                        {example}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Knowledge Base */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-info" />
                  Knowledge Base
                </CardTitle>
                <CardDescription>
                  Safety golden rules (editable)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={knowledgeBase}
                  onChange={(e) => setKnowledgeBase(e.target.value)}
                  rows={8}
                  className="resize-none text-sm"
                />
              </CardContent>
            </Card>

            {/* Custom Prompt */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Analysis Prompt
                </CardTitle>
                <CardDescription>
                  Customize the AI analysis prompt
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={promptTemplate}
                  onChange={(e) => setPromptTemplate(e.target.value)}
                  rows={6}
                  className="resize-none text-sm"
                />
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button 
                onClick={handleAnalyze} 
                disabled={isAnalyzing || !apiKey}
                className="flex-1 bg-gradient-primary shadow-elegant"
                size="lg"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5 mr-2" />
                    Analyze Hazard
                  </>
                )}
              </Button>
              <Button 
                onClick={resetForm}
                variant="outline"
                size="lg"
              >
                <RotateCcw className="h-5 w-5 mr-2" />
                Reset
              </Button>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {result ? (
              <>
                {/* Category Result */}
                <Card className="shadow-card animate-fade-in">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Analysis Result</span>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {result.processingTime}ms
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CategoryBadge 
                      category={result.category} 
                      confidence={result.confidence}
                      className="text-base"
                    />
                    
                    <Separator />
                    
                    <div>
                      <h4 className="font-medium mb-2">Reasoning</h4>
                      <p className="text-sm text-muted-foreground">{result.reasoning}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Retrieved Context */}
                <Card className="shadow-card animate-fade-in">
                  <CardHeader>
                    <CardTitle className="text-lg">Retrieved Context</CardTitle>
                    <CardDescription>
                      Most relevant safety rules found
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {result.retrievedContext.map((chunk, index) => (
                      <div key={index} className="p-3 bg-muted/50 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary">
                            Context {index + 1}
                          </Badge>
                          {chunk.similarity && (
                            <Badge variant="outline">
                              {(chunk.similarity * 100).toFixed(1)}% match
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm leading-relaxed">{chunk.text}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Full Response */}
                <Card className="shadow-card animate-fade-in">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Full AI Response</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(result.fullResponse)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-sm whitespace-pre-wrap bg-muted/50 p-4 rounded-lg overflow-auto">
                      {result.fullResponse}
                    </pre>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="shadow-card">
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center space-y-3">
                    <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                      <Search className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">
                      Enter a hazard description and click "Analyze Hazard" to see results
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}