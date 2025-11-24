import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, MapPin, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { ThinkingProcessViewer, ThinkingProcess } from '@/components/ThinkingProcessViewer';

interface SimilarHazard {
  id: string;
  tracking_id: string;
  reporter_name: string;
  location: string;
  non_compliance: string;
  sub_non_compliance: string;
  finding_description: string;
  status: string;
  created_at: string;
  distance_km?: number;
  similarity_score?: number;
}

interface SimilarityCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  similarHazards: SimilarHazard[];
  onContinueSubmission: () => void;
  onEditForm: () => void;
  thinkingProcess?: ThinkingProcess;
}

export function SimilarityCheckDialog({
  open,
  onOpenChange,
  similarHazards,
  onContinueSubmission,
  onEditForm,
  thinkingProcess
}: SimilarityCheckDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return 'Menunggu Review';
      case 'IN_PROGRESS':
        return 'Dalam Proses';
      case 'COMPLETED':
        return 'Selesai';
      case 'DUPLIKAT':
        return 'Duplikat';
      case 'BUKAN_HAZARD':
        return 'Bukan Hazard';
      default:
        return status;
    }
  };

  const handleContinueSubmission = () => {
    setIsSubmitting(true);
    onContinueSubmission();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Ditemukan Hazard Serupa
          </DialogTitle>
          <DialogDescription>
            Kami menemukan {similarHazards.length} laporan hazard yang serupa dengan yang akan Anda submit. 
            Silakan review terlebih dahulu apakah hazard ini sudah pernah dilaporkan.
          </DialogDescription>
        </DialogHeader>

        {/* Thinking Process Viewer */}
        {thinkingProcess && (
          <div className="mb-4">
            <ThinkingProcessViewer thinkingProcess={thinkingProcess} compact={true} />
          </div>
        )}

        <div className="space-y-4">
          {similarHazards.map((hazard, index) => (
            <Card key={hazard.id} className="border-l-4 border-l-warning">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-semibold">{hazard.tracking_id}</span>
                      {hazard.distance_km !== undefined && (
                        <Badge variant="outline" className="text-xs">
                          <MapPin className="h-3 w-3 mr-1" />
                          {hazard.distance_km.toFixed(1)} km
                        </Badge>
                      )}
                      {hazard.similarity_score !== undefined && (
                        <Badge variant="secondary" className="text-xs">
                          {(hazard.similarity_score * 100).toFixed(0)}% similar
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {hazard.reporter_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(hazard.created_at), 'dd MMM yyyy', { locale: idLocale })}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {hazard.location}
                      </span>
                    </div>
                    <div className="mt-2">
                      <Badge variant="secondary" className="text-xs">
                        Status: {getStatusLabel(hazard.status)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">Ketidaksesuaian: </span>
                    <span className="text-sm">{hazard.non_compliance}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Sub Ketidaksesuaian: </span>
                    <span className="text-sm">{hazard.sub_non_compliance}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Deskripsi: </span>
                    <p className="text-sm bg-muted p-2 rounded mt-1 line-clamp-3">
                      {hazard.finding_description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <DialogFooter className="flex gap-3">
          <Button variant="outline" onClick={onEditForm}>
            Edit Ulang Form
          </Button>
          <Button 
            onClick={handleContinueSubmission}
            disabled={isSubmitting}
            className="bg-warning hover:bg-warning/90"
          >
            {isSubmitting ? 'Mengirim...' : 'Tetap Submit Laporan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}