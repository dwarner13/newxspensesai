import OpenAI from "openai";

/**
 * Centralized OpenAI client factory
 * Ensures API key is always server-side only (never exposed to browser)
 */
export function getOpenAIClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY missing (server env).");
  }
  return new OpenAI({ apiKey: key });
}

/**
 * Get the chat model from env or default to gpt-4o-mini
 */
export function getChatModel() {
  return process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
}
















