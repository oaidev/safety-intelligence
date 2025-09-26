import { supabase } from "@/integrations/supabase/client";

export interface AIRecommendations {
  root_cause_analysis: string;
  corrective_actions: string;
  preventive_measures: string;
  risk_level: 'HIGH' | 'MEDIUM' | 'LOW';
  kategori_temuan: string;
  jenis_tindakan: string;
  alur_permasalahan: string;
  tindakan: string;
  due_date_suggestion: number; // days from now
}

export interface HazardData {
  deskripsi_temuan: string;
  lokasi: string;
  ketidaksesuaian: string;
  sub_ketidaksesuaian: string;
  quick_action?: string;
  image_base64?: string;
}

export class AIRecommendationService {
  private static instance: AIRecommendationService;

  static getInstance(): AIRecommendationService {
    if (!AIRecommendationService.instance) {
      AIRecommendationService.instance = new AIRecommendationService();
    }
    return AIRecommendationService.instance;
  }

  /**
   * Generate AI recommendations using Gemini API via Supabase Edge Function
   */
  async generateRecommendations(hazardData: HazardData): Promise<AIRecommendations> {
    console.log('[AIRecommendationService] Generating recommendations for hazard:', hazardData);

    try {
      const { data, error } = await supabase.functions.invoke('generate-hazard-recommendations', {
        body: {
          hazardData: {
            deskripsi_temuan: hazardData.deskripsi_temuan,
            lokasi: hazardData.lokasi,
            ketidaksesuaian: hazardData.ketidaksesuaian,
            sub_ketidaksesuaian: hazardData.sub_ketidaksesuaian,
            quick_action: hazardData.quick_action,
            image_base64: hazardData.image_base64
          }
        }
      });

      if (error) {
        console.error('[AIRecommendationService] Edge function error:', error);
        throw new Error(`AI recommendation failed: ${error.message}`);
      }

      if (!data?.recommendations) {
        console.error('[AIRecommendationService] Invalid response from edge function:', data);
        throw new Error('Invalid response from AI service');
      }

      console.log('[AIRecommendationService] Generated recommendations:', data.recommendations);
      return data.recommendations;

    } catch (error) {
      console.error('[AIRecommendationService] Error generating recommendations:', error);
      
      // Fallback recommendations
      return this.getFallbackRecommendations(hazardData);
    }
  }

  /**
   * Generate root cause analysis recommendations
   */
  async generateRootCauseAnalysis(hazardData: HazardData): Promise<string> {
    const recommendations = await this.generateRecommendations(hazardData);
    return recommendations.root_cause_analysis;
  }

  /**
   * Generate corrective action recommendations
   */
  async generateCorrectiveActions(hazardData: HazardData): Promise<{
    corrective_actions: string;
    preventive_measures: string;
    jenis_tindakan: string;
    tindakan: string;
    due_date_suggestion: number;
  }> {
    const recommendations = await this.generateRecommendations(hazardData);
    
    return {
      corrective_actions: recommendations.corrective_actions,
      preventive_measures: recommendations.preventive_measures,
      jenis_tindakan: recommendations.jenis_tindakan,
      tindakan: recommendations.tindakan,
      due_date_suggestion: recommendations.due_date_suggestion
    };
  }

  /**
   * Fallback recommendations when AI service fails
   */
  private getFallbackRecommendations(hazardData: HazardData): AIRecommendations {
    console.log('[AIRecommendationService] Using fallback recommendations');

    // Basic risk assessment based on keywords
    const riskLevel = this.assessRiskLevel(hazardData);
    const dueDays = riskLevel === 'HIGH' ? 3 : riskLevel === 'MEDIUM' ? 7 : 14;

    return {
      root_cause_analysis: `Analisis akar masalah untuk ${hazardData.ketidaksesuaian} di lokasi ${hazardData.lokasi}. Diperlukan investigasi lebih lanjut untuk mengidentifikasi faktor-faktor penyebab utama dari temuan: ${hazardData.deskripsi_temuan.substring(0, 100)}...`,
      
      corrective_actions: `Tindakan perbaikan segera diperlukan untuk mengatasi ${hazardData.ketidaksesuaian}. Lakukan perbaikan pada area yang teridentifikasi dan pastikan tidak ada risiko serupa di area lain.`,
      
      preventive_measures: `Implementasi langkah pencegahan untuk mencegah terulangnya ${hazardData.ketidaksesuaian}. Lakukan pelatihan berkelanjutan dan pemantauan rutin di lokasi ${hazardData.lokasi}.`,
      
      risk_level: riskLevel,
      
      kategori_temuan: 'Kondisi Tidak Aman',
      
      jenis_tindakan: 'PERBAIKAN',
      
      alur_permasalahan: `Temuan ${hazardData.ketidaksesuaian} memerlukan penanganan segera untuk mencegah risiko kecelakaan kerja.`,
      
      tindakan: `Lakukan perbaikan segera terhadap ${hazardData.ketidaksesuaian} dan implementasikan langkah pencegahan untuk mencegah kejadian serupa.`,
      
      due_date_suggestion: dueDays
    };
  }

  /**
   * Assess risk level based on hazard data
   */
  private assessRiskLevel(hazardData: HazardData): 'HIGH' | 'MEDIUM' | 'LOW' {
    const description = hazardData.deskripsi_temuan.toLowerCase();
    const nonCompliance = hazardData.ketidaksesuaian.toLowerCase();
    
    // High risk keywords
    const highRiskKeywords = [
      'kebakaran', 'ledakan', 'listrik', 'ketinggian', 'chemical', 'kimia',
      'confined space', 'ruang terbatas', 'crane', 'forklift', 'hot work',
      'gas', 'toxic', 'toksik', 'fall', 'jatuh', 'elektrik'
    ];
    
    // Medium risk keywords
    const mediumRiskKeywords = [
      'slip', 'trip', 'tergelincir', 'terpeleset', 'machinery', 'mesin',
      'noise', 'bising', 'ergonomic', 'ergonomi', 'pressure', 'tekanan'
    ];
    
    const text = `${description} ${nonCompliance}`;
    
    if (highRiskKeywords.some(keyword => text.includes(keyword))) {
      return 'HIGH';
    }
    
    if (mediumRiskKeywords.some(keyword => text.includes(keyword))) {
      return 'MEDIUM';
    }
    
    return 'LOW';
  }

  /**
   * Get kategorization suggestions
   */
  async getKategorizationSuggestions(hazardData: HazardData): Promise<{
    kategori_temuan: string;
    confidence: number;
  }> {
    try {
      const recommendations = await this.generateRecommendations(hazardData);
      return {
        kategori_temuan: recommendations.kategori_temuan,
        confidence: 0.8 // Default confidence score
      };
    } catch (error) {
      console.warn('[AIRecommendationService] Failed to get categorization, using fallback');
      return {
        kategori_temuan: 'Kondisi Tidak Aman',
        confidence: 0.5
      };
    }
  }
}

export const aiRecommendationService = AIRecommendationService.getInstance();