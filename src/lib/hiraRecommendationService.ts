import { supabase } from '@/integrations/supabase/client';

interface HiraRecommendation {
  source: 'hira' | 'ai';
  rootCause: string;
  correctiveAction: string;
  message?: string;
}

interface ComprehensiveHiraRecommendation {
  source: 'hira' | 'ai';
  confidence: number;
  
  // Akar Masalah Potensial (4 faktor)
  potentialRootCauses: {
    humanFactors: string[];
    systemFactors: string[];
    environmentalFactors: string[];
    organizationalFactors: string[];
  };
  
  // Tindakan Perbaikan (Hierarchy of Controls)
  correctiveActions: {
    elimination: string[];
    substitution: string[];
    engineeringControls: string[];
    administrativeControls: string[];
  };
  
  // Kontrol Pencegahan
  preventiveControls: {
    procedural: string[];
    technical: string[];
    management: string[];
  };
  
  // Kontrol Deteksi
  detectiveControls: {
    routineInspections: string[];
    continuousMonitoring: string[];
    auditsAndReview: string[];
  };
  
  // Kontrol Mitigasi
  mitigativeControls: {
    emergencyResponse: string[];
    damageControl: string[];
    recoveryPlans: string[];
  };
  
  message?: string;
}

class HiraRecommendationService {
  
  // Search HIRA knowledge base for relevant recommendations using vector similarity
  async searchHiraRecommendations(hazardDescription: string): Promise<{ contexts: string[], hasResults: boolean }> {
    try {
      console.log('[HIRA] Searching HIRA knowledge base for:', hazardDescription.substring(0, 100));
      
      // Use the optimized RAG service for vector similarity search
      const { optimizedRagService } = await import('./optimizedRagService');
      
      // Initialize the service if needed
      await optimizedRagService.initialize();
      
      // Generate embedding for the hazard description
      const queryEmbedding = await optimizedRagService.generateEmbedding(hazardDescription);
      
      // Search HIRA knowledge base using vector similarity
      const hiraResults = await optimizedRagService.retrieveContext(queryEmbedding, 'hira', 5);
      
      if (!hiraResults || hiraResults.length === 0) {
        console.log('[HIRA] No HIRA knowledge base results found');
        return { contexts: [], hasResults: false };
      }
      
      console.log(`[HIRA] Found ${hiraResults.length} relevant chunks with similarity search`);
      
      // Filter results with decent similarity scores (> 0.3)
      const relevantChunks = hiraResults.filter(result => result.similarity > 0.3);
      
      return {
        contexts: relevantChunks.map(chunk => chunk.text),
        hasResults: relevantChunks.length > 0
      };
      
    } catch (error) {
      console.error('[HIRA] Error searching HIRA knowledge base:', error);
      
      // Fallback to simple text search if vector search fails
      try {
        const { data: hiraChunks, error: fallbackError } = await supabase
          .from('knowledge_base_chunks')
          .select('chunk_text')
          .eq('knowledge_base_id', 'hira')
          .limit(10);
        
        if (fallbackError || !hiraChunks) {
          return { contexts: [], hasResults: false };
        }
        
        // Simple text matching as fallback
        const relevantChunks = hiraChunks.filter(chunk => {
          const chunkText = chunk.chunk_text.toLowerCase();
          const queryWords = hazardDescription.toLowerCase().split(' ');
          
          return queryWords.some(word => 
            word.length > 3 && chunkText.includes(word)
          );
        });
        
        console.log(`[HIRA] Fallback text search found ${relevantChunks.length} chunks`);
        
        return {
          contexts: relevantChunks.map(chunk => chunk.chunk_text),
          hasResults: relevantChunks.length > 0
        };
        
      } catch (fallbackError) {
        console.error('[HIRA] Fallback search also failed:', fallbackError);
        return { contexts: [], hasResults: false };
      }
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
  
  // Enhanced comprehensive recommendations
  async getComprehensiveRecommendations(
    hazardDescription: string, 
    location: string, 
    nonCompliance: string
  ): Promise<ComprehensiveHiraRecommendation> {
    try {
      console.log('[HIRA] Getting comprehensive recommendations...');
      
      const { data, error } = await supabase.functions.invoke('comprehensive-hira-recommendations', {
        body: {
          hazard_description: hazardDescription,
          location: location,
          non_compliance: nonCompliance
        }
      });

      if (error) {
        throw error;
      }

      if (data.success && data.recommendations) {
        return {
          ...data.recommendations,
          source: 'hira',
          message: 'Rekomendasi komprehensif berdasarkan HIRA knowledge base'
        };
      }

      // Fallback to basic recommendations
      const basic = await this.getRecommendations(hazardDescription, location, nonCompliance);
      return this.convertToComprehensive(basic);

    } catch (error) {
      console.error('[HIRA] Error getting comprehensive recommendations:', error);
      
      // Fallback to basic recommendations
      const basic = await this.getRecommendations(hazardDescription, location, nonCompliance);
      return this.convertToComprehensive(basic);
    }
  }

  // Convert basic recommendation to comprehensive format
  private convertToComprehensive(basic: HiraRecommendation): ComprehensiveHiraRecommendation {
    return {
      source: basic.source,
      confidence: basic.source === 'hira' ? 0.8 : 0.6,
      
      potentialRootCauses: {
        humanFactors: [basic.rootCause || 'Perlu investigasi mendalam untuk menentukan faktor manusia'],
        systemFactors: ['Evaluasi sistem dan prosedur yang ada'],
        environmentalFactors: ['Analisis kondisi lingkungan kerja'],
        organizationalFactors: ['Review struktur organisasi dan komunikasi']
      },
      
      correctiveActions: {
        elimination: ['Evaluasi kemungkinan eliminasi hazard'],
        substitution: ['Pertimbangkan substitusi dengan alternatif yang lebih aman'],
        engineeringControls: [basic.correctiveAction || 'Implementasi kontrol teknis'],
        administrativeControls: ['Perbaikan prosedur dan pelatihan']
      },
      
      preventiveControls: {
        procedural: ['Perbaikan prosedur operasi standar', 'Implementasi sistem permit to work'],
        technical: ['Maintenance preventif peralatan', 'Inspeksi berkala sistem keselamatan'],
        management: ['Pengawasan berkelanjutan', 'Review manajemen berkala']
      },
      
      detectiveControls: {
        routineInspections: ['Inspeksi harian area kerja', 'Checklist keselamatan rutin'],
        continuousMonitoring: ['Monitoring kondisi peralatan', 'Observasi perilaku kerja'],
        auditsAndReview: ['Audit keselamatan berkala', 'Review efektivitas kontrol']
      },
      
      mitigativeControls: {
        emergencyResponse: ['Prosedur tanggap darurat', 'Pelatihan emergency response'],
        damageControl: ['Rencana containment', 'Sistem komunikasi darurat'],
        recoveryPlans: ['Prosedur investigasi insiden', 'Program lessons learned']
      },
      
      message: basic.message || 'Rekomendasi dasar telah dikonversi ke format komprehensif'
    };
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