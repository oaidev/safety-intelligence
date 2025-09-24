// Enhanced RAG Service for Multi-Knowledge Base Analysis

import { KNOWLEDGE_BASES, type KnowledgeBaseConfig } from './knowledgeBase';

export interface EmbeddingResponse {
  embedding: {
    values: number[];
  };
}

export interface GenerationResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export interface DocumentChunk {
  text: string;
  embedding?: number[];
  similarity?: number;
  knowledgeBaseId?: string;
}

export interface AnalysisResult {
  knowledgeBaseId: string;
  knowledgeBaseName: string;
  category: string;
  confidence: string;
  reasoning: string;
  retrievedContext: DocumentChunk[];
  fullResponse: string;
  processingTime: number;
  color: string;
}

export interface MultiAnalysisResult {
  results: AnalysisResult[];
  totalProcessingTime: number;
  hasErrors: boolean;
  errors: string[];
}

class MultiRagService {
  private apiKey: string = '';
  private knowledgeBases: Map<string, DocumentChunk[]> = new Map();

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Generate embedding using Gemini API
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new Error('API key not set');
    }

    console.log(`[MultiRAG] Generating embedding for text: ${text.substring(0, 100)}...`);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: {
            parts: [{ text }],
          },
        }),
      }
    );

    console.log(`[MultiRAG] Embedding API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[MultiRAG] Embedding API error:', errorText);
      throw new Error(`Embedding API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data: EmbeddingResponse = await response.json();
    console.log('[MultiRAG] Embedding generated successfully');
    return data.embedding.values;
  }

  // Generate text using Gemini API
  async generateText(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('API key not set');
    }

    console.log(`[MultiRAG] Generating text with prompt length: ${prompt.length}`);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    console.log(`[MultiRAG] Generation API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[MultiRAG] Generation API error:', errorText);
      throw new Error(`Generation API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data: GenerationResponse = await response.json();
    console.log('[MultiRAG] Text generated successfully');
    
    if (!data.candidates || data.candidates.length === 0) {
      console.error('[MultiRAG] No candidates in response:', data);
      throw new Error('No response generated from API');
    }

    return data.candidates[0]?.content.parts[0]?.text || 'No response generated';
  }

  // Calculate cosine similarity between two vectors
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Split knowledge base into chunks
  splitIntoChunks(text: string): string[] {
    return text
      .split(/\n\s*\n/)
      .map(chunk => chunk.trim())
      .filter(chunk => chunk.length > 50);
  }

  // Process a single knowledge base
  async processKnowledgeBase(knowledgeBaseId: string): Promise<void> {
    const config = KNOWLEDGE_BASES[knowledgeBaseId];
    if (!config) {
      throw new Error(`Knowledge base not found: ${knowledgeBaseId}`);
    }

    console.log(`[MultiRAG] Processing knowledge base: ${config.name}`);
    const textChunks = this.splitIntoChunks(config.content);
    const chunks: DocumentChunk[] = [];
    
    for (const text of textChunks) {
      try {
        const embedding = await this.generateEmbedding(text);
        chunks.push({ 
          text, 
          embedding, 
          knowledgeBaseId 
        });
      } catch (error) {
        console.error(`[MultiRAG] Error generating embedding for chunk in ${knowledgeBaseId}:`, error);
        chunks.push({ 
          text, 
          knowledgeBaseId 
        });
      }
    }
    
    this.knowledgeBases.set(knowledgeBaseId, chunks);
    console.log(`[MultiRAG] Processed ${chunks.length} chunks for ${config.name}`);
  }

  // Process all knowledge bases
  async processAllKnowledgeBases(): Promise<void> {
    console.log('[MultiRAG] Processing all knowledge bases...');
    const promises = Object.keys(KNOWLEDGE_BASES).map(id => 
      this.processKnowledgeBase(id)
    );
    
    await Promise.all(promises);
    console.log('[MultiRAG] All knowledge bases processed');
  }

  // Retrieve relevant context from a specific knowledge base
  async retrieveContext(
    query: string, 
    knowledgeBaseId: string, 
    topK: number = 3
  ): Promise<DocumentChunk[]> {
    const chunks = this.knowledgeBases.get(knowledgeBaseId);
    if (!chunks || chunks.length === 0) {
      throw new Error(`Knowledge base not processed: ${knowledgeBaseId}`);
    }

    try {
      const queryEmbedding = await this.generateEmbedding(query);
      
      const scoredChunks = chunks
        .filter(chunk => chunk.embedding)
        .map(chunk => ({
          ...chunk,
          similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding!),
        }))
        .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
        .slice(0, topK);

      console.log(`[MultiRAG] Retrieved ${scoredChunks.length} relevant chunks from ${knowledgeBaseId}`);
      return scoredChunks;
    } catch (error) {
      console.error(`[MultiRAG] Error retrieving context from ${knowledgeBaseId}:`, error);
      return chunks.slice(0, topK);
    }
  }

  // Analyze hazard against a specific knowledge base
  async analyzeHazardSingle(
    hazardDescription: string,
    knowledgeBaseId: string
  ): Promise<AnalysisResult> {
    const startTime = Date.now();
    const config = KNOWLEDGE_BASES[knowledgeBaseId];

    try {
      console.log(`[MultiRAG] Starting analysis for ${config.name}`);

      // Process knowledge base if not already done
      if (!this.knowledgeBases.has(knowledgeBaseId)) {
        await this.processKnowledgeBase(knowledgeBaseId);
      }

      // Retrieve relevant context
      const retrievedContext = await this.retrieveContext(hazardDescription, knowledgeBaseId);

      // Build context string
      const contextText = retrievedContext
        .map((chunk, index) => `Context ${index + 1}: ${chunk.text}`)
        .join('\n\n');

      // Replace placeholders in prompt template
      const finalPrompt = config.promptTemplate
        .replace('{RETRIEVED_CONTEXT}', contextText)
        .replace('{USER_INPUT}', hazardDescription);

      // Generate response
      const fullResponse = await this.generateText(finalPrompt);

      // Parse response
      const categoryMatch = fullResponse.match(/KATEGORI(?:\s+\w+)?:\s*(.+?)(?:\n|$)/i);
      const confidenceMatch = fullResponse.match(/CONFIDENCE:\s*(.+?)(?:\n|$)/i);
      const reasoningMatch = fullResponse.match(/ALASAN:\s*(.+?)$/is);

      const category = categoryMatch?.[1]?.trim() || 'Unknown';
      const confidence = confidenceMatch?.[1]?.trim() || 'Unknown';
      const reasoning = reasoningMatch?.[1]?.trim() || 'No reasoning provided';

      const processingTime = Date.now() - startTime;

      console.log(`[MultiRAG] Analysis completed for ${config.name} in ${processingTime}ms`);

      return {
        knowledgeBaseId,
        knowledgeBaseName: config.name,
        category,
        confidence,
        reasoning,
        retrievedContext,
        fullResponse,
        processingTime,
        color: config.color,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`[MultiRAG] Analysis failed for ${config.name}:`, error);
      throw new Error(`Analysis failed for ${config.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Analyze hazard against all knowledge bases
  async analyzeHazardAll(hazardDescription: string): Promise<MultiAnalysisResult> {
    const startTime = Date.now();
    console.log('[MultiRAG] Starting multi-knowledge base analysis...');

    const results: AnalysisResult[] = [];
    const errors: string[] = [];

    // Process all knowledge bases in parallel
    const promises = Object.keys(KNOWLEDGE_BASES).map(async (knowledgeBaseId) => {
      try {
        return await this.analyzeHazardSingle(hazardDescription, knowledgeBaseId);
      } catch (error) {
        const errorMessage = `${KNOWLEDGE_BASES[knowledgeBaseId].name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMessage);
        return null;
      }
    });

    const analysisResults = await Promise.allSettled(promises);

    // Process results
    analysisResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        results.push(result.value);
      } else if (result.status === 'rejected') {
        const knowledgeBaseId = Object.keys(KNOWLEDGE_BASES)[index];
        errors.push(`${KNOWLEDGE_BASES[knowledgeBaseId].name}: ${result.reason}`);
      }
    });

    const totalProcessingTime = Date.now() - startTime;

    console.log(`[MultiRAG] Multi-analysis completed in ${totalProcessingTime}ms`);
    console.log(`[MultiRAG] Successful analyses: ${results.length}, Errors: ${errors.length}`);

    return {
      results,
      totalProcessingTime,
      hasErrors: errors.length > 0,
      errors,
    };
  }

  // Get knowledge base configuration
  getKnowledgeBaseConfig(knowledgeBaseId: string): KnowledgeBaseConfig | undefined {
    return KNOWLEDGE_BASES[knowledgeBaseId];
  }

  // Get all knowledge base configurations
  getAllKnowledgeBaseConfigs(): KnowledgeBaseConfig[] {
    return Object.values(KNOWLEDGE_BASES);
  }

  // Clear all processed knowledge bases
  clearAllKnowledgeBases(): void {
    this.knowledgeBases.clear();
    console.log('[MultiRAG] All knowledge bases cleared');
  }

  // Clear specific knowledge base
  clearKnowledgeBase(knowledgeBaseId: string): void {
    this.knowledgeBases.delete(knowledgeBaseId);
    console.log(`[MultiRAG] Knowledge base cleared: ${knowledgeBaseId}`);
  }
}

export const multiRagService = new MultiRagService();