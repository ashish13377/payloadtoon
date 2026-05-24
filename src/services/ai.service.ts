import { z } from 'zod';
import { env } from '../config/env';
import { getGenAIClient } from '../config/genai';
import type { AiInsights, ToonCompressionResult } from '../types/api.types';
import { HttpError } from '../utils/httpError';
import { getGeminiErrorDetails, toGeminiHttpError, withGeminiRetry } from '../utils/geminiError';

const AiInsightsSchema = z.object({
  summary: z.string().describe('A concise summary of what the data shows.'),
  queryAnswer: z.string().describe('Direct answer to the user query based only on the provided context.'),
  flaggedItems: z
    .array(
      z.object({
        id: z.string().describe('Record identifier, key value, or item name that should be flagged.'),
        reason: z.string().describe('Why this item is important.'),
        severity: z.enum(['info', 'warning', 'critical']).describe('Severity level for UI chips.'),
      }),
    )
    .describe('Important records or IDs extracted from the context.'),
  recommendations: z.array(z.string()).describe('Actionable recommendations, if any.'),
});

export interface AnalyzeWithGeminiParams {
  userQuery: string;
  compression: ToonCompressionResult;
  model: string;
}

function getTextFromGeminiResponse(response: unknown): string {
  const maybe = (response as { text?: string | (() => string) }).text;
  if (typeof maybe === 'function') return maybe();
  if (typeof maybe === 'string') return maybe;
  return '';
}

function getModelFallbackChain(primaryModel: string): string[] {
  const fallbackModel = env.GEMINI_FALLBACK_MODEL?.trim();
  const models = [primaryModel.trim()];

  if (fallbackModel && fallbackModel !== primaryModel) {
    models.push(fallbackModel);
  }

  return models;
}

export class AiService {
  async analyzeWithGemini(params: AnalyzeWithGeminiParams): Promise<AiInsights> {
    const { userQuery, compression, model } = params;

    const systemInstruction = [
      'You are a senior data analyst.',
      'You will receive context in a dense Token-Oriented Object Notation table.',
      'Each line is one record. Values are separated by pipes (|).',
      'Escaped characters may appear inside cells: \\| for pipe, \\, for comma, \\n for newline, and \\r for carriage return.',
      `Column mapping legend: ${compression.schemaHeader}`,
      'Use only the supplied context. Do not invent records or IDs.',
      'Return only JSON matching the provided response schema.',
    ].join('\n');

    const prompt = [
      'Context Data:',
      compression.toonString,
      '',
      `User Query: ${userQuery}`,
    ].join('\n');

    const responseJsonSchema = {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        queryAnswer: { type: 'string' },
        flaggedItems: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              reason: { type: 'string' },
              severity: { type: 'string', enum: ['info', 'warning', 'critical'] },
            },
            required: ['id', 'reason', 'severity'],
          },
        },
        recommendations: { type: 'array', items: { type: 'string' } },
      },
      required: ['summary', 'queryAnswer', 'flaggedItems', 'recommendations'],
    };

    const generationConfig = {
      systemInstruction,
      responseMimeType: 'application/json',
      responseJsonSchema,
    } as Record<string, unknown>;

    let lastError: unknown;

    for (const candidateModel of getModelFallbackChain(model)) {
      try {
        const response = await withGeminiRetry(
          () => getGenAIClient().models.generateContent({
            model: candidateModel,
            contents: prompt,
            config: generationConfig,
          }),
          {
            operationName: `generateContent:${candidateModel}`,
            maxRetries: env.GEMINI_MAX_RETRIES,
            initialDelayMs: env.GEMINI_RETRY_INITIAL_DELAY_MS,
            maxDelayMs: env.GEMINI_RETRY_MAX_DELAY_MS,
          },
        );

        const text = getTextFromGeminiResponse(response);
        if (!text.trim()) {
          throw new HttpError(502, `Gemini returned an empty response from model ${candidateModel}.`);
        }

        const parsedJson = JSON.parse(text) as unknown;
        return AiInsightsSchema.parse(parsedJson);
      } catch (error) {
        lastError = error;

        if (error instanceof SyntaxError || error instanceof z.ZodError || error instanceof HttpError) {
          throw error;
        }

        console.warn(
          `[gemini:fallback] Model ${candidateModel} failed.`,
          getGeminiErrorDetails(error),
        );
      }
    }

    throw toGeminiHttpError(
      lastError,
      'Gemini content generation failed after retries and fallback model attempts.',
    );
  }
}

export const aiService = new AiService();
