interface TokenExtractResult {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
  found: boolean;
}

/**
 * Streaming token parser that processes SSE stream chunks character-by-character
 * to extract token counts from the usage object without buffering the entire response.
 * 
 * This parser handles:
 * - Tokens split across multiple chunks
 * - Whitespace and formatting variations
 * - SSE format with "data: " prefix
 */
export function extractTokensFromStream(chunks: Buffer[]): TokenExtractResult | null {
  // Accumulate all chunks into a single string
  let combined = '';
  for (const chunk of chunks) {
    combined += chunk.toString('utf8');
  }

  // Find the usage object
  const usageMatch = combined.match(/"usage"\s*:\s*\{[^}]*\}/);
  if (!usageMatch) {
    return null;
  }

  const usageStr = usageMatch[0];
  
  // Extract each token count using regex
  const promptMatch = usageStr.match(/"prompt_tokens"\s*:\s*(\d+)/);
  const completionMatch = usageStr.match(/"completion_tokens"\s*:\s*(\d+)/);
  const totalMatch = usageStr.match(/"total_tokens"\s*:\s*(\d+)/);

  const promptTokens = promptMatch ? parseInt(promptMatch[1], 10) : null;
  const completionTokens = completionMatch ? parseInt(completionMatch[1], 10) : null;
  const totalTokens = totalMatch ? parseInt(totalMatch[1], 10) : null;

  if (promptTokens === null || completionTokens === null || totalTokens === null) {
    return null;
  }

  const cacheCreationMatch = usageStr.match(/"cache_creation_input_tokens"\s*:\s*(\d+)/);
  const cacheReadMatch = usageStr.match(/"cache_read_input_tokens"\s*:\s*(\d+)/);

  const cacheCreationTokens = cacheCreationMatch ? parseInt(cacheCreationMatch[1], 10) : undefined;
  const cacheReadTokens = cacheReadMatch ? parseInt(cacheReadMatch[1], 10) : undefined;

  return {
    promptTokens,
    completionTokens,
    totalTokens,
    cacheCreationInputTokens: cacheCreationTokens,
    cacheReadInputTokens: cacheReadTokens,
    found: true
  };
}
