import { GoogleGenAI } from '@google/genai';
import { env } from './env';

let client: GoogleGenAI | null = null;

export function getGenAIClient(): GoogleGenAI {
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is required to call Gemini. Set it in .env or process.env.');
  }

  if (!client) {
    client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }

  return client;
}
