// RAG Service for Safety Hazard Analysis using Gemini API

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
}

export interface AnalysisResult {
  category: string;
  confidence: string;
  reasoning: string;
  retrievedContext: DocumentChunk[];
  fullResponse: string;
  processingTime: number;
}

class RagService {
  private apiKey: string = '';
  private chunks: DocumentChunk[] = [];

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Generate embedding using Gemini API
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new Error('API key not set');
    }

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

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.statusText}`);
    }

    const data: EmbeddingResponse = await response.json();
    return data.embedding.values;
  }

  // Generate text using Gemini API
  async generateText(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('API key not set');
    }

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

    if (!response.ok) {
      throw new Error(`Generation API error: ${response.statusText}`);
    }

    const data: GenerationResponse = await response.json();
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
    // Split by double newlines (paragraphs) and filter empty chunks
    return text
      .split(/\n\s*\n/)
      .map(chunk => chunk.trim())
      .filter(chunk => chunk.length > 50); // Only keep meaningful chunks
  }

  // Process knowledge base and create embeddings
  async processKnowledgeBase(knowledgeBase: string): Promise<void> {
    const textChunks = this.splitIntoChunks(knowledgeBase);
    
    this.chunks = [];
    
    for (const text of textChunks) {
      try {
        const embedding = await this.generateEmbedding(text);
        this.chunks.push({ text, embedding });
      } catch (error) {
        console.error('Error generating embedding for chunk:', error);
        // Add chunk without embedding as fallback
        this.chunks.push({ text });
      }
    }
  }

  // Retrieve relevant context based on query
  async retrieveContext(query: string, topK: number = 3): Promise<DocumentChunk[]> {
    if (this.chunks.length === 0) {
      throw new Error('Knowledge base not processed yet');
    }

    try {
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Calculate similarities and sort
      const scoredChunks = this.chunks
        .filter(chunk => chunk.embedding) // Only chunks with embeddings
        .map(chunk => ({
          ...chunk,
          similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding!),
        }))
        .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
        .slice(0, topK);

      return scoredChunks;
    } catch (error) {
      console.error('Error retrieving context:', error);
      // Fallback: return first few chunks
      return this.chunks.slice(0, topK);
    }
  }

  // Main analysis function
  async analyzeHazard(
    hazardDescription: string,
    knowledgeBase: string,
    promptTemplate: string
  ): Promise<AnalysisResult> {
    const startTime = Date.now();

    try {
      // Process knowledge base if not already done or if changed
      if (this.chunks.length === 0) {
        await this.processKnowledgeBase(knowledgeBase);
      }

      // Retrieve relevant context
      const retrievedContext = await this.retrieveContext(hazardDescription);

      // Build context string from retrieved chunks
      const contextText = retrievedContext
        .map((chunk, index) => `Context ${index + 1}: ${chunk.text}`)
        .join('\n\n');

      // Replace placeholders in prompt template
      const finalPrompt = promptTemplate
        .replace('{RETRIEVED_CONTEXT}', contextText)
        .replace('{USER_INPUT}', hazardDescription);

      // Generate final response
      const fullResponse = await this.generateText(finalPrompt);

      // Parse the response to extract category and confidence
      const categoryMatch = fullResponse.match(/KATEGORI:\s*(.+?)(?:\n|$)/i);
      const confidenceMatch = fullResponse.match(/CONFIDENCE:\s*(.+?)(?:\n|$)/i);
      const reasoningMatch = fullResponse.match(/ALASAN:\s*(.+?)$/is);

      const category = categoryMatch?.[1]?.trim() || 'Unknown';
      const confidence = confidenceMatch?.[1]?.trim() || 'Unknown';
      const reasoning = reasoningMatch?.[1]?.trim() || 'No reasoning provided';

      const processingTime = Date.now() - startTime;

      return {
        category,
        confidence,
        reasoning,
        retrievedContext,
        fullResponse,
        processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Clear processed knowledge base (useful when knowledge base changes)
  clearKnowledgeBase(): void {
    this.chunks = [];
  }
}

export const ragService = new RagService();