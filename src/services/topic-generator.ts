/**
 * LLM-powered question generation for custom surface topics.
 * Generates indirect questions that triangulate toward a research insight
 * without explicitly mentioning the surface topic.
 */

import { db } from '../db/index.js';
import { surfaceTopics, draftQuestions } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { callLLM } from './llm-client.js';
import { randomUUID } from 'crypto';
import { sqlite } from '../db/index.js';
import logger from '../logger.js';

// Bootstrap tables on module load (same pattern as funnel_confirmations in analytics.ts)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS surface_topics (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    insight_goal TEXT NOT NULL,
    example_seeds TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS draft_questions (
    id TEXT PRIMARY KEY,
    surface_topic_id TEXT,
    funnel_id TEXT,
    question TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    answer_type TEXT NOT NULL DEFAULT 'binary',
    answer_options TEXT,
    response_constraints TEXT,
    context_json TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'draft',
    generation_round INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK ((surface_topic_id IS NULL) != (funnel_id IS NULL))
  );
`);

const SYSTEM_PROMPT = `You are a creative market question designer for an opinion platform where AI agents express subjective views.

Your task is to generate INDIRECT questions that triangulate toward a research insight WITHOUT explicitly mentioning the surface topic. This is a latent variable measurement approach — the questions should collectively reveal attitudes and behaviors related to the research goal through indirect observation.

Your questions should be:
- Thought-provoking and engaging — not academic or survey-like
- Indirect — they never mention the surface topic explicitly
- Diverse — covering different angles and perspectives that triangulate toward the insight
- Grounded with realistic context and data points
- A mix of answer types: approximately 40% binary (yes/no), 40% multiple choice (3-5 options), 20% longform essay
- Standalone — never reference other questions or that this is part of a series

Always respond with valid JSON. Use example.com for any URLs in context articles.`;

interface GeneratedQuestion {
  question: string;
  description: string;
  category: string;
  answer_type: 'binary' | 'single_choice' | 'multi_choice' | 'longform' | 'ranking' | 'scale';
  answer_options?: string[];
  response_constraints?: { min_length: number; max_length: number };
  context_articles?: Array<{ title: string; url: string; summary: string }>;
  context_data_points?: Array<{ label: string; value: string; source: string }>;
}

export async function generateDraftQuestions(topicId: string, count: number = 12): Promise<number> {
  const [topic] = await db.select().from(surfaceTopics).where(eq(surfaceTopics.id, topicId));
  if (!topic) throw new Error(`Surface topic ${topicId} not found`);

  // Get existing questions to avoid repeats
  const existing = await db.select({ question: draftQuestions.question })
    .from(draftQuestions)
    .where(eq(draftQuestions.surface_topic_id, topicId));

  const existingList = existing.length > 0
    ? `\n\nPreviously generated questions (DO NOT repeat or closely paraphrase these):\n${existing.map((q, i) => `${i + 1}. ${q.question}`).join('\n')}`
    : '';

  const seeds = topic.example_seeds ? JSON.parse(topic.example_seeds) : [];
  const seedsText = seeds.length > 0
    ? `\nSeed angles to draw from (use as inspiration, not literally): ${seeds.join(', ')}`
    : '';

  // Determine generation round
  const maxRound = existing.length > 0
    ? Math.max(...(await db.select({ r: draftQuestions.generation_round }).from(draftQuestions).where(eq(draftQuestions.surface_topic_id, topicId))).map(r => r.r))
    : 0;
  const round = maxRound + 1;

  const userPrompt = `Generate ${count} diverse opinion market questions that INDIRECTLY explore this research topic:

Topic: ${topic.name}
Description: ${topic.description}
What we want to learn: ${topic.insight_goal}
${seedsText}

CRITICAL RULES:
- Questions must NOT explicitly mention "${topic.name}" or closely related terms
- Each question should approach the insight from a different angle — behavioral, preference, scenario-based, philosophical, or cultural
- The questions should collectively triangulate toward the research insight when analyzed together
- Mix of answer types: approximately ${Math.round(count * 0.3)} binary, ${Math.round(count * 0.3)} single_choice (3-5 options), ${Math.round(count * 0.2)} multi_choice (3-5 options, agents can pick multiple), ${Math.round(count * 0.2)} longform
- For category, pick from: "pure_opinion", "society_culture", "philosophy_ethics", "subjective_framing", "technology_innovation"
- Include 1-2 context articles and 1-2 data points per question to ground them in reality${existingList}

Respond with a JSON object:
{
  "questions": [
    {
      "question": "concise question text (under 150 chars)",
      "description": "1-2 sentences of context (under 300 chars)",
      "category": "one of the allowed categories",
      "answer_type": "binary" | "single_choice" | "multi_choice" | "longform" | "ranking" | "scale",
      "answer_options": ["option1", "option2", "option3"] (for single_choice/multi_choice/ranking, 3-5 options),
      "response_constraints": { "min_length": 100, "max_length": 2000 } (only for longform),
      "context_articles": [{ "title": "...", "url": "https://example.com/...", "summary": "..." }],
      "context_data_points": [{ "label": "...", "value": "...", "source": "..." }]
    }
  ]
}`;

  try {
    const content = await callLLM(SYSTEM_PROMPT, userPrompt, { maxTokens: 4000, temperature: 0.9 });
    if (!content) {
      logger.error('No content in LLM response');
      return 0;
    }

    const parsed = JSON.parse(content);
    const questions: GeneratedQuestion[] = Array.isArray(parsed.questions) ? parsed.questions : [];

    if (questions.length === 0) {
      logger.error('No questions in LLM response');
      return 0;
    }

    const now = new Date().toISOString();
    let inserted = 0;

    for (const q of questions) {
      if (!q.question || !q.description) continue;

      const answerType = ['binary', 'single_choice', 'multi_choice', 'longform', 'ranking', 'scale'].includes(q.answer_type) ? q.answer_type : 'binary';

      const contextJson = JSON.stringify({
        articles: Array.isArray(q.context_articles)
          ? q.context_articles.map(a => ({ title: String(a.title || ''), url: String(a.url || 'https://example.com'), summary: String(a.summary || '') }))
          : [],
        data_points: Array.isArray(q.context_data_points)
          ? q.context_data_points.map(d => ({ label: String(d.label || ''), value: String(d.value || ''), source: String(d.source || '') }))
          : [],
        links: [],
      });

      await db.insert(draftQuestions).values({
        id: randomUUID(),
        surface_topic_id: topicId,
        question: String(q.question).slice(0, 200),
        description: String(q.description).slice(0, 500),
        category: q.category || 'pure_opinion',
        answer_type: answerType,
        answer_options: (answerType === 'single_choice' || answerType === 'multi_choice' || answerType === 'ranking') && Array.isArray(q.answer_options) && q.answer_options.length >= 2
          ? JSON.stringify(q.answer_options.map(o => String(o)).slice(0, 10))
          : null,
        response_constraints: answerType === 'longform'
          ? JSON.stringify(q.response_constraints || { min_length: 100, max_length: 2000 })
          : null,
        context_json: contextJson,
        status: 'draft',
        generation_round: round,
        created_at: now,
        updated_at: now,
      });
      inserted++;
    }

    logger.info({ inserted, topic: topic.name, round }, 'Generated draft questions');
    return inserted;
  } catch (err) {
    logger.error({ err }, 'Failed to generate questions');
    return 0;
  }
}
