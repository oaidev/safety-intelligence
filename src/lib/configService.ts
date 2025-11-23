import { supabase } from '@/integrations/supabase/client';

class ConfigService {
  private static instance: ConfigService;
  private cache: Record<string, any> = {};
  private cacheExpiry: Record<string, number> = {};
  private CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  async get(configId: string): Promise<any> {
    // Check cache first
    const now = Date.now();
    if (this.cache[configId] && this.cacheExpiry[configId] > now) {
      return this.cache[configId];
    }

    // Fetch from database
    const { data, error } = await supabase
      .from('system_configurations')
      .select('value')
      .eq('id', configId)
      .single();

    if (error || !data) {
      console.error(`Failed to load config ${configId}:`, error);
      return null;
    }

    // Cache the value
    this.cache[configId] = data.value;
    this.cacheExpiry[configId] = now + this.CACHE_TTL;

    return data.value;
  }

  async getMultiple(configIds: string[]): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    
    await Promise.all(
      configIds.map(async (id) => {
        results[id] = await this.get(id);
      })
    );

    return results;
  }

  clearCache() {
    this.cache = {};
    this.cacheExpiry = {};
  }
}

export const configService = ConfigService.getInstance();
