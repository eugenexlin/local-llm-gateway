import { extractTokensFromStream } from '../utils/streaming-token-parser';

describe('Token Counting Fixes', () => {
  describe('extractTokensFromStream', () => {
    it('should extract standard token counts from usage object', () => {
      const chunks = [Buffer.from('data: {"usage": {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30}}\n')];
      const result = extractTokensFromStream(chunks);
      
      expect(result).not.toBeNull();
      expect(result?.promptTokens).toBe(10);
      expect(result?.completionTokens).toBe(20);
      expect(result?.totalTokens).toBe(30);
      expect(result?.found).toBe(true);
    });

    it('should extract cache token fields when present', () => {
      const chunks = [Buffer.from('data: {"usage": {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30, "cache_creation_input_tokens": 5, "cache_read_input_tokens": 3}}\n')];
      const result = extractTokensFromStream(chunks);
      
      expect(result).not.toBeNull();
      expect(result?.cacheCreationInputTokens).toBe(5);
      expect(result?.cacheReadInputTokens).toBe(3);
    });

    it('should return undefined for cache tokens when not present', () => {
      const chunks = [Buffer.from('data: {"usage": {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30}}\n')];
      const result = extractTokensFromStream(chunks);
      
      expect(result).not.toBeNull();
      expect(result?.cacheCreationInputTokens).toBeUndefined();
      expect(result?.cacheReadInputTokens).toBeUndefined();
    });

    it('should handle SSE format with data: prefix', () => {
      const chunks = [
        Buffer.from('data: '),
        Buffer.from('{"usage": {"prompt_tokens": 15, "completion_tokens": 25, "total_tokens": 40}}\n')
      ];
      const result = extractTokensFromStream(chunks);
      
      expect(result).not.toBeNull();
      expect(result?.promptTokens).toBe(15);
      expect(result?.completionTokens).toBe(25);
      expect(result?.totalTokens).toBe(40);
    });

    it('should return null when usage object is missing', () => {
      const chunks = [Buffer.from('data: {"choices": [{"text": "hello"}]}\n')];
      const result = extractTokensFromStream(chunks);
      
      expect(result).toBeNull();
    });

    it('should handle whitespace variations in JSON', () => {
      const chunks = [Buffer.from('data: { "usage" : { "prompt_tokens" : 100 , "completion_tokens" : 200 , "total_tokens" : 300 } }\n')];
      const result = extractTokensFromStream(chunks);
      
      expect(result).not.toBeNull();
      expect(result?.promptTokens).toBe(100);
      expect(result?.completionTokens).toBe(200);
      expect(result?.totalTokens).toBe(300);
    });
  });
});
