import { supabase } from '@/integrations/supabase/client';
import { configService } from './configService';

export interface ScoreData {
  consistency: number;
  completeness: number;
  image_relevance: number;
  overall: number;
}

export interface DetailedAnalysis {
  consistency: {
    score: number;
    findings: string[];
    issues: string[];
  };
  completeness: {
    score: number;
    missing_elements: string[];
    strong_points: string[];
  };
  image_relevance: {
    score: number;
    findings: string[];
    issues: string[];
  };
}

export interface ThinkingStep {
  step: number;
  name: string;
  description: string;
  timestamp: number;
  duration: number;
  details: any;
  status: 'success' | 'error' | 'warning';
}

export interface ThinkingProcess {
  steps: ThinkingStep[];
  totalDuration: number;
  summary: string;
}

export interface AnalysisResult {
  scores: ScoreData;
  detailed_analysis: DetailedAnalysis;
  recommendations: string[];
  suggested_improvements: {
    deskripsi_temuan?: string;
    quick_action?: string;
  };
  thinkingProcess?: ThinkingProcess;
}

export interface HazardFormData {
  deskripsi_temuan: string;
  ketidaksesuaian: string;
  sub_ketidaksesuaian: string;
  tools_pengamatan: string;
  lokasi_detail: string;
  location_description?: string;
  quick_action: string;
  image_base64?: string;
}

export class ScoringService {
  async analyzeHazardQuality(formData: HazardFormData): Promise<AnalysisResult> {
    const startTime = Date.now();
    const thinkingSteps: ThinkingStep[] = [];

    // Load configurations
    const configs = await configService.getMultiple([
      'scoring_model',
      'scoring_temperature',
      'scoring_weights'
    ]);

    const scoringWeights = configs.scoring_weights || {
      consistency: 0.33,
      completeness: 0.33,
      image_relevance: 0.34
    };
    
    try {
      console.log('[ScoringService] Starting hazard quality analysis...');
      
      // Step 1: Validate Input
      const step1Start = Date.now();
      thinkingSteps.push({
        step: 1,
        name: 'Validasi Input',
        description: 'Memeriksa kelengkapan data form hazard',
        timestamp: step1Start,
        duration: Date.now() - step1Start,
        details: {
          fields: {
            deskripsi_temuan: `${formData.deskripsi_temuan?.length || 0} characters`,
            ketidaksesuaian: formData.ketidaksesuaian,
            quick_action: `${formData.quick_action?.length || 0} characters`,
            image: formData.image_base64 ? 'Ada' : 'Tidak ada',
            lokasi: formData.lokasi_detail,
            tools: formData.tools_pengamatan
          },
          explanation: '✅ Sistem memeriksa apakah semua field penting sudah diisi dengan lengkap sebelum dikirim ke AI untuk di-score.'
        },
        status: 'success'
      });
      
      // Step 2: Call Gemini for Scoring
      const step2Start = Date.now();
      const { data, error } = await supabase.functions.invoke('analyze-hazard-quality', {
        body: { formData }
      });
      
      thinkingSteps.push({
        step: 2,
        name: 'AI Quality Scoring',
        description: 'Gemini AI menilai kualitas laporan berdasarkan 3 kriteria',
        timestamp: step2Start,
        duration: Date.now() - step2Start,
        details: {
          criteria: [
            {
              name: 'Consistency',
              weight: `${(scoringWeights.consistency * 100).toFixed(0)}%`,
              description: 'Konsistensi antara deskripsi temuan, kategori ketidaksesuaian, dan quick action'
            },
            {
              name: 'Completeness',
              weight: `${(scoringWeights.completeness * 100).toFixed(0)}%`,
              description: 'Kelengkapan informasi (lokasi detail, tools pengamatan, deskripsi yang jelas)'
            },
            {
              name: 'Image Relevance',
              weight: `${(scoringWeights.image_relevance * 100).toFixed(0)}%`,
              description: 'Relevansi foto dengan deskripsi hazard (jika ada foto)'
            }
          ],
          model: configs.scoring_model || 'gemini-2.5-flash',
          explanation: '🤖 AI membaca semua field dan memberi score 0-100 untuk setiap kriteria. Setiap kriteria memiliki bobot yang sama dalam perhitungan overall score.',
          configUsed: {
            model: configs.scoring_model || 'gemini-2.5-flash',
            temperature: configs.scoring_temperature || 0.3,
            weights: scoringWeights
          }
        },
        status: error ? 'error' : 'success'
      });

      if (error) {
        console.error('[ScoringService] Supabase function error:', error);
        throw new Error(`Analysis failed: ${error.message}`);
      }

      if (!data.success) {
        console.error('[ScoringService] Analysis unsuccessful:', data.error);
        throw new Error(data.error || 'Analysis failed');
      }

      // Step 3: Parse Scores & Calculate Overall
      const step3Start = Date.now();
      const analysis = data.analysis;
      
      thinkingSteps.push({
        step: 3,
        name: 'Kalkulasi Overall Score',
        description: 'Menghitung rata-rata dari 3 score',
        timestamp: step3Start,
        duration: Date.now() - step3Start,
        details: {
          scores: {
            consistency: analysis.scores.consistency,
            completeness: analysis.scores.completeness,
            image_relevance: analysis.scores.image_relevance
          },
          formula: `(Consistency × ${(scoringWeights.consistency * 100).toFixed(0)}% + Completeness × ${(scoringWeights.completeness * 100).toFixed(0)}% + Image × ${(scoringWeights.image_relevance * 100).toFixed(0)}%)`,
          calculation: `(${analysis.scores.consistency} + ${analysis.scores.completeness} + ${analysis.scores.image_relevance}) / 3 = ${analysis.scores.overall}`,
          overall: analysis.scores.overall,
          grade: this.getScoreGrade(analysis.scores.overall),
          explanation: '📊 Overall score dihitung sebagai rata-rata sederhana dari 3 kriteria. Score 80+ = Excellent, 60-79 = Good, 40-59 = Fair, <40 = Poor.',
          configUsed: {
            weights: scoringWeights
          }
        },
        status: 'success'
      });

      console.log('[ScoringService] Analysis completed successfully');
      
      return {
        ...analysis,
        thinkingProcess: {
          steps: thinkingSteps,
          totalDuration: Date.now() - startTime,
          summary: `Quality scoring completed in ${Math.round((Date.now() - startTime) / 1000)} seconds with overall score: ${analysis.scores.overall}/100 (${this.getScoreGrade(analysis.scores.overall)})`
        }
      };

    } catch (error) {
      console.error('[ScoringService] Error:', error);
      throw error;
    }
  }

  getScoreColor(score: number): string {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }

  getScoreGrade(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 40) return 'Poor';
    return 'Critical';
  }

  getProgressColor(score: number): string {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  }
}

// Export singleton instance
export const scoringService = new ScoringService();