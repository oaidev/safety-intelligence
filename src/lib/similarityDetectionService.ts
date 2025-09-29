import { supabase } from '@/integrations/supabase/client';

export interface SimilarHazardData {
  id: string;
  tracking_id: string;
  reporter_name: string;
  location: string;
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
  non_compliance: string;
  sub_non_compliance: string;
  finding_description: string;
  latitude?: string;
  longitude?: string;
}

class SimilarityDetectionService {
  /**
   * Check for similar hazards before submission
   */
  async checkSimilarHazards(submissionData: HazardSubmissionData): Promise<SimilarHazardData[]> {
    try {
      const lat = parseFloat(submissionData.latitude || '0');
      const lng = parseFloat(submissionData.longitude || '0');
      const hasValidCoords = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;

      // Base query for similar hazards in the last 7 days
      let query = supabase
        .from('hazard_reports')
        .select(`
          id,
          tracking_id,
          reporter_name,
          location,
          detail_location,
          non_compliance,
          sub_non_compliance,
          finding_description,
          status,
          created_at,
          latitude,
          longitude
        `)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      // Add location-based filtering if coordinates are provided
      if (hasValidCoords) {
        query = query.not('latitude', 'is', null).not('longitude', 'is', null);
      }

      const { data: hazards, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching hazards for similarity check:', error);
        return [];
      }

      if (!hazards || hazards.length === 0) {
        return [];
      }

      const similarHazards: SimilarHazardData[] = [];

      for (const hazard of hazards) {
        let similarityScore = 0;
        let distanceKm: number | undefined;

        // 1. Location radius similarity (within 1km radius) - Weight: 0.25
        if (hasValidCoords && hazard.latitude && hazard.longitude) {
          distanceKm = this.calculateDistance(
            lat,
            lng,
            hazard.latitude,
            hazard.longitude
          );

          if (distanceKm <= 1.0) {
            similarityScore += 0.25;
          }
        }

        // 2. Location name exact match - Weight: 0.20
        if (this.normalizeText(hazard.location) === this.normalizeText(submissionData.location)) {
          similarityScore += 0.20;
        }

        // 3. Detail location exact match - Weight: 0.15
        if (submissionData.detail_location && hazard.detail_location && 
            this.normalizeText(hazard.detail_location) === this.normalizeText(submissionData.detail_location)) {
          similarityScore += 0.15;
        }

        // 4. Non-compliance exact match - Weight: 0.15
        if (this.normalizeText(hazard.non_compliance) === this.normalizeText(submissionData.non_compliance)) {
          similarityScore += 0.15;
        }

        // 5. Sub non-compliance exact match - Weight: 0.10
        if (this.normalizeText(hazard.sub_non_compliance) === this.normalizeText(submissionData.sub_non_compliance)) {
          similarityScore += 0.10;
        }

        // 6. Finding description semantic similarity - Weight: 0.15
        const descriptionSimilarity = this.calculateTextSimilarity(
          submissionData.finding_description,
          hazard.finding_description
        );
        similarityScore += descriptionSimilarity * 0.15;

        console.log(`Hazard ${hazard.tracking_id} similarity breakdown:`, {
          location_radius: hasValidCoords && distanceKm && distanceKm <= 1.0 ? 0.25 : 0,
          location_name: this.normalizeText(hazard.location) === this.normalizeText(submissionData.location) ? 0.20 : 0,
          detail_location: submissionData.detail_location && hazard.detail_location && 
                          this.normalizeText(hazard.detail_location) === this.normalizeText(submissionData.detail_location) ? 0.15 : 0,
          non_compliance: this.normalizeText(hazard.non_compliance) === this.normalizeText(submissionData.non_compliance) ? 0.15 : 0,
          sub_non_compliance: this.normalizeText(hazard.sub_non_compliance) === this.normalizeText(submissionData.sub_non_compliance) ? 0.10 : 0,
          description_similarity: descriptionSimilarity * 0.15,
          total_score: similarityScore,
          distance_km: distanceKm
        });

        // Only include if similarity score is above threshold (0.7)
        if (similarityScore >= 0.7) {
          similarHazards.push({
            ...hazard,
            distance_km: distanceKm,
            similarity_score: similarityScore
          });
        }
      }

      // Sort by similarity score descending, then by distance ascending
      return similarHazards.sort((a, b) => {
        if (a.similarity_score !== b.similarity_score) {
          return (b.similarity_score || 0) - (a.similarity_score || 0);
        }
        return (a.distance_km || 999) - (b.distance_km || 999);
      }).slice(0, 5); // Return top 5 most similar

    } catch (error) {
      console.error('Error in similarity detection:', error);
      return [];
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
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

  /**
   * Calculate semantic similarity between two text descriptions
   * Uses a combination of Jaccard similarity and Levenshtein distance
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;

    const normalized1 = this.normalizeText(text1);
    const normalized2 = this.normalizeText(text2);

    if (normalized1 === normalized2) return 1.0;

    // Calculate Jaccard similarity (word overlap)
    const words1 = new Set(normalized1.split(/\s+/));
    const words2 = new Set(normalized2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    const jaccardSimilarity = intersection.size / union.size;

    // Calculate normalized Levenshtein distance
    const levenshteinDistance = this.levenshteinDistance(normalized1, normalized2);
    const maxLength = Math.max(normalized1.length, normalized2.length);
    const levenshteinSimilarity = maxLength > 0 ? 1 - (levenshteinDistance / maxLength) : 0;

    // Combine both metrics (weighted average)
    return (jaccardSimilarity * 0.6) + (levenshteinSimilarity * 0.4);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }
}

export const similarityDetectionService = new SimilarityDetectionService();