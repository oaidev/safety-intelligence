import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AlertTriangle, Upload, RotateCcw, Send, Building2, X, MapPin } from 'lucide-react';
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
      latitude: '2.0194521',
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
    let uploadedImage = undefined;
    if (uploadedFiles.length > 0) {
      const file = uploadedFiles[0];
      const base64 = await convertFileToBase64(file);
      uploadedImage = base64;
    }

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
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleReset = () => {
    form.reset();
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
    if (imageUrls[index]) {
      URL.revokeObjectURL(imageUrls[index]);
    }
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Compact mode styling
  const labelSize = compact ? 'text-xs' : 'text-sm';
  const inputSize = compact ? 'h-8 text-sm' : '';
  const textareaSize = compact ? 'min-h-[60px] text-sm' : 'min-h-[80px]';
  const gapSize = compact ? 'gap-3' : 'gap-4';
  const spaceSize = compact ? 'space-y-2' : 'space-y-4';

  return (
    <div className={compact ? 'space-y-3' : 'space-y-6'}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className={compact ? 'space-y-3' : 'space-y-6'}>
          {/* 2-Column Balanced Layout */}
          <div className={`grid grid-cols-1 xl:grid-cols-2 ${gapSize}`}>
            
            {/* LEFT COLUMN: Reporter + PJA + Photo Upload */}
            <div className={compact ? 'space-y-3' : 'space-y-4'}>
              {/* Reporter Section */}
              <Card className="shadow-card">
                <CardHeader className={compact ? 'py-3 px-4' : ''}>
                  <CardTitle className={`flex items-center gap-2 ${compact ? 'text-sm' : ''}`}>
                    <AlertTriangle className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
                    Reporter
                  </CardTitle>
                </CardHeader>
                <CardContent className={`${spaceSize} ${compact ? 'pt-0' : ''}`}>
                  <div className={`grid grid-cols-2 ${gapSize}`}>
                    <FormField
                      control={form.control}
                      name="reporterName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelSize}>Nama</FormLabel>
                          <FormControl>
                            <Input placeholder="Nama pelapor" className={inputSize} {...field} />
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
                          <FormLabel className={labelSize}>Posisi</FormLabel>
                          <FormControl>
                            <Input placeholder="Posisi/jabatan" className={inputSize} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* PJA Assignment */}
              <Card className="shadow-card">
                <CardHeader className={compact ? 'py-3 px-4' : ''}>
                  <CardTitle className={`flex items-center gap-2 ${compact ? 'text-sm' : ''}`}>
                    <Building2 className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
                    PJA Assignment
                  </CardTitle>
                </CardHeader>
                <CardContent className={`${spaceSize} ${compact ? 'pt-0' : ''}`}>
                  <FormField
                    control={form.control}
                    name="areaPjaBC"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelSize}>Area PJA BC</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className={inputSize}>
                              <SelectValue placeholder="Pilih PJA BC" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-background border border-border z-50">
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
                        <FormLabel className={labelSize}>Area PJA Mitra</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className={inputSize}>
                              <SelectValue placeholder="Pilih PJA Mitra" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-background border border-border z-50">
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

              {/* Photo Upload */}
              <Card className="shadow-card">
                <CardHeader className={compact ? 'py-3 px-4' : ''}>
                  <CardTitle className={compact ? 'text-sm' : ''}>Foto Bukti</CardTitle>
                </CardHeader>
                <CardContent className={compact ? 'pt-0' : ''}>
                  <div className={`border-2 border-dashed border-muted-foreground/25 rounded-lg ${compact ? 'p-3' : 'p-6'} text-center`}>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="photo-upload"
                    />
                    <label htmlFor="photo-upload" className="cursor-pointer">
                      <Upload className={`${compact ? 'h-5 w-5' : 'h-8 w-8'} mx-auto mb-1 text-muted-foreground`} />
                      <p className={`${compact ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                        <span className="font-medium">Unggah Foto</span>
                      </p>
                    </label>
                  </div>
                  {uploadedFiles.length > 0 && (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="relative group aspect-square">
                          <img
                            src={imageUrls[index]}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-full object-cover rounded border"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="absolute top-1 right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                            onClick={() => handleDeleteFile(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN: Detail Observasi + Temuan */}
            <div className={compact ? 'space-y-3' : 'space-y-4'}>
              {/* Observation Details */}
              <Card className="shadow-card">
                <CardHeader className={compact ? 'py-3 px-4' : ''}>
                  <CardTitle className={compact ? 'text-sm' : ''}>Detail Observasi</CardTitle>
                </CardHeader>
                <CardContent className={`${spaceSize} ${compact ? 'pt-0' : ''}`}>
                  {/* Row 1: Tools + Site */}
                  <div className={`grid grid-cols-2 ${gapSize}`}>
                    <FormField
                      control={form.control}
                      name="observationTool"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelSize}>Tools</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className={inputSize}>
                                <SelectValue placeholder="Pilih tools" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-background border border-border z-50">
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
                          <FormLabel className={labelSize}>Site</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className={inputSize}>
                                <SelectValue placeholder="Pilih site" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-background border border-border z-50">
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
                  </div>

                  {/* Row 2: Lokasi + Detail Lokasi */}
                  <div className={`grid grid-cols-2 ${gapSize}`}>
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelSize}>Lokasi</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className={inputSize}>
                                <SelectValue placeholder="Pilih lokasi" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-background border border-border z-50">
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
                          <FormLabel className={labelSize}>Detail Lokasi</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className={inputSize}>
                                <SelectValue placeholder="Pilih detail" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-background border border-border z-50">
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
                  </div>

                  {/* Keterangan Lokasi */}
                  <FormField
                    control={form.control}
                    name="locationDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelSize}>Keterangan Lokasi</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Keterangan lokasi spesifik"
                            className={textareaSize}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* GPS Inline */}
                  <div className={`flex items-end ${gapSize}`}>
                    <FormField
                      control={form.control}
                      name="latitude"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className={labelSize}>Lat</FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              type="number"
                              step="any"
                              placeholder="2.0194521"
                              className={inputSize}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="longitude"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className={labelSize}>Long</FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              type="number"
                              step="any"
                              placeholder="117.6183817"
                              className={inputSize}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size={compact ? 'sm' : 'default'}
                      className={compact ? 'h-8' : ''}
                      onClick={() => window.open(`https://www.google.com/maps/place/@${form.getValues('latitude')},${form.getValues('longitude')},17z`, '_blank')}
                    >
                      <MapPin className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Temuan */}
              <Card className="shadow-card">
                <CardHeader className={compact ? 'py-3 px-4' : ''}>
                  <CardTitle className={compact ? 'text-sm' : ''}>Temuan</CardTitle>
                </CardHeader>
                <CardContent className={`${spaceSize} ${compact ? 'pt-0' : ''}`}>
                  {/* Row: Ketidaksesuaian + Sub */}
                  <div className={`grid grid-cols-2 ${gapSize}`}>
                    <FormField
                      control={form.control}
                      name="nonCompliance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelSize}>Ketidaksesuaian</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              form.setValue('subNonCompliance', '');
                            }} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className={`bg-background ${inputSize}`}>
                                <SelectValue placeholder="Pilih" />
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
                            <FormLabel className={labelSize}>Sub</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value}
                              disabled={isDisabled}
                            >
                              <FormControl>
                                <SelectTrigger className={`bg-background ${inputSize} ${isDisabled ? 'opacity-50' : ''}`}>
                                  <SelectValue placeholder={isDisabled ? "Pilih dulu" : "Pilih sub"} />
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

                  {/* Quick Action */}
                  <FormField
                    control={form.control}
                    name="quickAction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelSize}>Quick Action</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className={inputSize}>
                              <SelectValue placeholder="Pilih quick action" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-background border border-border z-50">
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

                  {/* Deskripsi Temuan */}
                  <FormField
                    control={form.control}
                    name="findingDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelSize}>Deskripsi Temuan</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Jelaskan detail temuan keselamatan..."
                            className={compact ? 'min-h-[80px] text-sm resize-none' : 'min-h-[120px] resize-none'}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={`flex ${gapSize}`}>
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
              className="flex-[2] bg-gradient-primary hover:opacity-90"
            >
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Mengirim...' : 'Kirim Laporan'}
            </Button>
          </div>
        </form>
      </Form>

      {/* Similarity Check Dialog */}
      <SimilarityCheckDialog
        open={similarityDialogOpen}
        onOpenChange={setSimilarityDialogOpen}
        similarHazards={similarHazards}
        onContinueSubmission={handleContinueSubmission}
        onEditForm={handleEditForm}
        thinkingProcess={similarityThinkingProcess}
      />
    </div>
  );
}
