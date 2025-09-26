import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedRow {
  chunk_text: string;
  chunk_index: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const kbId = formData.get('kb_id') as string;
    const kbName = formData.get('kb_name') as string;
    const operationType = formData.get('operation_type') as string;

    if (!file || !kbId || !kbName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting bulk import for KB: ${kbId}, operation: ${operationType}`);

    // Parse CSV/Excel file
    const fileText = await file.text();
    const rows = parseCSV(fileText);
    
    console.log(`Parsed ${rows.length} rows from file`);

    // Validate data
    const validRows = validateRows(rows);
    if (validRows.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid rows found in file' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create import job
    const { data: jobData, error: jobError } = await supabase
      .from('bulk_import_jobs')
      .insert({
        kb_id: kbId,
        kb_name: kbName,
        status: 'processing',
        total_rows: validRows.length,
        processed_rows: 0,
        failed_rows: 0,
        operation_type: operationType
      })
      .select()
      .single();

    if (jobError) {
      console.error('Error creating job:', jobError);
      throw jobError;
    }

    console.log(`Created job ${jobData.id} for ${validRows.length} rows`);

    // Handle different operation types
    if (operationType === 'replace') {
      // Delete existing chunks for this KB
      const { error: deleteError } = await supabase
        .from('knowledge_base_chunks')
        .delete()
        .eq('knowledge_base_id', kbId);

      if (deleteError) {
        console.error('Error deleting existing chunks:', deleteError);
      } else {
        console.log(`Deleted existing chunks for KB: ${kbId}`);
      }
    }

    // Start background processing (don't await)
    processRowsInBackground(supabase, jobData.id, kbId, validRows);

    return new Response(
      JSON.stringify({ 
        success: true, 
        job: jobData,
        message: `Started processing ${validRows.length} rows`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in bulk-import-knowledge-base:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function parseCSV(csvText: string): ParsedRow[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  console.log('CSV headers:', headers);
  
  const rows: ParsedRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length >= 2) {
      const chunkText = values[0]?.trim().replace(/"/g, '') || '';
      const chunkIndex = parseInt(values[1]?.trim().replace(/"/g, '') || '0');
      
      if (chunkText && !isNaN(chunkIndex)) {
        rows.push({
          chunk_text: chunkText,
          chunk_index: chunkIndex
        });
      }
    }
  }
  
  return rows;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current);
  return values;
}

function validateRows(rows: ParsedRow[]): ParsedRow[] {
  return rows.filter(row => {
    return row.chunk_text && 
           row.chunk_text.length > 0 && 
           row.chunk_text.length <= 8000 && // Reasonable text limit
           typeof row.chunk_index === 'number' && 
           row.chunk_index > 0;
  });
}

async function processRowsInBackground(
  supabase: any, 
  jobId: string, 
  kbId: string, 
  rows: ParsedRow[]
) {
  const BATCH_SIZE = 100;
  let processedCount = 0;
  let failedCount = 0;
  const errorLog: any[] = [];

  try {
    // Process in batches
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(rows.length / BATCH_SIZE)}`);
      
      for (const row of batch) {
        try {
          // Generate embedding (using supabase function)
          const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke(
            'generate-embedding',
            { body: { text: row.chunk_text, provider: 'client-side' } }
          );

          if (embeddingError) {
            console.error('Embedding error:', embeddingError);
            failedCount++;
            errorLog.push({
              row: row.chunk_index,
              error: 'Failed to generate embedding',
              details: embeddingError
            });
            continue;
          }

          // Insert chunk with embedding
          const { error: insertError } = await supabase
            .from('knowledge_base_chunks')
            .insert({
              knowledge_base_id: kbId,
              chunk_text: row.chunk_text,
              chunk_index: row.chunk_index,
              client_embedding: embeddingData.embedding,
              embedding_provider: 'client-side'
            });

          if (insertError) {
            console.error('Insert error:', insertError);
            failedCount++;
            errorLog.push({
              row: row.chunk_index,
              error: 'Failed to insert chunk',
              details: insertError
            });
          } else {
            processedCount++;
          }

        } catch (error) {
          console.error('Row processing error:', error);
          failedCount++;
          errorLog.push({
            row: row.chunk_index,
            error: 'Unexpected error',
            details: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Update progress after each batch
      await supabase
        .from('bulk_import_jobs')
        .update({
          processed_rows: processedCount,
          failed_rows: failedCount,
          error_log: errorLog
        })
        .eq('id', jobId);

      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Mark job as completed
    await supabase
      .from('bulk_import_jobs')
      .update({
        status: processedCount === rows.length ? 'completed' : 'failed',
        processed_rows: processedCount,
        failed_rows: failedCount,
        error_log: errorLog,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log(`Job ${jobId} completed: ${processedCount}/${rows.length} rows processed, ${failedCount} failed`);

  } catch (error) {
    console.error('Background processing error:', error);
    
    // Mark job as failed
    await supabase
      .from('bulk_import_jobs')
      .update({
        status: 'failed',
        processed_rows: processedCount,
        failed_rows: failedCount + 1,
        error_log: [...errorLog, { 
          error: 'Background processing failed', 
          details: error instanceof Error ? error.message : String(error) 
        }],
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }
}