import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface KnowledgeBase {
  id: string;
  name: string;
  color: string;
}

interface Chunk {
  id: string;
  chunk_text: string;
  chunk_index: number;
  knowledge_base_id: string;
}

interface KnowledgeBaseChunksViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROWS_PER_PAGE = 50;

export function KnowledgeBaseChunksViewer({ open, onOpenChange }: KnowledgeBaseChunksViewerProps) {
  const { toast } = useToast();
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKB, setSelectedKB] = useState<string>('');
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (open) {
      loadKnowledgeBases();
    }
  }, [open]);

  useEffect(() => {
    if (selectedKB) {
      setCurrentPage(1);
      loadChunks(selectedKB, 1);
    }
  }, [selectedKB]);

  const loadKnowledgeBases = async () => {
    try {
      const { data, error } = await supabase
        .from('knowledge_bases')
        .select('id, name, color')
        .order('name');

      if (error) throw error;
      setKnowledgeBases(data || []);
      
      // Auto-select first KB if available
      if (data && data.length > 0 && !selectedKB) {
        setSelectedKB(data[0].id);
      }
    } catch (error) {
      console.error('Error loading knowledge bases:', error);
      toast({
        title: 'Error',
        description: 'Failed to load knowledge bases',
        variant: 'destructive',
      });
    }
  };

  const loadChunks = async (kbId: string, page: number) => {
    try {
      setLoading(true);
      
      // Get total count
      const { count } = await supabase
        .from('knowledge_base_chunks')
        .select('*', { count: 'exact', head: true })
        .eq('knowledge_base_id', kbId);

      setTotalCount(count || 0);

      // Get paginated data
      const from = (page - 1) * ROWS_PER_PAGE;
      const to = from + ROWS_PER_PAGE - 1;

      const { data, error } = await supabase
        .from('knowledge_base_chunks')
        .select('id, chunk_text, chunk_index, knowledge_base_id')
        .eq('knowledge_base_id', kbId)
        .order('chunk_index')
        .range(from, to);

      if (error) throw error;
      setChunks(data || []);
    } catch (error) {
      console.error('Error loading chunks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load knowledge base chunks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    loadChunks(selectedKB, newPage);
  };

  const totalPages = Math.ceil(totalCount / ROWS_PER_PAGE);
  const selectedKBData = knowledgeBases.find(kb => kb.id === selectedKB);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Knowledge Base Chunks</span>
            <Badge variant="outline">{totalCount} Total Chunks</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Knowledge Base Filter */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Filter by Knowledge Base:</label>
            <Select value={selectedKB} onValueChange={setSelectedKB}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select knowledge base" />
              </SelectTrigger>
              <SelectContent>
                {knowledgeBases.map((kb) => (
                  <SelectItem key={kb.id} value={kb.id}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full bg-${kb.color}/30`} />
                      {kb.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedKBData && (
              <Badge variant="outline" className={`bg-${selectedKBData.color}/10`}>
                {selectedKBData.name}
              </Badge>
            )}
          </div>

          {/* Chunks Table */}
          <ScrollArea className="h-[50vh]">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading chunks...</div>
            ) : chunks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No chunks found for this knowledge base
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Index</TableHead>
                    <TableHead className="w-[200px]">Knowledge Base</TableHead>
                    <TableHead>Chunk Text</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chunks.map((chunk) => (
                    <TableRow key={chunk.id}>
                      <TableCell className="font-mono text-sm">{chunk.chunk_index}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`bg-${selectedKBData?.color}/10`}>
                          {selectedKBData?.name || chunk.knowledge_base_id}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm max-w-2xl whitespace-pre-wrap">
                          {chunk.chunk_text}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * ROWS_PER_PAGE) + 1} to{' '}
                {Math.min(currentPage * ROWS_PER_PAGE, totalCount)} of {totalCount} chunks
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="text-sm font-medium">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
