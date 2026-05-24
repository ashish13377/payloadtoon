import { env } from '../config/env';
import { getGenAIClient } from '../config/genai';
import { toGeminiHttpError, withGeminiRetry } from '../utils/geminiError';

export class TokenService {
  async countTokens(contents: string, model: string): Promise<number> {
    try {
      const response = await withGeminiRetry(
        () => getGenAIClient().models.countTokens({
          model,
          contents,
        }),
        {
          operationName: `countTokens:${model}`,
          maxRetries: env.GEMINI_MAX_RETRIES,
          initialDelayMs: env.GEMINI_RETRY_INITIAL_DELAY_MS,
          maxDelayMs: env.GEMINI_RETRY_MAX_DELAY_MS,
        },
      );

      return Number(response.totalTokens ?? 0);
    } catch (error) {
      throw toGeminiHttpError(error, 'Gemini token counting failed.');
    }
  }
}

export const tokenService = new TokenService();
