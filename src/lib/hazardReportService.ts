import { supabase } from "@/integrations/supabase/client";
import { similarityService } from "./similarityService";

export interface HazardReportFormData {
  // Reporter Information
  reporterName: string;
  reporterPosition?: string;
  reporterCompany?: string;
  
  // Location Details
  site?: string;
  location: string;
  detailLocation?: string;
  locationDescription?: string;
  
  // PJA Information
  areaPjaBc?: string;
  pjaMitraKerja?: string;
  
  // Hazard Details
  observationTool?: string;
  nonCompliance: string;
  subNonCompliance: string;
  quickAction: string;
  findingDescription: string;
  
  // Image
  uploadedImage?: string;
}

export interface SavedHazardReport {
  id: string;
  tracking_id: string;
  status: string;
  created_at: string;
  similar_reports?: any[];
}

export class HazardReportService {
  private static instance: HazardReportService;

  static getInstance(): HazardReportService {
    if (!HazardReportService.instance) {
      HazardReportService.instance = new HazardReportService();
    }
    return HazardReportService.instance;
  }

  /**
   * Save a hazard report to the database
   */
  async saveHazardReport(formData: HazardReportFormData): Promise<SavedHazardReport> {
    console.log('[HazardReportService] Saving hazard report:', formData);

    const reportData = {
      // Reporter Information
      reporter_name: formData.reporterName,
      reporter_position: formData.reporterPosition,
      reporter_company: formData.reporterCompany,
      
      // Location Details
      site: formData.site,
      location: formData.location,
      detail_location: formData.detailLocation,
      location_description: formData.locationDescription,
      
      // PJA Information
      area_pja_bc: formData.areaPjaBc,
      pja_mitra_kerja: formData.pjaMitraKerja,
      
      // Hazard Details
      observation_tool: formData.observationTool,
      non_compliance: formData.nonCompliance,
      sub_non_compliance: formData.subNonCompliance,
      quick_action: formData.quickAction,
      finding_description: formData.findingDescription,
      
      // Image
      image_base64: formData.uploadedImage,
      
      // Default status
      status: 'PENDING_REVIEW'
    };

    const { data: savedReport, error } = await supabase
      .from('hazard_reports')
      .insert([reportData])
      .select('id, tracking_id, status, created_at')
      .single();

    if (error) {
      console.error('[HazardReportService] Error saving report:', error);
      throw new Error(`Failed to save hazard report: ${error.message}`);
    }

    console.log('[HazardReportService] Report saved successfully:', savedReport);

    // Find similar reports and create clusters if needed
    try {
      const similarReports = await similarityService.findSimilarReports({
        id: savedReport.id,
        tracking_id: savedReport.tracking_id,
        reporter_name: formData.reporterName,
        location: formData.location,
        non_compliance: formData.nonCompliance,
        sub_non_compliance: formData.subNonCompliance,
        finding_description: formData.findingDescription,
        status: savedReport.status,
        created_at: savedReport.created_at,
      });

      if (similarReports.length > 0) {
        console.log(`[HazardReportService] Found ${similarReports.length} similar reports`);
        
        // Create a cluster including the current report
        const allReports = [...similarReports, { 
          id: savedReport.id,
          tracking_id: savedReport.tracking_id,
          reporter_name: formData.reporterName,
          location: formData.location,
          non_compliance: formData.nonCompliance,
          sub_non_compliance: formData.subNonCompliance,
          finding_description: formData.findingDescription,
          status: savedReport.status,
          created_at: savedReport.created_at,
        }];
        
        await similarityService.createSimilarityCluster(allReports);
      }

      return {
        ...savedReport,
        similar_reports: similarReports
      };
    } catch (similarityError) {
      console.warn('[HazardReportService] Similarity analysis failed, but report was saved:', similarityError);
      return savedReport;
    }
  }

  /**
   * Get pending hazard reports for evaluator dashboard
   */
  async getPendingReports(filters?: {
    dateFrom?: string;
    dateTo?: string;
    location?: string;
    status?: string;
    category?: string;
    search?: string;
  }): Promise<any[]> {
    let query = supabase
      .from('hazard_reports')
      .select(`
        *,
        hazard_action_items (
          id,
          jenis_tindakan,
          status,
          due_date,
          priority_level
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }
    
    if (filters?.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }
    
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters?.category) {
      query = query.eq('non_compliance', filters.category);
    }

    const { data: reports, error } = await query;

    if (error) {
      console.error('[HazardReportService] Error fetching reports:', error);
      throw error;
    }

    // Apply search filter client-side for complex text search
    let filteredReports = reports || [];
    
    if (filters?.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredReports = filteredReports.filter(report => 
        report.tracking_id.toLowerCase().includes(searchTerm) ||
        report.reporter_name.toLowerCase().includes(searchTerm) ||
        report.location.toLowerCase().includes(searchTerm) ||
        report.finding_description.toLowerCase().includes(searchTerm) ||
        report.non_compliance.toLowerCase().includes(searchTerm)
      );
    }

    return filteredReports;
  }

  /**
   * Get a single hazard report with related data
   */
  async getHazardReport(id: string): Promise<any> {
    const { data: report, error } = await supabase
      .from('hazard_reports')
      .select(`
        *,
        hazard_action_items (
          id,
          jenis_tindakan,
          alur_permasalahan,
          tindakan,
          due_date,
          status,
          priority_level,
          assigned_to,
          created_at,
          updated_at
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Hazard report not found');
      }
      console.error('[HazardReportService] Error fetching report:', error);
      throw error;
    }

    // Get similar reports if part of a cluster
    let similarReports: any[] = [];
    if (report.similarity_cluster_id) {
      const clusterReports = await similarityService.getClusterReports(report.similarity_cluster_id);
      similarReports = clusterReports.filter(r => r.id !== report.id);
    }

    return {
      ...report,
      similar_reports: similarReports
    };

    
  }

  /**
   * Update hazard report evaluation
   */
  async updateHazardEvaluation(id: string, evaluationData: {
    kategori_temuan?: string;
    root_cause_analysis?: string;
    corrective_actions?: string;
    preventive_measures?: string;
    risk_level?: string;
    konfirmasi?: string;
    jenis_tindakan?: string;
    alur_permasalahan?: string;
    tindakan?: string;
    due_date_perbaikan?: string;
    status?: string;
    evaluated_by?: string;
  }): Promise<void> {
    const updateData = {
      ...evaluationData,
      evaluated_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('hazard_reports')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('[HazardReportService] Error updating evaluation:', error);
      throw error;
    }
  }

  /**
   * Add action item to hazard report
   */
  async addActionItem(hazardReportId: string, actionData: {
    jenis_tindakan: string;
    alur_permasalahan: string;
    tindakan: string;
    due_date: string;
    priority_level: string;
    assigned_to?: string;
  }): Promise<void> {
    const { error } = await supabase
      .from('hazard_action_items')
      .insert([{
        hazard_report_id: hazardReportId,
        ...actionData
      }]);

    if (error) {
      console.error('[HazardReportService] Error adding action item:', error);
      throw error;
    }
  }

  /**
   * Update action item status
   */
  async updateActionItem(actionId: string, updates: {
    status?: string;
    completed_at?: string;
  }): Promise<void> {
    const { error } = await supabase
      .from('hazard_action_items')
      .update(updates)
      .eq('id', actionId);

    if (error) {
      console.error('[HazardReportService] Error updating action item:', error);
      throw error;
    }
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<{
    total_reports: number;
    pending_review: number;
    under_evaluation: number;
    in_progress: number;
    completed: number;
    pain_points: number;
  }> {
    try {
      const { data: reports, error } = await supabase
        .from('hazard_reports')
        .select('status');

      if (error) {
        console.error('[HazardReportService] Error fetching reports:', error);
        throw error;
      }
      
      const reportsData = reports || [];
      const painPoints = await similarityService.getPainPoints();
      
      return {
        total_reports: reportsData.length,
        pending_review: reportsData.filter(r => r.status === 'PENDING_REVIEW').length,
        under_evaluation: reportsData.filter(r => r.status === 'UNDER_EVALUATION').length,
        in_progress: reportsData.filter(r => r.status === 'IN_PROGRESS').length,
        completed: reportsData.filter(r => r.status === 'COMPLETED').length,
        pain_points: painPoints.length,
      };
    } catch (error) {
      console.error('[HazardReportService] Error fetching stats:', error);
      throw error;
    }
  }
}

export const hazardReportService = HazardReportService.getInstance();