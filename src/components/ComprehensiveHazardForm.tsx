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
import { AlertTriangle, Upload, RotateCcw, Send, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Form schema
const hazardFormSchema = z.object({
  reporterName: z.string().min(1, 'Nama wajib diisi'),
  reporterPosition: z.string().min(1, 'Posisi/Jabatan wajib diisi'),
  observationTool: z.string().min(1, 'Tools Pengamatan wajib dipilih'),
  site: z.string().min(1, 'Site wajib dipilih'),
  location: z.string().min(1, 'Lokasi wajib dipilih'),
  detailLocation: z.string().optional(),
  areaPjaBC: z.string().min(1, 'Area PJA BC wajib dipilih'),
  areaPjaMitra: z.string().optional(),
  nonCompliance: z.string().min(1, 'Ketidaksesuaian wajib dipilih'),
  subNonCompliance: z.string().min(1, 'Sub Ketidaksesuaian wajib dipilih'),
  quickAction: z.string().min(1, 'Quick Action wajib dipilih'),
  findingDescription: z.string().min(10, 'Deskripsi Temuan minimal 10 karakter'),
});

type HazardFormData = z.infer<typeof hazardFormSchema>;

interface ComprehensiveHazardFormProps {
  onSubmit: (data: { description: string; formData: HazardFormData & { uploadedImage?: string } }) => void;
  isSubmitting?: boolean;
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

const nonComplianceTypes = ['APD'];

const subNonComplianceTypes = [
  'Cara Penggunaan APD',
  'Kelambu pelindung lebah (eksplorasi) tidak layak/tidak ada/tidak sesuai',
  'Kesesuaian dan Kelayakan APD',
  'Melepas pelindung, sistem alarm atau alat pelindung peralatan pelindung diri tidak tersedia',
  'Mematikan pelindung, sistem alarm atau alat pelindung',
  'Pengawas Tidak Memastikan Kesesuaian dan Kelayakan APD Pekerja Saat Aktivitas Telah Berlangsung',
  'Tidak menggunakan APD'
];

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

export function ComprehensiveHazardForm({ onSubmit, isSubmitting = false }: ComprehensiveHazardFormProps) {
  const { toast } = useToast();
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const form = useForm<HazardFormData>({
    resolver: zodResolver(hazardFormSchema),
    defaultValues: {
      reporterName: '',
      reporterPosition: '',
      observationTool: '',
      site: '',
      location: '',
      detailLocation: '',
      areaPjaBC: '',
      areaPjaMitra: '',
      nonCompliance: '',
      subNonCompliance: '',
      quickAction: '',
      findingDescription: '',
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

  // Save form data to localStorage on changes
  useEffect(() => {
    const subscription = form.watch((data) => {
      localStorage.setItem('hazard-form-data', JSON.stringify(data));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const handleFormSubmit = async (data: HazardFormData) => {
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
    `.trim();

    onSubmit({
      description: combinedDescription,
      formData: { ...data, uploadedImage }
    });
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
    setUploadedFiles([]);
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
                {uploadedFiles.length > 0 && (
                  <div className="mt-4 text-sm text-muted-foreground">
                    {uploadedFiles.length} file(s) uploaded
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih ketidaksesuaian" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
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
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sub Ketidaksesuaian</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih sub ketidaksesuaian" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {subNonComplianceTypes.map((type) => (
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
    </div>
  );
}