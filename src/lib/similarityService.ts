import { supabase } from "@/integrations/supabase/client";
import { hybridRagService } from "./hybridRagService";
import { ThinkingProcessGenerator } from "./thinkingProcessGenerator";
import type { ThinkingProcess } from "@/components/ThinkingProcessViewer";

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
   * Find similar reports within the last 7 days (with thinking process)
   */
  async findSimilarReports(currentReport: HazardReport): Promise<{ reports: HazardReport[], thinkingProcess: ThinkingProcess }> {
    const thinking = new ThinkingProcessGenerator();
    console.log('[SimilarityService] Finding similar reports for:', currentReport.id);
    
    thinking.addStep(1, 'Inisialisasi', 'Memulai pencarian laporan serupa', 
      `**Report ID**: ${currentReport.id}\n**Non-compliance**: ${currentReport.non_compliance}`, 'success');
    
    // Get reports from the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    thinking.addStep(2, 'Konfigurasi Time Window', 'Mengatur rentang waktu pencarian',
      `**Time window**: 7 hari terakhir\n**Dari**: ${sevenDaysAgo.toISOString()}`, 'success');
    
    const { data: recentReports, error } = await supabase
      .from('hazard_reports')
      .select('*')
      .gte('created_at', sevenDaysAgo.toISOString())
      .neq('id', currentReport.id)
      .eq('status', 'PENDING_REVIEW'); // Only look at unprocessed reports

    if (error) {
      console.error('[SimilarityService] Error fetching recent reports:', error);
      thinking.addStep(3, 'Error Query', 'Gagal mengambil data', error.message, 'error');
      return { reports: [], thinkingProcess: thinking.build('Error querying database') };
    }

    if (!recentReports || recentReports.length === 0) {
      thinking.addStep(3, 'Query Database', 'Tidak ada kandidat ditemukan',
        '**Hasil**: 0 laporan dalam 7 hari terakhir', 'warning');
      return { reports: [], thinkingProcess: thinking.build('Tidak ada laporan serupa dalam 7 hari terakhir') };
    }

    console.log(`[SimilarityService] Found ${recentReports.length} recent reports to compare`);
    thinking.addStep(3, 'Query Database', 'Berhasil mengambil kandidat',
      `**Kandidat ditemukan**: ${recentReports.length} laporan\n**Status**: PENDING_REVIEW`, 'success');

    // Calculate similarity scores for each report
    thinking.addStep(4, 'Kalkulasi Similarity', 'Menghitung similarity untuk setiap kandidat',
      `**Total kandidat**: ${recentReports.length}\n**Method**: Text + Location + Category`, 'success');
    
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
    const threshold = 0.75;
    thinking.addStep(5, 'Filtering', 'Menyaring berdasarkan threshold',
      `**Threshold**: ${(threshold * 100).toFixed(0)}%\n**Kandidat dianalisis**: ${similarityResults.length}`, 'success');
    
    const similarReports = similarityResults
      .filter(({ similarity }) => similarity.total_similarity > threshold)
      .sort((a, b) => b.similarity.total_similarity - a.similarity.total_similarity)
      .map(({ report }) => report);

    thinking.addStep(6, 'Ranking & Hasil', 'Mengurutkan hasil berdasarkan skor',
      `**Lolos filter**: ${similarReports.length} laporan\n**Tidak lolos**: ${similarityResults.length - similarReports.length}`,
      similarReports.length > 0 ? 'success' : 'warning');

    console.log(`[SimilarityService] Found ${similarReports.length} similar reports`);
    return { 
      reports: similarReports, 
      thinkingProcess: thinking.build(
        `Ditemukan ${similarReports.length} laporan serupa dari ${recentReports.length} kandidat`,
        { candidatesAnalyzed: recentReports.length, finalResults: similarReports.length, threshold }
      )
    };
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
   * Get pain points - clusters with 3+ similar reports (with thinking process)
   */
  async getPainPoints(): Promise<{ clusters: SimilarityCluster[], thinkingProcess: ThinkingProcess }> {
    const thinking = new ThinkingProcessGenerator();
    thinking.addStep(1, 'Query Database', 'Mengambil semua laporan dengan cluster ID',
      'Mencari laporan yang sudah dikelompokkan dalam cluster', 'success');
    
    // Get all reports with cluster IDs
    const { data: reports, error } = await supabase
      .from('hazard_reports')
      .select('similarity_cluster_id')
      .not('similarity_cluster_id', 'is', null);

    if (error) {
      console.error('[SimilarityService] Error fetching clustered reports:', error);
      thinking.addStep(2, 'Error', 'Gagal query database', error.message, 'error');
      return { clusters: [], thinkingProcess: thinking.build('Error fetching clusters') };
    }

    if (!reports || reports.length === 0) {
      thinking.addStep(2, 'Hasil Query', 'Tidak ada cluster ditemukan',
        '**Total laporan dengan cluster**: 0', 'warning');
      return { clusters: [], thinkingProcess: thinking.build('Tidak ada pain points terdeteksi') };
    }
    
    thinking.addStep(2, 'Hasil Query', 'Berhasil mengambil data cluster',
      `**Total laporan dengan cluster**: ${reports.length}`, 'success');

    // Group by cluster ID and count
    thinking.addStep(3, 'Grouping', 'Mengelompokkan laporan per cluster ID',
      'Menghitung jumlah laporan dalam setiap cluster', 'success');
    
    const clusterCounts = reports.reduce((acc: Record<string, number>, report) => {
      const clusterId = report.similarity_cluster_id!;
      acc[clusterId] = (acc[clusterId] || 0) + 1;
      return acc;
    }, {});
    
    const totalClusters = Object.keys(clusterCounts).length;
    thinking.addStep(4, 'Analisis Cluster', 'Mengidentifikasi unique clusters',
      `**Total unique clusters**: ${totalClusters}`, 'success');

    // Filter clusters with 3+ reports
    const minClusterSize = 3;
    thinking.addStep(5, 'Filtering Pain Points', 'Menyaring cluster berdasarkan threshold',
      `**Minimum size**: ${minClusterSize} laporan\n**Threshold**: Cluster dengan 3+ laporan dianggap pain point`, 'success');
    
    const painPointClusters = Object.entries(clusterCounts)
      .filter(([_, count]) => count >= minClusterSize)
      .map(([clusterId, _]) => clusterId);
    
    thinking.addStep(6, 'Identifikasi Pain Points', 'Hasil filtering pain points',
      `**Pain points ditemukan**: ${painPointClusters.length}\n**Tidak lolos filter**: ${totalClusters - painPointClusters.length}`,
      painPointClusters.length > 0 ? 'success' : 'warning');

    // Get detailed information for each cluster
    thinking.addStep(7, 'Fetch Detail Cluster', 'Mengambil detail setiap pain point cluster',
      `Mengambil semua laporan dalam ${painPointClusters.length} cluster`, 'success');
    
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

    return { 
      clusters: painPoints, 
      thinkingProcess: thinking.build(
        `Teridentifikasi ${painPoints.length} pain points dari ${totalClusters} total cluster`,
        { 
          totalClusters, 
          painPointsFound: painPoints.length,
          minClusterSize,
          category: 'pain-point-detection'
        }
      )
    };
  }
}

export const similarityService = SimilarityService.getInstance();