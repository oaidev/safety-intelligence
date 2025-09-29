import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BatchAnalysisRequest {
  hazardDescription: string;
  analyses: {
    knowledgeBaseId: string;
    knowledgeBaseName: string;
    color: string;
    retrievedContext: string;
    promptTemplate: string;
  }[];
}

interface BatchAnalysisResponse {
  results: {
    knowledgeBaseId: string;
    knowledgeBaseName: string;
    category: string;
    confidence: string;
    reasoning: string;
    color: string;
    processingTime: number;
  }[];
  totalProcessingTime: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { hazardDescription, analyses }: BatchAnalysisRequest = await req.json();
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not found');
    }

    console.log(`[BatchAnalysis] Processing batch analysis for ${analyses.length} knowledge bases`);
    const startTime = Date.now();
    
    // Create batch prompts for parallel processing
    const batchPromises = analyses.map(async (analysis, index) => {
      const individualStartTime = Date.now();
      
      try {
        // Safely handle undefined values
        const safeContext = analysis.retrievedContext || 'No relevant context found';
        const safeHazardDescription = hazardDescription || 'No hazard description provided';
        
        // Replace placeholders in prompt template
        const finalPrompt = analysis.promptTemplate
          .replace('{RETRIEVED_CONTEXT}', safeContext)
          .replace('{USER_INPUT}', safeHazardDescription);

        console.log(`[BatchAnalysis] Sending request ${index + 1}/${analyses.length} to Gemini API`);

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ text: finalPrompt }],
                },
              ],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 3072,
              },
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[BatchAnalysis] Gemini API error for ${analysis.knowledgeBaseName}:`, errorText);
          throw new Error(`Generation API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        // Debug logging: Log the full response structure
        console.log(`[BatchAnalysis] Raw Gemini response for ${analysis.knowledgeBaseName}:`, JSON.stringify(data, null, 2));
        
        if (!data.candidates || data.candidates.length === 0) {
          console.error(`[BatchAnalysis] No candidates in response:`, data);
          throw new Error('No response generated from API');
        }

        // Safely access nested properties with more robust parsing
        const candidate = data.candidates[0];
        console.log(`[BatchAnalysis] Candidate structure:`, JSON.stringify(candidate, null, 2));
        
         let fullResponse = '';
         let isPartialResponse = false;
         
         // Check for MAX_TOKENS finish reason first
         if (candidate?.finishReason === 'MAX_TOKENS') {
           console.log(`[BatchAnalysis] MAX_TOKENS detected for ${analysis.knowledgeBaseName}`);
           isPartialResponse = true;
           
           // Try to get partial content
           if (candidate?.content?.parts?.[0]?.text) {
             fullResponse = candidate.content.parts[0].text;
           } else {
             // Provide a fallback response when content is completely truncated
             fullResponse = 'KATEGORI HAZARD: Response Truncated\nCONFIDENCE: Low\nALASAN: Analysis was incomplete due to token limits. Please try with a shorter hazard description or simpler context.';
           }
         } else {
           // Try multiple response structures for complete responses
           if (candidate?.content?.parts?.[0]?.text) {
             fullResponse = candidate.content.parts[0].text;
           } else if (candidate?.output) {
             fullResponse = candidate.output;
           } else if (candidate?.text) {
             fullResponse = candidate.text;
           } else if (typeof candidate === 'string') {
             fullResponse = candidate;
           } else {
             console.error(`[BatchAnalysis] Unexpected response structure:`, candidate);
             // Instead of throwing error, provide a fallback response
             fullResponse = 'KATEGORI HAZARD: Analysis Error\nCONFIDENCE: Unknown\nALASAN: Unable to parse response from API. Please try again.';
             isPartialResponse = true;
           }
         }
         
         if (!fullResponse || fullResponse.trim() === '') {
           fullResponse = 'KATEGORI HAZARD: No Response\nCONFIDENCE: Unknown\nALASAN: No response generated from API.';
           isPartialResponse = true;
         }
        
        console.log(`[BatchAnalysis] Parsed response for ${analysis.knowledgeBaseName}:`, fullResponse);
        
         // Parse response
         const categoryMatch = fullResponse.match(/KATEGORI(?:\s+\w+)?:\s*(.+?)(?:\n|$)/i);
         const confidenceMatch = fullResponse.match(/CONFIDENCE:\s*(.+?)(?:\n|$)/i);
         const reasoningMatch = fullResponse.match(/ALASAN:\s*(.+?)$/is);

         let category = categoryMatch?.[1]?.trim() || 'Unknown';
         let confidence = confidenceMatch?.[1]?.trim() || 'Unknown';
         let reasoning = reasoningMatch?.[1]?.trim() || 'No reasoning provided';
         
         // Add indicators for partial responses
         if (isPartialResponse) {
           if (category !== 'Response Truncated' && category !== 'Analysis Error' && category !== 'No Response') {
             category += ' (Partial)';
           }
           if (confidence === 'Unknown') {
             confidence = 'Low (Truncated)';
           }
         }

        const processingTime = Date.now() - individualStartTime;
        
        console.log(`[BatchAnalysis] Completed analysis for ${analysis.knowledgeBaseName} in ${processingTime}ms`);

        return {
          knowledgeBaseId: analysis.knowledgeBaseId,
          knowledgeBaseName: analysis.knowledgeBaseName,
          category,
          confidence,
          reasoning,
          color: analysis.color,
          processingTime,
        };
      } catch (error) {
        const processingTime = Date.now() - individualStartTime;
        console.error(`[BatchAnalysis] Error processing ${analysis.knowledgeBaseName}:`, error);
        
        return {
          knowledgeBaseId: analysis.knowledgeBaseId,
          knowledgeBaseName: analysis.knowledgeBaseName,
          category: 'Error',
          confidence: '0%',
          reasoning: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          color: analysis.color,
          processingTime,
        };
      }
    });

    // Wait for all analyses to complete
    const results = await Promise.all(batchPromises);
    const totalProcessingTime = Date.now() - startTime;

    console.log(`[BatchAnalysis] Batch analysis completed in ${totalProcessingTime}ms`);

    const response: BatchAnalysisResponse = {
      results,
      totalProcessingTime,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in batch-analysis function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      results: [],
      totalProcessingTime: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});