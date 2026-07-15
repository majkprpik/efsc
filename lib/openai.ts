import "server-only";
import OpenAI from "openai";

export const CHAT_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

let client: OpenAI | null = null;

/** Returns the OpenAI client, or null if no key is configured. */
export function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}
