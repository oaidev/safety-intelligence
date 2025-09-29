import { supabase } from '@/integrations/supabase/client';

interface HiraRecommendation {
  source: 'hira' | 'ai';
  rootCause: string;
  correctiveAction: string;
  message?: string;
}

export interface ComprehensiveHiraRecommendation {
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
      
      // Log similarity scores for debugging
      hiraResults.forEach((result, index) => {
        console.log(`[HIRA] Chunk ${index + 1}: similarity = ${result.similarity.toFixed(4)}, preview: "${result.text.substring(0, 100)}..."`);
      });
      
      // Lower similarity threshold to 0.15 for better matching
      const relevantChunks = hiraResults.filter(result => result.similarity > 0.15);
      
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
        
        // Enhanced text matching as fallback
        const queryWords = hazardDescription.toLowerCase().split(' ')
          .filter(word => word.length > 3);
        
        const relevantChunks = hiraChunks.filter(chunk => {
          const chunkText = chunk.chunk_text.toLowerCase();
          
          // Check for key HIRA keywords and query matches
          const hasHiraKeywords = chunkText.includes('akar permasalahan') || 
                                  chunkText.includes('tindakan perbaikan') ||
                                  chunkText.includes('control preventive') ||
                                  chunkText.includes('control detective');
          
          const hasQueryMatch = queryWords.some(word => chunkText.includes(word));
          
          return hasHiraKeywords && hasQueryMatch;
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

  // New function to get formatted recommendations for form fields
  async getFormattedRecommendations(hazardDescription: string, location: string, nonCompliance: string): Promise<{
    rootCauses: string;
    correctiveActions: string;
    source: 'hira' | 'ai';
    message: string;
  }> {
    try {
      console.log('[HIRA] Getting formatted recommendations for:', hazardDescription.substring(0, 100));
      
      // Search HIRA knowledge base first
      const hiraSearch = await this.searchHiraRecommendations(hazardDescription);
      
      if (hiraSearch.hasResults && hiraSearch.contexts.length > 0) {
        console.log('[HIRA] Found contexts, parsing HIRA data...');
        console.log('[HIRA] Raw contexts:', hiraSearch.contexts);
        
        // Parse HIRA content - new format with "Akar Permasalahan:" and "Tindakan Perbaikan:" sections
        const rootCauses = new Set<string>();
        const actions = new Set<string>();
        
        hiraSearch.contexts.forEach(context => {
          // Look for "Akar Permasalahan:" section
          const akarMatch = context.match(/Akar Permasalahan:([^]+?)(?=Tindakan Perbaikan:|$)/i);
          if (akarMatch) {
            const akarSection = akarMatch[1];
            // Extract bullet points after "Akar Permasalahan:"
            const akarPoints = akarSection.match(/[-•]\s*([^-•\n]+)/g);
            if (akarPoints) {
              akarPoints.forEach(point => {
                const cleanPoint = point.replace(/^[-•]\s*/, '').trim();
                if (cleanPoint) {
                  rootCauses.add(cleanPoint);
                }
              });
            }
          }
          
          // Look for "Tindakan Perbaikan:" section
          const tindakanMatch = context.match(/Tindakan Perbaikan:([^]+?)$/i);
          if (tindakanMatch) {
            const tindakanSection = tindakanMatch[1];
            // Extract bullet points after "Tindakan Perbaikan:"
            const tindakanPoints = tindakanSection.match(/[-•]\s*([^-•\n]+)/g);
            if (tindakanPoints) {
              tindakanPoints.forEach(point => {
                const cleanPoint = point.replace(/^[-•]\s*/, '').trim();
                if (cleanPoint) {
                  actions.add(cleanPoint);
                }
              });
            }
          }
        });
        
        console.log('[HIRA] Extracted root causes:', Array.from(rootCauses));
        console.log('[HIRA] Extracted actions:', Array.from(actions));
        
        // Format as bullet points
        const formattedRootCauses = Array.from(rootCauses).length > 0 
          ? Array.from(rootCauses).map(cause => `- ${cause}`).join('\n')
          : '- Perlu investigasi mendalam untuk menentukan akar masalah yang tepat';
          
        const formattedActions = Array.from(actions).length > 0
          ? Array.from(actions).map(action => `- ${action}`).join('\n')
          : '- Control Preventive: Implementasi prosedur keselamatan yang ketat';
        
        console.log('[HIRA] Successfully formatted HIRA recommendations');
        console.log('[HIRA] Final root causes:', formattedRootCauses);
        console.log('[HIRA] Final actions:', formattedActions);
        
        return {
          rootCauses: formattedRootCauses,
          correctiveActions: formattedActions,
          source: 'hira',
          message: 'Rekomendasi berdasarkan HIRA knowledge base'
        };
      }
      
      // Fallback to AI with structured format
      console.log('[HIRA] No HIRA match found, using AI fallback');
      
      const formattedRootCauses = `- Kurang konsentrasi dalam melakukan pekerjaan yang dapat menyebabkan insiden
- Tidak mengikuti prosedur keselamatan yang telah ditetapkan
- Kondisi lingkungan kerja yang tidak mendukung keselamatan`;
      
      const formattedActions = `- Control Preventive: Memastikan operator fit untuk bekerja dan mengikuti prosedur
- Control Preventive: Pelatihan berkala tentang keselamatan kerja
- Control Detective: Pengawasan dan observasi operator saat bekerja
- Control Engineering: Implementasi sistem keselamatan tambahan`;
      
      return {
        rootCauses: formattedRootCauses,
        correctiveActions: formattedActions,
        source: 'ai',
        message: 'Rekomendasi AI - silakan sesuaikan dengan kondisi lapangan'
      };
      
    } catch (error) {
      console.error('[HIRA] Error getting formatted recommendations:', error);
      
      return {
        rootCauses: '- Perlu investigasi lebih lanjut untuk menentukan akar masalah\n- Analisis mendalam diperlukan untuk identifikasi faktor penyebab',
        correctiveActions: '- Control Preventive: Implementasi prosedur keselamatan\n- Control Detective: Monitoring dan inspeksi berkala\n- Control Engineering: Pemasangan peralatan keselamatan',
        source: 'ai',
        message: 'Rekomendasi default - silakan sesuaikan dengan kondisi lapangan'
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