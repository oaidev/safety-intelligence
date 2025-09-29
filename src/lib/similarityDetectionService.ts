import { supabase } from '@/integrations/supabase/client';

export interface SimilarHazardData {
  id: string;
  tracking_id: string;
  reporter_name: string;
  location: string;
  non_compliance: string;
  sub_non_compliance: string;
  finding_description: string;
  created_at: string;
  latitude?: number;
  longitude?: number;
  distance_km?: number;
  similarity_score?: number;
}

export interface HazardSubmissionData {
  location: string;
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

      // Base query for similar hazards in the last 30 days
      let query = supabase
        .from('hazard_reports')
        .select(`
          id,
          tracking_id,
          reporter_name,
          location,
          non_compliance,
          sub_non_compliance,
          finding_description,
          created_at,
          latitude,
          longitude
        `)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

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
        let isSimilar = false;
        let distanceKm: number | undefined;
        let similarityScore = 0;

        // Check location similarity (within 1km radius)
        if (hasValidCoords && hazard.latitude && hazard.longitude) {
          distanceKm = this.calculateDistance(
            lat,
            lng,
            hazard.latitude,
            hazard.longitude
          );

          if (distanceKm <= 1.0) {
            isSimilar = true;
            similarityScore += 0.4; // Location weight
          }
        }

        // Check location name similarity
        if (this.normalizeText(hazard.location) === this.normalizeText(submissionData.location)) {
          isSimilar = true;
          similarityScore += 0.3; // Location name weight
        }

        // Check non-compliance similarity
        if (this.normalizeText(hazard.non_compliance) === this.normalizeText(submissionData.non_compliance)) {
          isSimilar = true;
          similarityScore += 0.2; // Non-compliance weight
        }

        // Check sub non-compliance similarity
        if (this.normalizeText(hazard.sub_non_compliance) === this.normalizeText(submissionData.sub_non_compliance)) {
          isSimilar = true;
          similarityScore += 0.1; // Sub non-compliance weight
        }

        // Only include if similarity score is above threshold
        if (isSimilar && similarityScore >= 0.3) {
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
   * Check for exact duplicate hazards in the last 7 days
   */
  async checkExactDuplicate(submissionData: HazardSubmissionData): Promise<boolean> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('hazard_reports')
        .select('id')
        .eq('location', submissionData.location)
        .eq('non_compliance', submissionData.non_compliance)
        .eq('sub_non_compliance', submissionData.sub_non_compliance)
        .gte('created_at', sevenDaysAgo)
        .limit(1);

      if (error) {
        console.error('Error checking for exact duplicates:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('Error in exact duplicate check:', error);
      return false;
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
}

export const similarityDetectionService = new SimilarityDetectionService();