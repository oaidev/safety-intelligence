import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Upload, RotateCcw, Send, Building2, X, Eye, MapPin, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SimilarityCheckDialog } from '@/components/SimilarityCheckDialog';
import { similarityDetectionService, type SimilarHazardData } from '@/lib/similarityDetectionService';
import { ThinkingProcess } from '@/components/ThinkingProcessViewer';

// Form schema
const hazardFormSchema = z.object({
  reporterName: z.string().min(1, 'Nama wajib diisi'),
  reporterPosition: z.string().min(1, 'Posisi/Jabatan wajib diisi'),
  observationTool: z.string().min(1, 'Tools Pengamatan wajib dipilih'),
  site: z.string().min(1, 'Site wajib dipilih'),
  location: z.string().min(1, 'Lokasi wajib dipilih'),
  detailLocation: z.string().min(1, 'Detail Lokasi wajib dipilih'),
  locationDescription: z.string().min(1, 'Keterangan Lokasi wajib diisi'),
  areaPjaBC: z.string().min(1, 'Area PJA BC wajib dipilih'),
  areaPjaMitra: z.string().min(1, 'Area PJA Mitra wajib dipilih'),
  nonCompliance: z.string().min(1, 'Ketidaksesuaian wajib dipilih'),
  subNonCompliance: z.string().min(1, 'Sub Ketidaksesuaian wajib dipilih'),
  quickAction: z.string().min(1, 'Quick Action wajib dipilih'),
  findingDescription: z.string().min(10, 'Deskripsi Temuan minimal 10 karakter'),
  latitude: z.string()
    .min(1, 'Latitude wajib diisi')
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= -90 && num <= 90;
    }, 'Latitude harus antara -90 dan 90'),
  longitude: z.string()
    .min(1, 'Longitude wajib diisi')
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= -180 && num <= 180;
    }, 'Longitude harus antara -180 dan 180'),
});

type HazardFormData = z.infer<typeof hazardFormSchema>;

interface ComprehensiveHazardFormProps {
  onSubmit: (data: { description: string; formData: HazardFormData & { uploadedImage?: string } }) => void;
  isSubmitting?: boolean;
  compact?: boolean;
}

// Dropdown options
const observationTools = [
  'Coaching - Interaksi Langsung',
  'Coaching - Pertemuan Virtual', 
  'Compliance Assessment',
  'Pengawasan Langsung',
  'Post Event - BeGesit',
  'Post Event - CCTV Portable',
  'Post Event - CCTV Support',
  'Post Event - DMS',
  'Post Event - Drone'
];

const sites = ['BMO 1'];

const locations = [
  '(B 56) Area Kritis B 56',
  '(B 56) Area Transportasi',
  '(B 56) Office B 56',
  '(B 56) Pit QSV',
  '(B 56) Pit QSV 3',
  '(B 56) PIT QSV N',
  '(B PMO) Area Kritis',
  '(B PMO) Area Transportasi',
  '(B PMO) Beaching Point'
];

const detailLocations = [
  'Disposal Rawa QSV 3 FAD',
  'Dumping Di Dekat Air QSV 3 FAD',
  'Dumping Di Dekat Air QSV N FAD',
  'Loading Solu QSV 3 FAD'
];

const areaPjaBC = [
  'PJA Coal Hauling & Coal Getting BMO - PMO',
  'PJA BMO 1 BC',
  'Inspektor Mining BC BMO 1',
  'PJA PIT QSV BC BMO 1'
];

const areaPjaMitra = [
  'PJA Coal Hauling & Coal Getting FAD',
  'PJA HRM (Coal Getting & Hauling) KDC'
];

// Cascading dropdown data structure (sorted alphabetically)
const nonComplianceData = {
  'APD': [
    'Tidak menggunakan APD',
    'Mematikan pelindung, sistem alarm atau alat pelindung',
    'Melepas pelindung, sistem alarm atau alat pelindung peralatan pelindung diri tidak tersedia',
    'Cara Penggunaan APD',
    'Kesesuaian dan Kelayakan APD'
  ],
  'Bahaya Biologi': [
    'Terdapat tanaman merambat yang lebat di area kerja yang berpotensi menjadi sarang ular'
  ],
  'Bahaya Eletrikal': [
    'Pengamanan peralatan listrik'
  ],
  'DDP : Bekerja di Dekat Air': [
    'Bekerja tidak sesuai kompetensi'
  ],
  'DDP : Kelayakan dan Pengoperasian Kendaraan / Unit': [
    'Tidak menggunakan APD sesuai standard'
  ],
  'External Issue': [
    'External Issue'
  ],
  'Fasilitas Gudang Handak': [
    'Perawatan tanggul tidak dilakukan'
  ],
  'Fasilitas WMP': [
    '[ENV] Sedimentasi tinggi pada kompartemen settling pond'
  ],
  'Fasilitas Workshop': [
    '[ENV] Saluran Air/Drainase untuk fasilitas workshop tersumbat'
  ],
  'In Cabin Camera': [
    'Tidak dilakukan follow up abnormal aktivitas yang terekam',
    'Terekam abnormal aktivitas'
  ],
  'Kelayakan/Penggunaan Tools': [
    'Kesesuaian penggunaan Supporting Tools'
  ],
  'Kelengkapan tanggap darurat': [
    'Alat Tanggap Darurat Belum dilakukan Inspeksi',
    'Fire Apparatus',
    'Eye Wash'
  ],
  'Kondisi Kendaraan/unit': [
    'Kelayakan Kendaraan/Unit'
  ],
  'Pembelian, Penanganan bahan dan kendali bahan': [
    'Penyimpanan bahan dengan tidak tepat'
  ],
  'Pelanggaran bekerja di ketinggian': [
    'Bekerja tanpa safety body harness',
    'Penggunaan safety body harness tidak double lanyard'
  ],
  'Pelanggaran Dumping di Disposal': [
    'Karyawan tidur di area disposal',
    'Tidak ada bendera batas dumping',
    'Bendera Batas Dumping tidak di update',
    'Tidak terdapat pita batas penimbunan',
    'Dumping melewati bibir tebing (crest line)',
    'Overdump'
  ],
  'Pelanggaran OB Removal atau Coal Getting': [
    'Top Loading tanpa tanggul belakang HD',
    'Terdapat unit parkir di dekat tebing (kurang dari 1,5 tinggi tebing)'
  ],
  'Pengawasan': [
    'Tidak mengisi Form/Checklist',
    'Kompetensi Pengawas (Tidak memiliki kartu kompetensi)',
    'Tidak ada pengawas',
    'Ketidak sesuaian dengan Plan (e.g DOP, Design, dll.)',
    'Pengawas Pekerjaan yang tidak memadai',
    'Pengawas berada di luar kabin atau pos pengawas di area Pit',
    'Tidak Ada Traffic Man Yang Mengatur Lalu Lintas',
    'Tanggung jawab tidak memadai',
    'Bahaya di tempat kerja/ bahaya kerja tidak dikenali secara memadai'
  ],
  'Pengelolaan Sampah': [
    '[ENV] Sampah dibuang tidak pada tempat sampah'
  ],
  'Pengoperasian Kendaraan / unit': [
    'Over speed',
    'Melanggar rambu lalu lintas tambang',
    'Fatigue',
    'Jarak Tidak Aman',
    'Pengoperasian Tanpa License (SIMPER Tidak Ada, SIMPER Expired)',
    'Pengoperasian Tanpa Sabuk Pengaman',
    'Melakukan kegiatan lain saat mengoperasikan unit',
    'Komunikasi 2 arah',
    'Membiarkan engine menyala',
    'Tidak ada SKO / SKO Expired',
    'Meninggalkan kunci kontak di unit/kendaraan pada saat parkir',
    'Melakukan kegiatan makan/minum',
    'Melintas pada Jalur Berlawanan'
  ],
  'Perawatan Jalan': [
    'Boulder'
  ],
  'Perlengkapan_Mesin_atau_Peralatan': [
    'Pelepasan komponen-komponen yang tidak memadai atau penggantian komponen-komponen yang tidak sesuai',
    'Penyesuaian/ perbaikan/ pemeliharaan yang tidak memadai',
    'Ketersediaan alat tidak memadai'
  ],
  'Rambu': [
    'Posisi Rambu tidak sesuai'
  ],
  'Standar Road Management': [
    'Drainase tersumbat pada jalan angkut',
    'Terdapat undulating di sepanjang jalan angkut'
  ]
};

const nonComplianceTypes = Object.keys(nonComplianceData);

const quickActions = [
  'Atur kecepatan dan jarak',
  'Coaching',
  'Fatigue Test',
  'Komunikasi 2 arah',
  'Parkir Fatigue',
  'Pekerjaan dilanjutkan setelah perbaikan langsung',
  'STOP Pekerjaan',
  'STOP pekerjaan sampai temuan diperbaiki',
  'Tidak diperlukan intervensi'
];

export function ComprehensiveHazardForm({ onSubmit, isSubmitting = false, compact = false }: ComprehensiveHazardFormProps) {
  const { toast } = useToast();
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [similarityDialogOpen, setSimilarityDialogOpen] = useState(false);
  const [similarHazards, setSimilarHazards] = useState<SimilarHazardData[]>([]);
  const [similarityThinkingProcess, setSimilarityThinkingProcess] = useState<ThinkingProcess | undefined>();
  const [pendingSubmissionData, setPendingSubmissionData] = useState<any>(null);

  const form = useForm<HazardFormData>({
    resolver: zodResolver(hazardFormSchema),
    defaultValues: {
      reporterName: '',
      reporterPosition: '',
      observationTool: '',
      site: '',
      location: '',
      detailLocation: '',
      locationDescription: '',
      areaPjaBC: '',
      areaPjaMitra: '',
      nonCompliance: '',
      subNonCompliance: '',
      quickAction: '',
      findingDescription: '',
      latitude: '2.0194521',  // Default to Berau Coal Binungan
      longitude: '117.6183817',
    },
  });

  // Load form data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('hazard-form-data');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        form.reset(parsedData);
      } catch (error) {
        console.error('Error loading saved form data:', error);
      }
    }
  }, [form]);

  // Clean up object URLs when component unmounts or files change
  useEffect(() => {
    const urls = uploadedFiles.map(file => URL.createObjectURL(file));
    setImageUrls(urls);
    
    return () => {
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [uploadedFiles]);

  const handleFormSubmit = async (data: HazardFormData) => {
    console.log('[ComprehensiveHazardForm] Starting similarity check for data:', data);
    
    // Check for similar hazards before submission
    const { similarHazards: foundHazards, thinkingProcess } = await similarityDetectionService.checkSimilarHazards({
      location: data.location,
      detail_location: data.detailLocation,
      location_description: data.locationDescription,
      non_compliance: data.nonCompliance,
      sub_non_compliance: data.subNonCompliance,
      finding_description: data.findingDescription,
      latitude: data.latitude,
      longitude: data.longitude,
    });

    console.log('[ComprehensiveHazardForm] Found similar hazards:', foundHazards);

    if (foundHazards.length > 0) {
      console.log('[ComprehensiveHazardForm] Opening similarity dialog with', foundHazards.length, 'similar hazards');
      setSimilarHazards(foundHazards);
      setSimilarityThinkingProcess(thinkingProcess);
      setPendingSubmissionData(data);
      setSimilarityDialogOpen(true);
    } else {
      console.log('[ComprehensiveHazardForm] No similar hazards found, proceeding with submission');
      await submitForm(data, false);
    }
  };

  const submitForm = async (data: HazardFormData, markAsDuplicate = false) => {
    // Convert uploaded files to base64
    let uploadedImage = undefined;
    if (uploadedFiles.length > 0) {
      const file = uploadedFiles[0];
      const base64 = await convertFileToBase64(file);
      uploadedImage = base64;
    }

    // Combine critical fields for RAG analysis
    const combinedDescription = `
Ketidaksesuaian: ${data.nonCompliance}
Sub Ketidaksesuaian: ${data.subNonCompliance}
Deskripsi Temuan: ${data.findingDescription}
Keterangan Lokasi: ${data.locationDescription}
    `.trim();

    const formDataWithLocationAndStatus = { 
      ...data, 
      uploadedImage,
      isDuplicate: markAsDuplicate
    };

    onSubmit({
      description: combinedDescription,
      formData: formDataWithLocationAndStatus
    });
  };

  const handleContinueSubmission = async () => {
    if (pendingSubmissionData) {
      await submitForm(pendingSubmissionData, false);
      setSimilarityDialogOpen(false);
      setPendingSubmissionData(null);
    }
  };

  const handleEditForm = () => {
    setSimilarityDialogOpen(false);
    setPendingSubmissionData(null);
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:image/jpeg;base64, prefix
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleReset = () => {
    form.reset();
    // Clean up object URLs before clearing files
    imageUrls.forEach(url => URL.revokeObjectURL(url));
    setUploadedFiles([]);
    setImageUrls([]);
    localStorage.removeItem('hazard-form-data');
    toast({
      title: 'Form Reset',
      description: 'Semua data form telah dihapus'
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const handleDeleteFile = (index: number) => {
    // Revoke the URL for the deleted file
    if (imageUrls[index]) {
      URL.revokeObjectURL(imageUrls[index]);
    }
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Top Row - Reporter, Observation, PJA */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Reporter Section */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Reporter
                </CardTitle>
                <CardDescription>
                  Informasi pelapor
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="reporterName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama</FormLabel>
                      <FormControl>
                        <Input placeholder="Masukkan nama pelapor" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reporterPosition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Posisi/Jabatan</FormLabel>
                      <FormControl>
                        <Input placeholder="Masukkan posisi/jabatan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Observation Details */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Detail Observasi</CardTitle>
                <CardDescription>
                  Informasi lokasi dan metode observasi
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="observationTool"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tools Pengamatan</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih tools pengamatan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {observationTools.map((tool) => (
                            <SelectItem key={tool} value={tool}>
                              {tool}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="site"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih site" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sites.map((site) => (
                            <SelectItem key={site} value={site}>
                              {site}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lokasi</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih lokasi" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locations.map((location) => (
                            <SelectItem key={location} value={location}>
                              {location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="detailLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Detail Lokasi</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih detail lokasi" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {detailLocations.map((detail) => (
                            <SelectItem key={detail} value={detail}>
                              {detail}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                 />
                 
                 {/* Location Description Field */}
                 <FormField
                   control={form.control}
                   name="locationDescription"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Keterangan Lokasi</FormLabel>
                       <FormControl>
                         <Textarea 
                           placeholder="Masukkan keterangan lokasi yang lebih spesifik"
                           className="min-h-[80px]"
                           {...field}
                         />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
                 
                 {/* Location Pinpoint Section */}
                <div className="border rounded-lg p-4 bg-muted/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <Label className="text-sm font-medium">Pin Point Lokasi</Label>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`https://www.google.com/maps/place/Berau+Coal+Binungan/@${form.getValues('latitude')},${form.getValues('longitude')},17z`, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Buka Maps
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="latitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Latitude</FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              type="number"
                              step="any"
                              min="-90"
                              max="90"
                              placeholder="Contoh: 2.0194521" 
                              className="text-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="longitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Longitude</FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              type="number"
                              step="any"
                              min="-180"
                              max="180"
                              placeholder="Contoh: 117.6183817" 
                              className="text-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Default: Berau Coal Binungan. Anda dapat mencari koordinat di Google Maps dan memasukkannya di sini.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* PJA Assignment */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  PJA Assignment
                </CardTitle>
                <CardDescription>
                  Area PJA dan penugasan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="areaPjaBC"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Area PJA BC</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih area PJA BC" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {areaPjaBC.map((area) => (
                            <SelectItem key={area} value={area}>
                              {area}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="areaPjaMitra"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Area PJA Mitra Kerja</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih area PJA mitra" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {areaPjaMitra.map((area) => (
                            <SelectItem key={area} value={area}>
                              {area}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* Findings Section */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Temuan</CardTitle>
              <CardDescription>
                Detail temuan dan tindakan yang diperlukan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Photo Upload */}
              <div className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label htmlFor="photo-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Unggah Foto</span> atau drag & drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG hingga 10MB
                    </p>
                  </label>
                </div>

                {/* Image Previews */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Foto yang diunggah ({uploadedFiles.length})</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                            <img
                              src={imageUrls[index]}
                              alt={`Upload ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                window.open(imageUrls[index], '_blank');
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              className="h-8 w-8 p-0"
                              onClick={() => handleDeleteFile(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2 truncate">
                            {file.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>


              {/* Form fields in two columns */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="nonCompliance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ketidaksesuaian</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Reset sub ketidaksesuaian when main category changes
                            form.setValue('subNonCompliance', '');
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Pilih Ketidaksesuaian" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-background border border-border z-50">
                            {nonComplianceTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="subNonCompliance"
                    render={({ field }) => {
                      const selectedMainCategory = form.watch('nonCompliance');
                      const subOptions = selectedMainCategory ? nonComplianceData[selectedMainCategory as keyof typeof nonComplianceData] || [] : [];
                      const isDisabled = !selectedMainCategory;
                      
                      return (
                        <FormItem>
                          <FormLabel>Sub Ketidaksesuaian</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={isDisabled}
                          >
                            <FormControl>
                              <SelectTrigger className={`bg-background ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <SelectValue 
                                  placeholder={
                                    isDisabled 
                                      ? "Pilih Ketidaksesuaian terlebih dahulu" 
                                      : "Pilih Sub Ketidaksesuaian"
                                  } 
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-background border border-border z-50">
                              {subOptions.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="quickAction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quick Action</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih quick action" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {quickActions.map((action) => (
                              <SelectItem key={action} value={action}>
                                {action}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Finding Description */}
              <FormField
                control={form.control}
                name="findingDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deskripsi Temuan</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Jelaskan detail temuan keselamatan..."
                        className="min-h-[120px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isSubmitting}
              className="flex-1"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Mengirim...' : 'Kirim Laporan Hazard'}
            </Button>
          </div>
        </form>
      </Form>
      
      {/* Similarity Check Dialog */}
      <SimilarityCheckDialog
        open={similarityDialogOpen}
        onOpenChange={setSimilarityDialogOpen}
        similarHazards={similarHazards}
        thinkingProcess={similarityThinkingProcess}
        onContinueSubmission={handleContinueSubmission}
        onEditForm={handleEditForm}
      />
    </div>
  );
}