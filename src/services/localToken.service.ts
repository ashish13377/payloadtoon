export interface LocalTokenCountResult {
  tokens: number;
  tokenizer: string;
  isEstimate: boolean;
  note: string;
}

type GptTokenizerModule = {
  countTokens: (text: string) => number;
};

let tokenizerModule: GptTokenizerModule | null = null;

function loadTokenizer(): GptTokenizerModule {
  if (tokenizerModule) return tokenizerModule;
  tokenizerModule = require('gpt-tokenizer') as GptTokenizerModule;
  return tokenizerModule;
}

function estimateByCharacters(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export class LocalTokenService {
  countTokens(text: string): LocalTokenCountResult {
    try {
      const tokenizer = loadTokenizer();
      return {
        tokens: tokenizer.countTokens(text),
        tokenizer: 'gpt-tokenizer',
        isEstimate: true,
        note: 'Local token count using gpt-tokenizer. This is provider-free and does not call Gemini. Counts are accurate for GPT-style tokenization, but should be treated as an estimate for Gemini billing.',
      };
    } catch {
      return {
        tokens: estimateByCharacters(text),
        tokenizer: 'character-estimate',
        isEstimate: true,
        note: 'Fallback local estimate using approximately 4 characters per token because gpt-tokenizer could not be loaded.',
      };
    }
  }
}

export const localTokenService = new LocalTokenService();
