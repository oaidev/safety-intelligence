import { ThinkingProcess, ThinkingStep } from '@/components/ThinkingProcessViewer';

/**
 * Utility to generate consistent thinking process steps for various analyses
 */
export class ThinkingProcessGenerator {
  private startTime: number;
  private steps: ThinkingStep[] = [];

  constructor() {
    this.startTime = Date.now();
  }

  addStep(
    step: number,
    name: string,
    description: string,
    details?: string,
    status: 'success' | 'warning' | 'error' = 'success'
  ): void {
    const now = Date.now();
    const duration = now - this.startTime;
    
    this.steps.push({
      step,
      name,
      description,
      timestamp: Date.now(),
      duration,
      details,
      status,
    });
  }

  addConfigStep(configName: string, configValues: Record<string, any>): void {
    const configDetails = Object.entries(configValues)
      .map(([key, value]) => `**${key}**: ${value}`)
      .join('\n');

    this.addStep(
      this.steps.length + 1,
      'Konfigurasi Sistem',
      `Memuat konfigurasi ${configName}`,
      configDetails,
      'success'
    );
  }

  addDatabaseQueryStep(tableName: string, filters: string[], resultCount: number): void {
    const filterDetails = filters.length > 0 
      ? `**Filter diterapkan:**\n${filters.map(f => `• ${f}`).join('\n')}`
      : 'Tanpa filter';

    this.addStep(
      this.steps.length + 1,
      'Query Database',
      `Mengambil data dari tabel ${tableName}`,
      `${filterDetails}\n\n**Hasil**: ${resultCount} records ditemukan`,
      resultCount > 0 ? 'success' : 'warning'
    );
  }

  addCalculationStep(
    calculationName: string,
    method: string,
    result: number,
    breakdown?: Record<string, number>
  ): void {
    let details = `**Metode**: ${method}\n**Hasil**: ${(result * 100).toFixed(1)}%`;
    
    if (breakdown) {
      details += '\n\n**Breakdown:**\n' + Object.entries(breakdown)
        .map(([key, value]) => `• ${key}: ${(value * 100).toFixed(1)}%`)
        .join('\n');
    }

    this.addStep(
      this.steps.length + 1,
      calculationName,
      `Menghitung ${calculationName.toLowerCase()}`,
      details,
      result > 0.7 ? 'success' : 'warning'
    );
  }

  addFilteringStep(
    totalCandidates: number,
    filteredCount: number,
    criteria: string
  ): void {
    const percentage = totalCandidates > 0 ? (filteredCount / totalCandidates * 100).toFixed(1) : '0';
    
    this.addStep(
      this.steps.length + 1,
      'Filtering',
      `Menyaring ${totalCandidates} kandidat berdasarkan ${criteria}`,
      `**Lolos filter**: ${filteredCount} (${percentage}%)\n**Tidak lolos**: ${totalCandidates - filteredCount}`,
      filteredCount > 0 ? 'success' : 'warning'
    );
  }

  addRankingStep(results: Array<{ id: string; score: number }>): void {
    const topResults = results.slice(0, 5);
    const details = topResults
      .map((r, i) => `${i + 1}. ${r.id}: ${(r.score * 100).toFixed(1)}%`)
      .join('\n');

    this.addStep(
      this.steps.length + 1,
      'Ranking',
      `Mengurutkan ${results.length} hasil berdasarkan skor`,
      `**Top 5 Hasil:**\n${details}`,
      'success'
    );
  }

  addClusteringStep(
    totalItems: number,
    clusterCount: number,
    algorithm: string,
    threshold: number
  ): void {
    this.addStep(
      this.steps.length + 1,
      'Clustering',
      `Membentuk cluster dari ${totalItems} item`,
      `**Algoritma**: ${algorithm}\n**Threshold**: ${(threshold * 100).toFixed(1)}%\n**Cluster terbentuk**: ${clusterCount}\n**Item per cluster rata-rata**: ${(totalItems / clusterCount).toFixed(1)}`,
      'success'
    );
  }

  addWarningStep(warningMessage: string, details?: string): void {
    this.addStep(
      this.steps.length + 1,
      'Peringatan',
      warningMessage,
      details,
      'warning'
    );
  }

  build(summary: string, metadata?: Record<string, any>): ThinkingProcess {
    const totalDuration = Date.now() - this.startTime;
    
    return {
      steps: this.steps,
      totalDuration,
      summary,
      metadata,
    };
  }

  static formatBreakdown(values: Record<string, number>): string {
    return Object.entries(values)
      .map(([key, value]) => `• ${key}: ${(value * 100).toFixed(1)}%`)
      .join('\n');
  }

  static formatList(items: string[]): string {
    return items.map((item, i) => `${i + 1}. ${item}`).join('\n');
  }

  static formatPercentage(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
  }

  static formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }
}
