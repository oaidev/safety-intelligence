// Optimized RAG Service with client-side embeddings and Supabase pgvector
import { pipeline } from '@huggingface/transformers';
import { supabase } from '@/integrations/supabase/client';
import { KNOWLEDGE_BASES } from './knowledgeBase';

export interface DocumentChunk {
  id: string;
  text: string;
  similarity?: number;
  knowledgeBaseId: string;
}

export interface AnalysisResult {
  knowledgeBaseId: string;
  knowledgeBaseName: string;
  category: string;
  confidence: string;
  reasoning: string;
  retrievedContext: DocumentChunk[];
  fullResponse: string; // Added missing property
  color: string;
  processingTime: number;
}

export interface MultiAnalysisResult {
  results: AnalysisResult[];
  totalProcessingTime: number;
  hasErrors: boolean;
  errors: string[];
}

class OptimizedRagService {
  private embeddingModel: any = null;
  private isInitialized = false;

  // Initialize the embedding model
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('[OptimizedRAG] Initializing bge-small-en-v1.5 embedding model...');
    
    try {
      this.embeddingModel = await pipeline(
        'feature-extraction',
        'Xenova/bge-small-en-v1.5',
        { device: 'webgpu' }
      );
      
      this.isInitialized = true;
      console.log('[OptimizedRAG] Embedding model initialized successfully');
    } catch (error) {
      console.warn('[OptimizedRAG] WebGPU not available, falling back to CPU');
      
      // Fallback to CPU if WebGPU is not available
      this.embeddingModel = await pipeline(
        'feature-extraction',
        'Xenova/bge-small-en-v1.5'
      );
      
      this.isInitialized = true;
      console.log('[OptimizedRAG] Embedding model initialized on CPU');
    }
  }

  // Generate embeddings using local model
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log(`[OptimizedRAG] Generating local embedding for text: ${text.substring(0, 100)}...`);
    
    const result = await this.embeddingModel(text, { pooling: 'mean', normalize: true });
    const embedding = Array.from(result.data) as number[];
    
    console.log(`[OptimizedRAG] Generated embedding with dimension: ${embedding.length}`);
    return embedding;
  }

  // Check if knowledge bases are populated in database
  async checkKnowledgeBasesPopulated(): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('knowledge_base_chunks')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('[OptimizedRAG] Error checking knowledge base population:', error);
        return false;
      }

      const isPopulated = (count || 0) > 0;
      console.log(`[OptimizedRAG] Knowledge bases populated: ${isPopulated} (${count} chunks)`);
      return isPopulated;
    } catch (error) {
      console.error('[OptimizedRAG] Error checking knowledge base population:', error);
      return false;
    }
  }

  // Populate knowledge bases with pre-computed embeddings
  async populateKnowledgeBases(): Promise<void> {
    console.log('[OptimizedRAG] Populating knowledge bases with pre-computed embeddings...');
    
    if (!this.isInitialized) {
      await this.initialize();
    }

    for (const [kbId, config] of Object.entries(KNOWLEDGE_BASES)) {
      try {
        console.log(`[OptimizedRAG] Processing ${config.name}...`);
        
        // Split content into chunks
        const chunks = this.splitIntoChunks(config.content);
        console.log(`[OptimizedRAG] Split ${config.name} into ${chunks.length} chunks`);
        
        // Generate embeddings for all chunks
        const chunksWithEmbeddings = [];
        for (let i = 0; i < chunks.length; i++) {
          const text = chunks[i];
          const embedding = await this.generateEmbedding(text);
          
          chunksWithEmbeddings.push({
            knowledge_base_id: kbId,
            chunk_text: text,
            embedding: JSON.stringify(embedding), // pgvector expects array as string
            chunk_index: i,
          });
          
          console.log(`[OptimizedRAG] Processed chunk ${i + 1}/${chunks.length} for ${config.name}`);
        }
        
        // Insert chunks into database
        const { error } = await supabase
          .from('knowledge_base_chunks')
          .insert(chunksWithEmbeddings);
          
        if (error) {
          console.error(`[OptimizedRAG] Error inserting chunks for ${config.name}:`, error);
          throw error;
        }
        
        console.log(`[OptimizedRAG] Successfully inserted ${chunksWithEmbeddings.length} chunks for ${config.name}`);
      } catch (error) {
        console.error(`[OptimizedRAG] Error processing ${config.name}:`, error);
        throw error;
      }
    }
    
    console.log('[OptimizedRAG] All knowledge bases populated successfully');
  }

  // Split text into chunks
  splitIntoChunks(text: string): string[] {
    return text
      .split(/\n\s*\n/)
      .map(chunk => chunk.trim())
      .filter(chunk => chunk.length > 50);
  }

  // Retrieve similar chunks using pgvector similarity search
  async retrieveContext(
    queryEmbedding: number[],
    knowledgeBaseId: string,
    topK: number = 3
  ): Promise<DocumentChunk[]> {
    console.log(`[OptimizedRAG] Retrieving context for ${knowledgeBaseId} with topK=${topK}`);
    
    try {
      // Convert embedding array to pgvector format
      const embeddingString = `[${queryEmbedding.join(',')}]`;
      
      // Use pgvector's cosine similarity search with proper typing
      const { data, error } = await supabase.rpc('similarity_search' as any, {
        query_embedding: embeddingString,
        kb_id: knowledgeBaseId, // Updated parameter name to match function
        match_count: topK
      });
      
      if (error) {
        console.error(`[OptimizedRAG] Error in similarity search for ${knowledgeBaseId}:`, error);
        
        // Fallback to regular query without similarity
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('knowledge_base_chunks')
          .select('id, chunk_text, knowledge_base_id')
          .eq('knowledge_base_id', knowledgeBaseId)
          .limit(topK);
          
        if (fallbackError) {
          throw fallbackError;
        }
        
        return (fallbackData || []).map(chunk => ({
          id: chunk.id,
          text: chunk.chunk_text,
          knowledgeBaseId: chunk.knowledge_base_id,
          similarity: 0.5, // Default similarity for fallback
        }));
      }
      
      const results = Array.isArray(data) ? data.map((chunk: any) => ({
        id: chunk.id,
        text: chunk.chunk_text,
        knowledgeBaseId: chunk.knowledge_base_id,
        similarity: chunk.similarity || 0,
      })) : [];
      
      console.log(`[OptimizedRAG] Retrieved ${results.length} similar chunks for ${knowledgeBaseId}`);
      return results;
    } catch (error) {
      console.error(`[OptimizedRAG] Error retrieving context for ${knowledgeBaseId}:`, error);
      throw error;
    }
  }

  // Optimized multi-analysis with parallel processing
  async analyzeHazardAll(hazardDescription: string): Promise<MultiAnalysisResult> {
    const startTime = Date.now();
    console.log('[OptimizedRAG] Starting optimized multi-knowledge base analysis...');

    try {
      // Initialize model if needed
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Check if knowledge bases are populated
      const isPopulated = await this.checkKnowledgeBasesPopulated();
      if (!isPopulated) {
        console.log('[OptimizedRAG] Knowledge bases not populated, populating now...');
        await this.populateKnowledgeBases();
      }

      // Generate query embedding once
      const queryEmbedding = await this.generateEmbedding(hazardDescription);
      console.log('[OptimizedRAG] Generated query embedding');

      // Retrieve context from all knowledge bases in parallel
      const contextPromises = Object.keys(KNOWLEDGE_BASES).map(async (kbId) => {
        const context = await this.retrieveContext(queryEmbedding, kbId, 3);
        return {
          knowledgeBaseId: kbId,
          context,
        };
      });

      const contextResults = await Promise.all(contextPromises);
      console.log('[OptimizedRAG] Retrieved context from all knowledge bases');

      // Prepare batch analysis request
      const analyses = contextResults.map(({ knowledgeBaseId, context }) => {
        const config = KNOWLEDGE_BASES[knowledgeBaseId];
        const contextText = context
          .map((chunk, index) => `Context ${index + 1}: ${chunk.text}`)
          .join('\n\n');

        return {
          knowledgeBaseId,
          knowledgeBaseName: config.name,
          color: config.color,
          retrievedContext: contextText,
          promptTemplate: config.promptTemplate,
        };
      });

      // Call batch analysis edge function
      console.log('[OptimizedRAG] Calling batch analysis edge function...');
      const { data: batchResponse, error } = await supabase.functions.invoke('batch-analysis', {
        body: {
          hazardDescription,
          analyses,
        },
      });

      if (error) {
        console.error('[OptimizedRAG] Error calling batch analysis:', error);
        throw error;
      }

      const results: AnalysisResult[] = batchResponse.results.map((result: any, index: number) => ({
        ...result,
        retrievedContext: contextResults[index].context,
        fullResponse: `KATEGORI: ${result.category}\nCONFIDENCE: ${result.confidence}\nALASAN: ${result.reasoning}`, // Reconstruct full response
      }));

      const totalProcessingTime = Date.now() - startTime;
      
      console.log(`[OptimizedRAG] Optimized multi-analysis completed in ${totalProcessingTime}ms`);

      return {
        results,
        totalProcessingTime,
        hasErrors: false,
        errors: [],
      };

    } catch (error) {
      const totalProcessingTime = Date.now() - startTime;
      console.error('[OptimizedRAG] Multi-analysis error:', error);
      
      return {
        results: [],
        totalProcessingTime,
        hasErrors: true,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  // Clear all knowledge base data from database
  async clearAllKnowledgeBases(): Promise<void> {
    console.log('[OptimizedRAG] Clearing all knowledge base chunks from database...');
    
    try {
      const { error } = await supabase
        .from('knowledge_base_chunks')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
        
      if (error) {
        console.error('[OptimizedRAG] Error clearing knowledge bases:', error);
        throw error;
      }
      
      console.log('[OptimizedRAG] All knowledge base chunks cleared from database');
    } catch (error) {
      console.error('[OptimizedRAG] Error clearing knowledge bases:', error);
      throw error;
    }
  }
}

export const optimizedRagService = new OptimizedRagService();