import { Context, Next } from 'hono';
import { db } from '../db/index.js';
import { profileAnswers } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { requiredGenesisKeys } from '../db/profile-questions.js';
import { PLATFORM_TREASURY_ID } from '../types.js';

export const profileGateMiddleware = async (c: Context, next: Next) => {
  const agent = (c as any).get('agent') as { id: string };

  // Exempt platform treasury
  if (agent.id === PLATFORM_TREASURY_ID) {
    return next();
  }

  const answers = await db.select().from(profileAnswers).where(eq(profileAnswers.agent_id, agent.id));
  const answeredKeys = new Set(answers.map(a => a.question_key));
  const missing = requiredGenesisKeys.filter(k => !answeredKeys.has(k));

  if (missing.length > 0) {
    return c.json({
      error: 'Profile incomplete',
      message: 'You must complete your profile before participating in markets. Submit your profile via POST /agents/profile.',
      missing_questions: missing,
      profile_url: '/agents/profile-questions',
    }, 403);
  }

  return next();
};
