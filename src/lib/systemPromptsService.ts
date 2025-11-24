import { supabase } from "@/integrations/supabase/client";

export interface SystemPrompt {
  id: string;
  name: string;
  category: string;
  prompt_template: string;
  default_template: string;
  placeholders: string[];
  validation_rules: {
    required_placeholders?: string[];
    min_length?: number;
  };
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const systemPromptsService = {
  // Fetch all system prompts
  async getAllPrompts(): Promise<SystemPrompt[]> {
    const { data, error } = await supabase
      .from('system_prompts')
      .select('*')
      .order('category', { ascending: true });

    if (error) {
      console.error('Error fetching system prompts:', error);
      throw error;
    }

    return (data || []).map(item => ({
      ...item,
      placeholders: item.placeholders as string[],
      validation_rules: item.validation_rules as {
        required_placeholders?: string[];
        min_length?: number;
      }
    }));
  },

  // Fetch a single prompt by ID
  async getPromptById(id: string): Promise<SystemPrompt | null> {
    const { data, error } = await supabase
      .from('system_prompts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching prompt:', error);
      throw error;
    }

    if (!data) return null;

    return {
      ...data,
      placeholders: data.placeholders as string[],
      validation_rules: data.validation_rules as {
        required_placeholders?: string[];
        min_length?: number;
      }
    };
  },

  // Update prompt template
  async updatePromptTemplate(id: string, promptTemplate: string): Promise<void> {
    const { error } = await supabase
      .from('system_prompts')
      .update({ 
        prompt_template: promptTemplate,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating prompt template:', error);
      throw error;
    }
  },

  // Reset prompt to default
  async resetPromptToDefault(id: string): Promise<void> {
    const prompt = await this.getPromptById(id);
    if (!prompt) {
      throw new Error('Prompt not found');
    }

    await this.updatePromptTemplate(id, prompt.default_template);
  },

  // Validate prompt template
  validatePrompt(prompt: SystemPrompt, template: string): { 
    isValid: boolean; 
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check minimum length
    if (prompt.validation_rules.min_length && template.length < prompt.validation_rules.min_length) {
      errors.push(`Prompt harus minimal ${prompt.validation_rules.min_length} karakter`);
    }

    // Check required placeholders
    if (prompt.validation_rules.required_placeholders) {
      for (const placeholder of prompt.validation_rules.required_placeholders) {
        if (!template.includes(placeholder)) {
          errors.push(`Placeholder wajib hilang: ${placeholder}`);
        }
      }
    }

    // Check for all documented placeholders (warnings only)
    for (const placeholder of prompt.placeholders) {
      if (!template.includes(placeholder)) {
        warnings.push(`Placeholder opsional tidak digunakan: ${placeholder}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
};