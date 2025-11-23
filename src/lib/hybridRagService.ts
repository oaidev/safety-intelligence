// Hybrid RAG Service with Google Gemini and Client-side Embeddings
import { pipeline } from '@huggingface/transformers';
import { supabase } from '@/integrations/supabase/client';
import type { ThinkingStep, ThinkingProcess } from './scoringService';
import { configService } from './configService';
import { KNOWLEDGE_BASES } from './knowledgeBase';

export type EmbeddingProvider = 'google' | 'client-side';

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
  fullResponse: string;
  color: string;
  processingTime: number;
  embeddingProvider?: EmbeddingProvider;
  thinkingProcess?: ThinkingProcess;
}

export interface MultiAnalysisResult {
  results: AnalysisResult[];
  totalProcessingTime: number;
  hasErrors: boolean;
  errors: string[];
  embeddingProvider: EmbeddingProvider;
}

export interface ServiceStatus {
  isGoogleReady: boolean;
  isClientSideReady: boolean;
  clientSideProgress: number;
  currentProvider: EmbeddingProvider;
  isPopulated: boolean;
}

class HybridRagService {
  private clientSideModel: any = null;
  private isClientSideReady = false;
  private clientSideInitProgress = 0;
  private currentProvider: EmbeddingProvider = 'google';
  private statusCallbacks: Set<(status: ServiceStatus) => void> = new Set();

  constructor() {
    // Start background initialization
    this.initializeClientSideInBackground();
  }

  // Subscribe to status updates
  onStatusUpdate(callback: (status: ServiceStatus) => void) {
    this.statusCallbacks.add(callback);
    // Send current status immediately
    callback(this.getStatus());
    return () => this.statusCallbacks.delete(callback);
  }

  // Get current service status
  getStatus(): ServiceStatus {
    return {
      isGoogleReady: true, // Google is always ready (uses API)
      isClientSideReady: this.isClientSideReady,
      clientSideProgress: this.clientSideInitProgress,
      currentProvider: this.currentProvider,
      isPopulated: false, // Will be checked separately
    };
  }

  // Notify all status listeners
  private notifyStatusUpdate() {
    const status = this.getStatus();
    this.statusCallbacks.forEach(callback => callback(status));
  }

  // Initialize client-side model in background
  private async initializeClientSideInBackground() {
    console.log('[HybridRAG] Starting client-side model download in background...');
    
    try {
      this.clientSideInitProgress = 10;
      this.notifyStatusUpdate();

      // Try WebGPU first
      try {
        console.log('[HybridRAG] Attempting WebGPU initialization...');
        this.clientSideInitProgress = 30;
        this.notifyStatusUpdate();

        this.clientSideModel = await pipeline(
          'feature-extraction',
          'Xenova/bge-small-en-v1.5',
          { device: 'webgpu' }
        );
        console.log('[HybridRAG] Client-side model initialized with WebGPU');
      } catch (error) {
        console.log('[HybridRAG] WebGPU failed, falling back to CPU...');
        this.clientSideInitProgress = 50;
        this.notifyStatusUpdate();

        this.clientSideModel = await pipeline(
          'feature-extraction',
          'Xenova/bge-small-en-v1.5'
        );
        console.log('[HybridRAG] Client-side model initialized with CPU');
      }

      this.clientSideInitProgress = 80;
      this.notifyStatusUpdate();

      // Pre-populate with Google embeddings if not already done
      const isPopulated = await this.checkKnowledgeBasesPopulated();
      if (!isPopulated) {
        console.log('[HybridRAG] Pre-populating with Google embeddings...');
        await this.populateWithGoogleEmbeddings();
      }

      this.clientSideInitProgress = 90;
      this.notifyStatusUpdate();

      // Generate client-side embeddings for existing data
      await this.migrateToClientSideEmbeddings();

      this.isClientSideReady = true;
      this.currentProvider = 'client-side';
      this.clientSideInitProgress = 100;
      this.notifyStatusUpdate();

      console.log('[HybridRAG] Successfully switched to client-side embeddings');
    } catch (error) {
      console.error('[HybridRAG] Client-side initialization failed:', error);
      console.log('[HybridRAG] Staying with Google embeddings');
      this.clientSideInitProgress = 0;
      this.notifyStatusUpdate();
    }
  }

  // Generate embeddings using Google Gemini API
  private async generateGoogleEmbedding(text: string): Promise<number[]> {
    console.log('[HybridRAG] Generating Google embedding...');
    
    const { data, error } = await supabase.functions.invoke('generate-embedding', {
      body: { text }
    });

    if (error) {
      throw new Error(`Google embedding error: ${error.message}`);
    }

    return data.embedding;
  }

  // Generate embeddings using client-side model
  private async generateClientSideEmbedding(text: string): Promise<number[]> {
    if (!this.clientSideModel) {
      throw new Error('Client-side model not initialized');
    }

    console.log('[HybridRAG] Generating client-side embedding...');
    const result = await this.clientSideModel(text, { pooling: 'mean', normalize: true });
    return Array.from(result.data) as number[];
  }

  // Generate embedding using current provider
  private async generateEmbedding(text: string): Promise<number[]> {
    if (this.currentProvider === 'client-side' && this.isClientSideReady) {
      return this.generateClientSideEmbedding(text);
    } else {
      return this.generateGoogleEmbedding(text);
    }
  }

  // Check if knowledge bases are populated
  async checkKnowledgeBasesPopulated(): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('knowledge_base_chunks')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('[HybridRAG] Error checking population:', error);
        return false;
      }

      return (count || 0) > 0;
    } catch (error) {
      console.error('[HybridRAG] Error checking population:', error);
      return false;
    }
  }

  // Populate knowledge bases with Google embeddings
  private async populateWithGoogleEmbeddings(): Promise<void> {
    console.log('[HybridRAG] Populating with Google embeddings...');

    for (const [kbId, config] of Object.entries(KNOWLEDGE_BASES)) {
      try {
        console.log(`[HybridRAG] Processing ${config.name} with Google embeddings...`);
        
        const chunks = this.splitIntoChunks(config.content);
        const chunksWithEmbeddings = [];

        for (let i = 0; i < chunks.length; i++) {
          const text = chunks[i];
          const googleEmbedding = await this.generateGoogleEmbedding(text);
          
          chunksWithEmbeddings.push({
            knowledge_base_id: kbId,
            chunk_text: text,
            google_embedding: JSON.stringify(googleEmbedding),
            embedding_provider: 'google',
            chunk_index: i,
          });
        }

        const { error } = await supabase
          .from('knowledge_base_chunks')
          .insert(chunksWithEmbeddings);

        if (error) {
          console.error(`[HybridRAG] Error inserting Google chunks for ${config.name}:`, error);
          throw error;
        }

        console.log(`[HybridRAG] Successfully inserted ${chunksWithEmbeddings.length} chunks for ${config.name}`);
      } catch (error) {
        console.error(`[HybridRAG] Error processing ${config.name}:`, error);
        throw error;
      }
    }
  }

  // Migrate existing Google embeddings to client-side embeddings
  private async migrateToClientSideEmbeddings(): Promise<void> {
    console.log('[HybridRAG] Migrating to client-side embeddings...');

    try {
      // Get all chunks that don't have client-side embeddings yet
      const { data: chunks, error } = await supabase
        .from('knowledge_base_chunks')
        .select('id, chunk_text')
        .is('client_embedding', null);

      if (error || !chunks) {
        console.error('[HybridRAG] Error fetching chunks for migration:', error);
        return;
      }

      console.log(`[HybridRAG] Migrating ${chunks.length} chunks to client-side embeddings...`);

      // Process in batches to avoid overwhelming the system
      const batchSize = 5;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        
        const updatePromises = batch.map(async (chunk) => {
          const clientEmbedding = await this.generateClientSideEmbedding(chunk.chunk_text);
          
          return supabase
            .from('knowledge_base_chunks')
            .update({ 
              client_embedding: JSON.stringify(clientEmbedding),
              embedding_provider: 'client-side'
            })
            .eq('id', chunk.id);
        });

        await Promise.all(updatePromises);
        console.log(`[HybridRAG] Migrated batch ${i + 1}-${Math.min(i + batchSize, chunks.length)}`);
      }

      console.log('[HybridRAG] Migration to client-side embeddings completed');
    } catch (error) {
      console.error('[HybridRAG] Migration error:', error);
    }
  }

  // Split text into chunks
  splitIntoChunks(text: string): string[] {
    return text
      .split(/\n\s*\n/)
      .map(chunk => chunk.trim())
      .filter(chunk => chunk.length > 50);
  }

  // Retrieve context using current provider
  async retrieveContext(
    queryEmbedding: number[],
    knowledgeBaseId: string,
    topK: number = 3
  ): Promise<DocumentChunk[]> {
    console.log(`[HybridRAG] Retrieving context for ${knowledgeBaseId} using ${this.currentProvider}`);
    
    try {
      const embeddingString = `[${queryEmbedding.join(',')}]`;
      
      const { data, error } = await supabase.rpc('similarity_search_hybrid' as any, {
        query_embedding: embeddingString,
        kb_id: knowledgeBaseId,
        match_count: topK,
        provider: this.currentProvider
      });
      
      if (error) {
        console.error(`[HybridRAG] Error in similarity search:`, error);
        
        // Fallback to regular query
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
          similarity: 0.5,
        }));
      }
      
      const results = Array.isArray(data) ? data.map((chunk: any) => ({
        id: chunk.id,
        text: chunk.chunk_text,
        knowledgeBaseId: chunk.knowledge_base_id,
        similarity: chunk.similarity || 0,
      })) : [];
      
      console.log(`[HybridRAG] Retrieved ${results.length} chunks using ${this.currentProvider}`);
      return results;
    } catch (error) {
      console.error(`[HybridRAG] Error retrieving context:`, error);
      throw error;
    }
  }

  // Main analysis function
  async analyzeHazardAll(hazardDescription: string): Promise<MultiAnalysisResult> {
    const startTime = Date.now();
    console.log(`[HybridRAG] Starting analysis using ${this.currentProvider}...`);
    const thinkingSteps: ThinkingStep[] = [];

    try {
      // Step 1: Check Knowledge Base Population
      const step1Start = Date.now();
      const isPopulated = await this.checkKnowledgeBasesPopulated();
      
      thinkingSteps.push({
        step: 1,
        name: 'Persiapan Knowledge Base',
        description: 'Memeriksa apakah database pengetahuan sudah siap',
        timestamp: step1Start,
        duration: Date.now() - step1Start,
        details: {
          populated: isPopulated,
          provider: this.currentProvider,
          message: isPopulated 
            ? '✅ Database pengetahuan sudah siap dengan embeddings'
            : '⚠️ Perlu populate database dengan Google embeddings',
          explanation: 'Sistem memeriksa apakah semua knowledge base sudah memiliki vector embeddings yang diperlukan untuk pencarian similarity'
        },
        status: 'success'
      });

      if (!isPopulated) {
        console.log('[HybridRAG] Knowledge bases not populated, populating with Google embeddings...');
        await this.populateWithGoogleEmbeddings();
      }

      // Step 2: Generate Query Embedding
      const step2Start = Date.now();
      const queryEmbedding = await this.generateEmbedding(hazardDescription);
      
      thinkingSteps.push({
        step: 2,
        name: 'Generate Query Embedding',
        description: 'Mengubah deskripsi hazard menjadi vector angka untuk pencarian',
        timestamp: step2Start,
        duration: Date.now() - step2Start,
        details: {
          provider: this.currentProvider,
          embeddingLength: queryEmbedding.length,
          sampleValues: queryEmbedding.slice(0, 5).map(v => v.toFixed(4)),
          explanation: this.currentProvider === 'client-side'
            ? '🖥️ Menggunakan AI lokal (Xenova/bge-small-en-v1.5) di browser Anda. Model ini mengubah text menjadi 384-dimensional vector.'
            : '☁️ Menggunakan Google Gemini API untuk embedding. Menghasilkan vector representation dari hazard description Anda.'
        },
        status: 'success'
      });
      
      console.log(`[HybridRAG] Generated query embedding using ${this.currentProvider}`);

      // Load AI configurations
      const configs = await configService.getMultiple([
        'rag_top_k',
        'rag_model',
        'rag_temperature',
        'rag_max_tokens'
      ]);

      const topK = configs.rag_top_k || 3;

      // Step 3: Retrieve Context (Vector Similarity Search)
      const step3Start = Date.now();
      const contextPromises = Object.keys(KNOWLEDGE_BASES).map(async (kbId) => {
        const context = await this.retrieveContext(queryEmbedding, kbId, topK);
        return {
          knowledgeBaseId: kbId,
          context,
        };
      });

      const contextResults = await Promise.all(contextPromises);
      
      thinkingSteps.push({
        step: 3,
        name: 'Pencarian Similarity (Vector Search)',
        description: `Mencari ${topK} dokumen paling relevan dari setiap knowledge base`,
        timestamp: step3Start,
        duration: Date.now() - step3Start,
        details: {
          totalKnowledgeBases: Object.keys(KNOWLEDGE_BASES).length,
          topK: topK,
          retrievedChunks: contextResults.map(r => ({
            kb: KNOWLEDGE_BASES[r.knowledgeBaseId].name,
            chunks: r.context.length,
            avgSimilarity: r.context.length > 0 
              ? (r.context.reduce((sum, c) => sum + (c.similarity || 0), 0) / r.context.length).toFixed(3)
              : '0',
            topChunkPreview: r.context[0]?.text.substring(0, 100) + '...' || 'No context found'
          })),
          explanation: '🔍 Sistem menghitung cosine similarity antara query embedding Anda dan setiap document embedding di database. Semakin tinggi score similarity (mendekati 1.0), semakin relevan dokumen tersebut.',
          configUsed: {
            topK: topK
          }
        },
        status: 'success'
      });

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

      // Step 4: AI Analysis with Gemini
      const step4Start = Date.now();
      console.log('[HybridRAG] Calling batch analysis edge function...');
      const { data: batchResponse, error } = await supabase.functions.invoke('batch-analysis', {
        body: {
          hazardDescription,
          analyses,
        },
      });

      thinkingSteps.push({
        step: 4,
        name: 'AI Analysis dengan Gemini',
        description: 'AI menganalisis hazard berdasarkan context yang ditemukan',
        timestamp: step4Start,
        duration: Date.now() - step4Start,
        details: {
          model: 'gemini-2.5-flash-lite',
          temperature: 0.1,
          maxTokens: 3072,
          analysisCount: batchResponse?.results?.length || 0,
          explanation: '🤖 Gemini AI membaca retrieved context + deskripsi hazard Anda, lalu memberikan kategori, confidence score, dan reasoning berdasarkan knowledge base yang berbeda-beda (Safety Golden Rules, PSPP, TBC).',
          status: error ? 'error' : 'success',
          error: error ? error.message : undefined
        },
        status: error ? 'error' : 'success'
      });

      if (error) {
        console.error('[HybridRAG] Error calling batch analysis:', error);
        throw error;
      }

      const results: AnalysisResult[] = batchResponse.results.map((result: any, index: number) => ({
        ...result,
        retrievedContext: contextResults[index].context,
        fullResponse: `KATEGORI: ${result.category}\nCONFIDENCE: ${result.confidence}\nALASAN: ${result.reasoning}`,
        embeddingProvider: this.currentProvider,
        thinkingProcess: {
          steps: [...thinkingSteps, ...(result.thinkingSteps || [])],
          totalDuration: Date.now() - startTime,
          summary: `Analysis completed using ${this.currentProvider} embeddings in ${Math.round((Date.now() - startTime) / 1000)} seconds`
        }
      }));

      const totalProcessingTime = Date.now() - startTime;
      
      console.log(`[HybridRAG] Analysis completed in ${totalProcessingTime}ms using ${this.currentProvider}`);

      return {
        results,
        totalProcessingTime,
        hasErrors: false,
        errors: [],
        embeddingProvider: this.currentProvider,
      };

    } catch (error) {
      const totalProcessingTime = Date.now() - startTime;
      console.error('[HybridRAG] Analysis error:', error);
      
      return {
        results: [],
        totalProcessingTime,
        hasErrors: true,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        embeddingProvider: this.currentProvider,
      };
    }
  }

  // Clear all knowledge base data
  async clearAllKnowledgeBases(): Promise<void> {
    console.log('[HybridRAG] Clearing all knowledge base chunks...');
    
    try {
      const { error } = await supabase
        .from('knowledge_base_chunks')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
        
      if (error) {
        console.error('[HybridRAG] Error clearing knowledge bases:', error);
        throw error;
      }
      
      console.log('[HybridRAG] All knowledge base chunks cleared');
    } catch (error) {
      console.error('[HybridRAG] Error clearing knowledge bases:', error);
      throw error;
    }
  }
}

export const hybridRagService = new HybridRagService();