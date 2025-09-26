import { supabase } from '@/integrations/supabase/client';

interface HiraRecommendation {
  source: 'hira' | 'ai';
  rootCause: string;
  correctiveAction: string;
  message?: string;
}

class HiraRecommendationService {
  
  // Search HIRA knowledge base for relevant recommendations
  async searchHiraRecommendations(hazardDescription: string): Promise<{ contexts: string[], hasResults: boolean }> {
    try {
      console.log('[HIRA] Searching HIRA knowledge base for:', hazardDescription.substring(0, 100));
      
      // Get HIRA chunks from database
      const { data: hiraChunks, error } = await supabase
        .from('knowledge_base_chunks')
        .select('chunk_text')
        .eq('knowledge_base_id', 'hira')
        .limit(10);
      
      if (error) {
        console.error('[HIRA] Error fetching HIRA chunks:', error);
        return { contexts: [], hasResults: false };
      }
      
      if (!hiraChunks || hiraChunks.length === 0) {
        console.log('[HIRA] No HIRA knowledge base found');
        return { contexts: [], hasResults: false };
      }
      
      // Simple text matching for HIRA content
      const relevantChunks = hiraChunks.filter(chunk => {
        const chunkText = chunk.chunk_text.toLowerCase();
        const queryWords = hazardDescription.toLowerCase().split(' ');
        
        // Check if chunk contains relevant keywords
        return queryWords.some(word => 
          word.length > 3 && chunkText.includes(word)
        );
      });
      
      console.log(`[HIRA] Found ${relevantChunks.length} relevant chunks`);
      
      return {
        contexts: relevantChunks.map(chunk => chunk.chunk_text),
        hasResults: relevantChunks.length > 0
      };
      
    } catch (error) {
      console.error('[HIRA] Error searching HIRA knowledge base:', error);
      return { contexts: [], hasResults: false };
    }
  }
  
  // Generate recommendations using Gemini as fallback
  async generateWithGemini(hazardDescription: string, location: string, nonCompliance: string): Promise<{ rootCause: string, correctiveAction: string }> {
    try {
      console.log('[HIRA] Generating AI recommendations with Gemini');
      
      const { data, error } = await supabase.functions.invoke('analyze-hazard-quality', {
        body: {
          hazard_description: hazardDescription,
          location: location,
          non_compliance: nonCompliance,
          analysis_type: 'recommendations'
        }
      });
      
      if (error) {
        throw error;
      }
      
      // Parse Gemini response for root cause and corrective actions
      const response = data.analysis || '';
      
      // Simple parsing - you might want to improve this
      const rootCauseMatch = response.match(/(?:akar masalah|root cause|penyebab)[:\s]*([^\.]+)/i);
      const actionMatch = response.match(/(?:tindakan|action|rekomendasi)[:\s]*([^\.]+)/i);
      
      return {
        rootCause: rootCauseMatch?.[1]?.trim() || 'Analisis akar masalah diperlukan berdasarkan investigasi lebih lanjut',
        correctiveAction: actionMatch?.[1]?.trim() || 'Tindakan perbaikan akan ditentukan setelah analisis lengkap'
      };
      
    } catch (error) {
      console.error('[HIRA] Error generating with Gemini:', error);
      
      // Fallback recommendations
      return {
        rootCause: 'Perlu dilakukan investigasi mendalam untuk menentukan akar masalah yang tepat',
        correctiveAction: 'Tindakan perbaikan akan disusun berdasarkan hasil investigasi'
      };
    }
  }
  
  // Main function to get recommendations
  async getRecommendations(hazardDescription: string, location: string, nonCompliance: string): Promise<HiraRecommendation> {
    try {
      // First, try to get recommendations from HIRA knowledge base
      const hiraSearch = await this.searchHiraRecommendations(hazardDescription);
      
      if (hiraSearch.hasResults && hiraSearch.contexts.length > 0) {
        // Extract recommendations from HIRA content
        const hiraContent = hiraSearch.contexts.join('\n\n');
        
        // Simple extraction based on HIRA patterns
        const rootCausePatterns = [
          /penyebab[:\s]*([^\.]+)/i,
          /faktor[:\s]*([^\.]+)/i,
          /sumber[:\s]*([^\.]+)/i
        ];
        
        const actionPatterns = [
          /tindakan[:\s]*([^\.]+)/i,
          /langkah[:\s]*([^\.]+)/i,
          /kontrol[:\s]*([^\.]+)/i,
          /pengendalian[:\s]*([^\.]+)/i
        ];
        
        let rootCause = '';
        let correctiveAction = '';
        
        // Try to extract root cause from HIRA
        for (const pattern of rootCausePatterns) {
          const match = hiraContent.match(pattern);
          if (match) {
            rootCause = match[1].trim();
            break;
          }
        }
        
        // Try to extract corrective action from HIRA
        for (const pattern of actionPatterns) {
          const match = hiraContent.match(pattern);
          if (match) {
            correctiveAction = match[1].trim();
            break;
          }
        }
        
        // If we found good HIRA recommendations
        if (rootCause && correctiveAction) {
          return {
            source: 'hira',
            rootCause: rootCause,
            correctiveAction: correctiveAction,
            message: 'Rekomendasi berdasarkan knowledge base HIRA'
          };
        }
      }
      
      // Fallback to AI generation
      console.log('[HIRA] No suitable HIRA recommendations found, using AI fallback');
      const aiRecommendations = await this.generateWithGemini(hazardDescription, location, nonCompliance);
      
      return {
        source: 'ai',
        rootCause: aiRecommendations.rootCause,
        correctiveAction: aiRecommendations.correctiveAction,
        message: 'Rekomendasi dibantu oleh AI - silakan review dan sesuaikan'
      };
      
    } catch (error) {
      console.error('[HIRA] Error getting recommendations:', error);
      
      return {
        source: 'ai',
        rootCause: 'Perlu investigasi lebih lanjut untuk menentukan akar masalah',
        correctiveAction: 'Tindakan akan ditentukan setelah analisis mendalam',
        message: 'Rekomendasi default - silakan sesuaikan dengan kondisi lapangan'
      };
    }
  }
}

export const hiraRecommendationService = new HiraRecommendationService();