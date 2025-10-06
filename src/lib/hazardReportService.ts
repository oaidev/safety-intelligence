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
  async saveHazardReport(formData: HazardReportFormData & { 
    latitude?: string; 
    longitude?: string; 
    isDuplicate?: boolean 
  }): Promise<SavedHazardReport> {
    console.log('[HazardReportService] Saving hazard report:', formData);

    // Determine initial status - mark as duplicate if detected
    const status = formData.isDuplicate ? 'DUPLIKAT' : 'PENDING_REVIEW';

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
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      
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
      
      // Status
      status: status
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

    // Post-save similarity clustering (for analytics only, not for pre-submission detection)
    if (!formData.isDuplicate) {
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
          console.log(`[HazardReportService] Found ${similarReports.length} similar reports for clustering`);
          
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
      } catch (similarityError) {
        console.warn('[HazardReportService] Post-save similarity clustering failed:', similarityError);
      }
    }

    return savedReport;
  }

  /**
   * Get pending hazard reports for evaluator dashboard with pagination
   */
  async getPendingReports(filters?: {
    dateFrom?: string;
    dateTo?: string;
    location?: string;
    status?: string;
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    try {
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
        `, { count: 'exact' })
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

      // Server-side search filter using OR condition
      if (filters?.search) {
        const searchTerm = filters.search;
        query = query.or(`tracking_id.ilike.%${searchTerm}%,reporter_name.ilike.%${searchTerm}%,finding_description.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%,non_compliance.ilike.%${searchTerm}%`);
      }

      // Add pagination with default limit
      const limit = filters?.limit || 50;
      const offset = filters?.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('[HazardReportService] Error fetching reports:', error);
      throw error;
    }
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
        in_progress: reportsData.filter(r => r.status === 'IN_PROGRESS').length,
        completed: reportsData.filter(r => r.status === 'COMPLETED').length,
        pain_points: painPoints.length,
      };
    } catch (error) {
      console.error('[HazardReportService] Error fetching stats:', error);
      throw error;
    }
  }

  /**
   * Get timing analytics for reports
   */
  async getTimingAnalytics(): Promise<{
    avg_review_to_close_days: number;
    avg_submission_interval_hours: number;
  }> {
    try {
      const { data: reports, error } = await supabase
        .from('hazard_reports')
        .select('created_at, evaluated_at, status')
        .in('status', ['COMPLETED', 'DUPLIKAT', 'BUKAN_HAZARD'])
        .not('evaluated_at', 'is', null);

      if (error) {
        console.error('[HazardReportService] Error fetching timing data:', error);
        throw error;
      }

      // Calculate average time from creation to evaluation (review to close)
      let totalReviewDays = 0;
      let reviewCount = 0;
      
      if (reports && reports.length > 0) {
        reports.forEach(report => {
          if (report.evaluated_at) {
            const createdAt = new Date(report.created_at);
            const evaluatedAt = new Date(report.evaluated_at);
            const diffDays = (evaluatedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
            totalReviewDays += diffDays;
            reviewCount++;
          }
        });
      }

      // Calculate average time between submissions
      const { data: allReports, error: allReportsError } = await supabase
        .from('hazard_reports')
        .select('created_at')
        .order('created_at', { ascending: true });

      if (allReportsError) {
        console.error('[HazardReportService] Error fetching submission data:', allReportsError);
        throw allReportsError;
      }

      let totalIntervalHours = 0;
      let intervalCount = 0;

      if (allReports && allReports.length > 1) {
        for (let i = 1; i < allReports.length; i++) {
          const prevReport = new Date(allReports[i - 1].created_at);
          const currentReport = new Date(allReports[i].created_at);
          const diffHours = (currentReport.getTime() - prevReport.getTime()) / (1000 * 60 * 60);
          totalIntervalHours += diffHours;
          intervalCount++;
        }
      }

      return {
        avg_review_to_close_days: reviewCount > 0 ? totalReviewDays / reviewCount : 0,
        avg_submission_interval_hours: intervalCount > 0 ? totalIntervalHours / intervalCount : 0,
      };
    } catch (error) {
      console.error('[HazardReportService] Error calculating timing analytics:', error);
      throw error;
    }
  }
}

export const hazardReportService = HazardReportService.getInstance();