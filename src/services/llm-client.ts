/**
 * Shared LLM client abstraction — used by market-generator and llm-opinion.
 */

import logger from '../logger.js';

export type LLMProvider = 'openai' | 'anthropic';

export function detectProvider(): { provider: LLMProvider; apiUrl: string; model: string } {
  const apiUrl = process.env.LLM_API_URL;
  const model = process.env.LLM_MODEL;
  const explicitProvider = (process.env.LLM_PROVIDER || '').toLowerCase();

  if (explicitProvider === 'anthropic') {
    return {
      provider: 'anthropic',
      apiUrl: apiUrl || 'https://api.anthropic.com/v1/messages',
      model: model || 'claude-haiku-4-5-20251001',
    };
  }

  return {
    provider: 'openai',
    apiUrl: apiUrl || 'https://api.openai.com/v1/chat/completions',
    model: model || 'gpt-4o-mini',
  };
}

async function callOpenAI(
  apiUrl: string, model: string, apiKey: string,
  systemPrompt: string, userPrompt: string,
  opts?: { temperature?: number; maxTokens?: number }
): Promise<string | null> {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: opts?.maxTokens ?? 2000,
      temperature: opts?.temperature ?? 0.8,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error({ status: response.status, error: errorText }, 'OpenAI API error');
    return null;
  }

  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content || null;
}

async function callAnthropic(
  apiUrl: string, model: string, apiKey: string,
  systemPrompt: string, userPrompt: string,
  opts?: { temperature?: number; maxTokens?: number }
): Promise<string | null> {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt + '\n\nRespond with valid JSON only, no other text.' },
      ],
      max_tokens: opts?.maxTokens ?? 2000,
      temperature: opts?.temperature ?? 0.8,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error({ status: response.status, error: errorText }, 'Anthropic API error');
    return null;
  }

  const data = await response.json() as any;
  const text = data.content?.[0]?.text || null;
  if (!text) return null;

  // Extract JSON from response (Anthropic may wrap it in markdown code blocks)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  return jsonMatch ? jsonMatch[1].trim() : text;
}

/**
 * Call the configured LLM provider with system + user prompts.
 * Returns raw string content (typically JSON) or null on failure.
 */
export async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  opts?: { temperature?: number; maxTokens?: number }
): Promise<string | null> {
  const { provider, apiUrl, model } = detectProvider();
  const openaiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY || process.env.LLM_API_KEY;

  if (provider === 'anthropic') {
    if (!anthropicKey) {
      logger.warn('ANTHROPIC_API_KEY not configured');
      return null;
    }
    return callAnthropic(apiUrl, model, anthropicKey, systemPrompt, userPrompt, opts);
  }

  if (!openaiKey) {
    logger.warn('OPENAI_API_KEY not configured');
    return null;
  }

  return callOpenAI(apiUrl, model, openaiKey, systemPrompt, userPrompt, opts);
}
