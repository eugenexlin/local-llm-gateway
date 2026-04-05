import { extractTokensFromStream } from '../utils/streaming-token-parser';

describe('Streaming Token Parser', () => {
  describe('extractTokensFromStream', () => {
    it('should extract tokens from a complete SSE stream with usage object', () => {
      const chunks = [
        Buffer.from('data: {"id":"chat-123","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}],"usage":null}\n\n'),
        Buffer.from('data: {"id":"chat-123","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":" world"},"finish_reason":null}],"usage":null}\n\n'),
        Buffer.from('data: {"id":"chat-123","object":"chat.completion.chunk","choices":[],"usage":{"prompt_tokens":10,"completion_tokens":25,"total_tokens":35}}\n\n'),
      ];

      const result = extractTokensFromStream(chunks);

      expect(result).not.toBeNull();
      expect(result?.promptTokens).toBe(10);
      expect(result?.completionTokens).toBe(25);
      expect(result?.totalTokens).toBe(35);
      expect(result?.found).toBe(true);
    });

    it('should extract tokens from minimal SSE stream', () => {
      const chunks = [
        Buffer.from('data: {"usage":{"prompt_tokens":50,"completion_tokens":150,"total_tokens":200}}\n\n'),
      ];

      const result = extractTokensFromStream(chunks);

      expect(result).not.toBeNull();
      expect(result?.promptTokens).toBe(50);
      expect(result?.completionTokens).toBe(150);
      expect(result?.totalTokens).toBe(200);
    });

    it('should handle tokens split across multiple chunks', () => {
      const chunks = [
        Buffer.from('data: {"usage":{"prompt_tokens":'),
        Buffer.from('100,'),
        Buffer.from('"completion_tokens":200,'),
        Buffer.from('"total_tokens":300}}\n\n'),
      ];

      const result = extractTokensFromStream(chunks);

      expect(result).not.toBeNull();
      expect(result?.promptTokens).toBe(100);
      expect(result?.completionTokens).toBe(200);
      expect(result?.totalTokens).toBe(300);
    });

    it('should handle tokens with whitespace and formatting', () => {
      const chunks = [
        Buffer.from('data: {"usage":{\n'),
        Buffer.from('  "prompt_tokens": 100,\n'),
        Buffer.from('  "completion_tokens": 200,\n'),
        Buffer.from('  "total_tokens": 300\n'),
        Buffer.from('}}\n\n'),
      ];

      const result = extractTokensFromStream(chunks);

      expect(result).not.toBeNull();
      expect(result?.promptTokens).toBe(100);
      expect(result?.completionTokens).toBe(200);
      expect(result?.totalTokens).toBe(300);
    });

    it('should return null when no usage object is present', () => {
      const chunks = [
        Buffer.from('data: {"id":"chat-123","choices":[{"delta":{"content":"Hello"}}]}\n\n'),
        Buffer.from('data: {"id":"chat-123","choices":[{"delta":{"content":" world"}}]}\n\n'),
      ];

      const result = extractTokensFromStream(chunks);

      expect(result).toBeNull();
    });

    it('should extract tokens even if only one chunk contains usage', () => {
      const chunks = [
        Buffer.from('data: {"id":"chat-123","choices":[{"delta":{"content":"Hello"}}]}\n\n'),
        Buffer.from('data: {"usage":{"prompt_tokens":42,"completion_tokens":58,"total_tokens":100}}\n\n'),
        Buffer.from('data: [DONE]\n\n'),
      ];

      const result = extractTokensFromStream(chunks);

      expect(result).not.toBeNull();
      expect(result?.promptTokens).toBe(42);
      expect(result?.completionTokens).toBe(58);
      expect(result?.totalTokens).toBe(100);
    });

    it('should handle multiple usage objects (should return first found)', () => {
      const chunks = [
        Buffer.from('data: {"usage":{"prompt_tokens":1,"completion_tokens":1,"total_tokens":2}}\n\n'),
        Buffer.from('data: {"usage":{"prompt_tokens":10,"completion_tokens":20,"total_tokens":30}}\n\n'),
      ];

      const result = extractTokensFromStream(chunks);

      expect(result).not.toBeNull();
      expect(result?.promptTokens).toBe(1);
      expect(result?.completionTokens).toBe(1);
      expect(result?.totalTokens).toBe(2);
    });

    it('should handle empty chunks', () => {
      const chunks = [
        Buffer.from(''),
        Buffer.from('data: {"usage":'),
        Buffer.from(''),
        Buffer.from('{"prompt_tokens":5,"completion_tokens":10,"total_tokens":15}}\n\n'),
      ];

      const result = extractTokensFromStream(chunks);

      expect(result).not.toBeNull();
      expect(result?.promptTokens).toBe(5);
      expect(result?.completionTokens).toBe(10);
      expect(result?.totalTokens).toBe(15);
    });

    it('should handle large token numbers', () => {
      const chunks = [
        Buffer.from('data: {"usage":{"prompt_tokens":999999,"completion_tokens":888888,"total_tokens":1888887}}\n\n'),
      ];

      const result = extractTokensFromStream(chunks);

      expect(result).not.toBeNull();
      expect(result?.promptTokens).toBe(999999);
      expect(result?.completionTokens).toBe(888888);
      expect(result?.totalTokens).toBe(1888887);
    });

    it('should handle tokens as 0', () => {
      const chunks = [
        Buffer.from('data: {"usage":{"prompt_tokens":0,"completion_tokens":0,"total_tokens":0}}\n\n'),
      ];

      const result = extractTokensFromStream(chunks);

      expect(result).not.toBeNull();
      expect(result?.promptTokens).toBe(0);
      expect(result?.completionTokens).toBe(0);
      expect(result?.totalTokens).toBe(0);
    });
  });
});
