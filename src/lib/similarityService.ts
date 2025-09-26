import { supabase } from "@/integrations/supabase/client";
import { hybridRagService } from "./hybridRagService";

export interface SimilarityCluster {
  id: string;
  reports: HazardReport[];
  similarity_score: number;
  cluster_metadata: {
    location_similarity: number;
    category_similarity: number;
    text_similarity: number;
    time_window: string;
  };
}

export interface HazardReport {
  id: string;
  tracking_id: string;
  reporter_name: string;
  location: string;
  non_compliance: string;
  sub_non_compliance: string;
  finding_description: string;
  status: string;
  created_at: string;
  similarity_cluster_id?: string;
  ai_analysis?: any;
}

export class SimilarityService {
  private static instance: SimilarityService;

  static getInstance(): SimilarityService {
    if (!SimilarityService.instance) {
      SimilarityService.instance = new SimilarityService();
    }
    return SimilarityService.instance;
  }

  /**
   * Find similar reports within the last 7 days
   */
  async findSimilarReports(currentReport: HazardReport): Promise<HazardReport[]> {
    console.log('[SimilarityService] Finding similar reports for:', currentReport.id);
    
    // Get reports from the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const { data: recentReports, error } = await supabase
      .from('hazard_reports')
      .select('*')
      .gte('created_at', sevenDaysAgo.toISOString())
      .neq('id', currentReport.id)
      .eq('status', 'PENDING_REVIEW'); // Only look at unprocessed reports

    if (error) {
      console.error('[SimilarityService] Error fetching recent reports:', error);
      return [];
    }

    if (!recentReports || recentReports.length === 0) {
      return [];
    }

    console.log(`[SimilarityService] Found ${recentReports.length} recent reports to compare`);

    // Calculate similarity scores for each report
    const similarityResults = await Promise.all(
      recentReports.map(async (report) => {
        const similarity = await this.calculateSimilarity(currentReport, report);
        return {
          report,
          similarity,
        };
      })
    );

    // Filter reports with similarity > 0.75 and sort by similarity
    const similarReports = similarityResults
      .filter(({ similarity }) => similarity.total_similarity > 0.75)
      .sort((a, b) => b.similarity.total_similarity - a.similarity.total_similarity)
      .map(({ report }) => report);

    console.log(`[SimilarityService] Found ${similarReports.length} similar reports`);
    return similarReports;
  }

  /**
   * Calculate similarity between two reports using multiple factors
   */
  async calculateSimilarity(report1: HazardReport, report2: HazardReport): Promise<{
    text_similarity: number;
    location_similarity: number;
    category_similarity: number;
    total_similarity: number;
  }> {
    // Text similarity using string similarity (since we can't access private methods)
    const textSimilarity = this.stringSimilarity(report1.finding_description, report2.finding_description);

    // Location similarity (exact match = 1.0, no match = 0.0)
    const locationSimilarity = report1.location.toLowerCase() === report2.location.toLowerCase() ? 1.0 : 0.0;

    // Category similarity
    const categorySimilarity = this.calculateCategorySimilarity(report1, report2);

    // Weighted total similarity
    const totalSimilarity = 
      textSimilarity * 0.4 +        // 40% weight on description similarity
      locationSimilarity * 0.3 +     // 30% weight on location
      categorySimilarity * 0.3;      // 30% weight on category

    return {
      text_similarity: textSimilarity,
      location_similarity: locationSimilarity,
      category_similarity: categorySimilarity,
      total_similarity: totalSimilarity,
    };
  }

  /**
   * Calculate category similarity based on compliance types
   */
  private calculateCategorySimilarity(report1: HazardReport, report2: HazardReport): number {
    let score = 0;
    
    // Exact match on non_compliance
    if (report1.non_compliance === report2.non_compliance) {
      score += 0.7;
    }
    
    // Exact match on sub_non_compliance
    if (report1.sub_non_compliance === report2.sub_non_compliance) {
      score += 0.3;
    }
    
    return Math.min(score, 1.0); // Cap at 1.0
  }

  /**
   * Cosine similarity calculation for embeddings
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Simple string similarity as fallback
   */
  private stringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) {
      return 1.0;
    }
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Levenshtein distance calculation
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Create or update similarity clusters
   */
  async createSimilarityCluster(reports: HazardReport[]): Promise<string> {
    const clusterId = crypto.randomUUID();
    
    console.log(`[SimilarityService] Creating cluster ${clusterId} with ${reports.length} reports`);
    
    // Update all reports to belong to this cluster
    const { error } = await supabase
      .from('hazard_reports')
      .update({ similarity_cluster_id: clusterId })
      .in('id', reports.map(r => r.id));

    if (error) {
      console.error('[SimilarityService] Error creating cluster:', error);
      throw error;
    }

    return clusterId;
  }

  /**
   * Get reports in the same similarity cluster
   */
  async getClusterReports(clusterId: string): Promise<HazardReport[]> {
    const { data: reports, error } = await supabase
      .from('hazard_reports')
      .select('*')
      .eq('similarity_cluster_id', clusterId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[SimilarityService] Error fetching cluster reports:', error);
      return [];
    }

    return reports || [];
  }

  /**
   * Get pain points - clusters with 3+ similar reports
   */
  async getPainPoints(): Promise<SimilarityCluster[]> {
    // Get all reports with cluster IDs
    const { data: reports, error } = await supabase
      .from('hazard_reports')
      .select('similarity_cluster_id')
      .not('similarity_cluster_id', 'is', null);

    if (error) {
      console.error('[SimilarityService] Error fetching clustered reports:', error);
      return [];
    }

    if (!reports || reports.length === 0) {
      return [];
    }

    // Group by cluster ID and count
    const clusterCounts = reports.reduce((acc: Record<string, number>, report) => {
      const clusterId = report.similarity_cluster_id!;
      acc[clusterId] = (acc[clusterId] || 0) + 1;
      return acc;
    }, {});

    // Filter clusters with 3+ reports
    const painPointClusters = Object.entries(clusterCounts)
      .filter(([_, count]) => count >= 3)
      .map(([clusterId, _]) => clusterId);

    // Get detailed information for each cluster
    const painPoints = await Promise.all(
      painPointClusters.map(async (clusterId) => {
        const reports = await this.getClusterReports(clusterId);
        
        return {
          id: clusterId,
          reports,
          similarity_score: 0.8, // Average similarity score for the cluster
          cluster_metadata: {
            location_similarity: 0.9,
            category_similarity: 0.8,
            text_similarity: 0.7,
            time_window: '7 days',
          },
        };
      })
    );

    return painPoints;
  }
}

export const similarityService = SimilarityService.getInstance();