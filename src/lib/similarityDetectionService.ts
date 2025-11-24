import { supabase } from '@/integrations/supabase/client';
import { configService } from './configService';
import { ThinkingProcessGenerator } from './thinkingProcessGenerator';
import { ThinkingProcess } from '@/components/ThinkingProcessViewer';

export interface SimilarHazardData {
  id: string;
  tracking_id: string;
  reporter_name: string;
  location: string;
  detail_location?: string;
  location_description?: string;
  non_compliance: string;
  sub_non_compliance: string;
  finding_description: string;
  status: string;
  created_at: string;
  latitude?: number;
  longitude?: number;
  distance_km?: number;
  similarity_score?: number;
}

export interface HazardSubmissionData {
  location: string;
  detail_location?: string;
  location_description?: string;
  non_compliance: string;
  sub_non_compliance: string;
  finding_description: string;
  latitude?: string;
  longitude?: string;
}

class SimilarityDetectionService {
  /**
   * Check for similar hazards before submission with thinking process
   */
  async checkSimilarHazards(submissionData: HazardSubmissionData): Promise<{ 
    similarHazards: SimilarHazardData[], 
    thinkingProcess: ThinkingProcess 
  }> {
    const thinkingGen = new ThinkingProcessGenerator();
    
    try {
      // Step 1: Load configuration
      const configs = await configService.getMultiple([
        'similarity_time_window',
        'similarity_location_radius',
        'similarity_threshold',
        'similarity_top_n',
        'similarity_weights'
      ]);

      const timeWindowDays = configs.similarity_time_window || 7;
      const locationRadiusKm = configs.similarity_location_radius || 1.0;
      const similarityThreshold = configs.similarity_threshold || 0.7;
      const topN = configs.similarity_top_n || 5;
      const weights = configs.similarity_weights || {
        location_radius: 0.22,
        location_name: 0.18,
        detail_location: 0.14,
        location_description: 0.09,
        non_compliance: 0.14,
        sub_non_compliance: 0.09,
        finding_description: 0.14
      };

      thinkingGen.addConfigStep('Similarity Detection', {
        'Time Window': `${timeWindowDays} hari`,
        'Location Radius': `${locationRadiusKm} km`,
        'Similarity Threshold': `${(similarityThreshold * 100).toFixed(0)}%`,
        'Max Results': topN
      });

      // Step 2: Parse coordinates
      const lat = parseFloat(submissionData.latitude || '0');
      const lng = parseFloat(submissionData.longitude || '0');
      const hasValidCoords = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;

      thinkingGen.addStep(
        thinkingGen['steps'].length + 1,
        'Validasi Koordinat',
        hasValidCoords ? 'Koordinat GPS valid ditemukan' : 'Tidak ada koordinat GPS valid',
        hasValidCoords 
          ? `**Latitude**: ${lat}\n**Longitude**: ${lng}\n\nPencarian berdasarkan lokasi geografis akan diaktifkan.`
          : 'Pencarian akan dilakukan tanpa filter radius geografis.',
        hasValidCoords ? 'success' : 'warning'
      );

      // Step 3: Query database
      const startDate = new Date(Date.now() - timeWindowDays * 24 * 60 * 60 * 1000);

      let query = supabase
        .from('hazard_reports')
        .select(`
          id,
          tracking_id,
          reporter_name,
          location,
          detail_location,
          location_description,
          non_compliance,
          sub_non_compliance,
          finding_description,
          status,
          created_at,
          latitude,
          longitude
        `)
        .gte('created_at', startDate.toISOString());

      if (hasValidCoords) {
        query = query.not('latitude', 'is', null).not('longitude', 'is', null);
      }

      const { data: hazards, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching hazards for similarity check:', error);
        thinkingGen.addWarningStep('Error mengambil data dari database', error.message);
        return {
          similarHazards: [],
          thinkingProcess: thinkingGen.build('Gagal menganalisis similaritas karena error database')
        };
      }

      if (!hazards || hazards.length === 0) {
        thinkingGen.addDatabaseQueryStep(
          'hazard_reports',
          [`created_at >= ${startDate.toISOString()}`],
          0
        );
        return {
          similarHazards: [],
          thinkingProcess: thinkingGen.build('Tidak ada laporan dalam time window yang ditentukan')
        };
      }

      thinkingGen.addDatabaseQueryStep(
        'hazard_reports',
        [
          `created_at >= ${startDate.toISOString()}`,
          hasValidCoords ? 'latitude IS NOT NULL, longitude IS NOT NULL' : 'Tanpa filter koordinat'
        ],
        hazards.length
      );

      // Step 4: Calculate similarity for each candidate
      const similarHazards: (SimilarHazardData & { breakdown: Record<string, number> })[] = [];

      for (const hazard of hazards) {
        let similarityScore = 0;
        let distanceKm: number | undefined;
        const breakdown: Record<string, number> = {};

        // 1. Location radius similarity
        if (hasValidCoords && hazard.latitude && hazard.longitude) {
          const storedLat = parseFloat(hazard.latitude.toString());
          const storedLng = parseFloat(hazard.longitude.toString());
          distanceKm = this.calculateDistance(lat, lng, storedLat, storedLng);

          if (distanceKm <= locationRadiusKm) {
            breakdown['Location Radius'] = weights.location_radius;
            similarityScore += weights.location_radius;
          }
        }

        // 2. Location name exact match
        if (this.normalizeText(hazard.location) === this.normalizeText(submissionData.location)) {
          breakdown['Location Name'] = weights.location_name;
          similarityScore += weights.location_name;
        }

        // 3. Detail location exact match
        if (submissionData.detail_location && hazard.detail_location && 
            this.normalizeText(hazard.detail_location) === this.normalizeText(submissionData.detail_location)) {
          breakdown['Detail Location'] = weights.detail_location;
          similarityScore += weights.detail_location;
        }

        // 4. Location description semantic similarity
        if (submissionData.location_description && hazard.location_description) {
          const descSimilarity = this.calculateTextSimilarity(
            this.normalizeText(submissionData.location_description),
            this.normalizeText(hazard.location_description)
          );
          breakdown['Location Description'] = descSimilarity * weights.location_description;
          similarityScore += descSimilarity * weights.location_description;
        }

        // 5. Non-compliance exact match
        if (this.normalizeText(hazard.non_compliance) === this.normalizeText(submissionData.non_compliance)) {
          breakdown['Non-Compliance'] = weights.non_compliance;
          similarityScore += weights.non_compliance;
        }

        // 6. Sub non-compliance exact match
        if (this.normalizeText(hazard.sub_non_compliance) === this.normalizeText(submissionData.sub_non_compliance)) {
          breakdown['Sub Non-Compliance'] = weights.sub_non_compliance;
          similarityScore += weights.sub_non_compliance;
        }

        // 7. Finding description semantic similarity
        const extractedDescription = this.extractDescriptionFromStored(hazard.finding_description);
        const descriptionSimilarity = this.calculateTextSimilarity(
          submissionData.finding_description,
          extractedDescription
        );
        breakdown['Finding Description'] = descriptionSimilarity * weights.finding_description;
        similarityScore += descriptionSimilarity * weights.finding_description;

        similarityScore = Math.min(similarityScore, 1.0);

        if (similarityScore >= similarityThreshold) {
          similarHazards.push({
            ...hazard,
            distance_km: distanceKm,
            similarity_score: similarityScore,
            breakdown
          });
        }
      }

      // Step 5: Filter by threshold
      thinkingGen.addFilteringStep(
        hazards.length,
        similarHazards.length,
        `threshold ≥ ${(similarityThreshold * 100).toFixed(0)}%`
      );

      // Step 6: Rank results
      const sortedHazards = similarHazards.sort((a, b) => {
        if (a.similarity_score !== b.similarity_score) {
          return (b.similarity_score || 0) - (a.similarity_score || 0);
        }
        return (a.distance_km || 999) - (b.distance_km || 999);
      }).slice(0, topN);

      if (sortedHazards.length > 0) {
        thinkingGen.addRankingStep(
          sortedHazards.map(h => ({
            id: h.tracking_id,
            score: h.similarity_score || 0
          }))
        );

        // Add breakdown for top result
        if (sortedHazards[0].breakdown) {
          const topBreakdown = sortedHazards[0].breakdown;
          thinkingGen.addStep(
            thinkingGen['steps'].length + 1,
            'Detail Similaritas Tertinggi',
            `Breakdown skor untuk ${sortedHazards[0].tracking_id}`,
            ThinkingProcessGenerator.formatBreakdown(topBreakdown),
            'success'
          );
        }
      }

      // Remove breakdown from final results
      const finalResults = sortedHazards.map(({ breakdown, ...rest }) => rest);

      const summary = finalResults.length > 0
        ? `Ditemukan ${finalResults.length} laporan serupa dari ${hazards.length} kandidat`
        : `Tidak ada laporan serupa dari ${hazards.length} kandidat yang dianalisis`;

      return {
        similarHazards: finalResults,
        thinkingProcess: thinkingGen.build(summary, {
          category: 'similarity-detection',
          candidatesAnalyzed: hazards.length,
          finalResults: finalResults.length,
          configUsed: { timeWindowDays, locationRadiusKm, similarityThreshold, topN }
        })
      };

    } catch (error) {
      console.error('Error in similarity detection:', error);
      thinkingGen.addWarningStep('Error sistem', String(error));
      return {
        similarHazards: [],
        thinkingProcess: thinkingGen.build('Gagal melakukan analisis similaritas')
      };
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private normalizeText(text: string): string {
    return text.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  private extractDescriptionFromStored(storedDescription: string): string {
    if (!storedDescription) return '';
    
    const deskripsiPattern = /Deskripsi Temuan:\s*(.+?)(?:\n|$)/i;
    const match = storedDescription.match(deskripsiPattern);
    
    if (match && match[1]) {
      return match[1].trim();
    }
    
    return storedDescription;
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;

    const normalized1 = this.normalizeText(text1);
    const normalized2 = this.normalizeText(text2);

    if (normalized1 === normalized2) return 1.0;

    const words1 = new Set(normalized1.split(/\s+/));
    const words2 = new Set(normalized2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    const jaccardSimilarity = intersection.size / union.size;

    const levenshteinDistance = this.levenshteinDistance(normalized1, normalized2);
    const maxLength = Math.max(normalized1.length, normalized2.length);
    const levenshteinSimilarity = maxLength > 0 ? 1 - (levenshteinDistance / maxLength) : 0;

    return (jaccardSimilarity * 0.6) + (levenshteinSimilarity * 0.4);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }
}

export const similarityDetectionService = new SimilarityDetectionService();
