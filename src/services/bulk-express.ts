/**
 * Bulk-express service: triggers all eligible agents to express opinions on open markets.
 * Runs server-side with direct DB access (bypasses auth since API keys are hashed).
 */

import { randomUUID } from 'crypto';
import { db } from '../db/index.js';
import { agents, markets, opinions, pointTransactions } from '../db/schema.js';
import { eq, and, gt, sql } from 'drizzle-orm';
import { generateOpinion, generateLongformOpinion } from './llm-opinion.js';
import { callLLM } from './llm-client.js';
import { redactPII, redactFreeTextFields } from './pii.js';
import { computeProvenanceScore } from './provenance.js';
import { PERSONAS, OBJECTIVES } from '../config/agents.js';
import { PLATFORM_TREASURY_ID, VALID_CATEGORIES, type KnowledgeSource, type ProvenancePayload } from '../types.js';
import { getTaxonomyContext } from '../config/taxonomy-content.js';
import { getJuneContext } from '../config/june-context.js';
import { getJulyContext, isJulyTreatmentAgent, sanitizeAgentKbProvenance } from '../config/july-context.js';
import logger from '../logger.js';

interface BulkExpressOptions {
  batch_size?: number;
  delay_ms?: number;
  dry_run?: boolean;
}

interface BulkExpressResult {
  agents_processed: number;
  opinions_submitted: number;
  errors: number;
  skipped: number;
  duration_ms: number;
  details: Array<{ agent: string; market: string; status: string; answer?: string }>;
}

function resolvePersona(agent: { handle: string; custom_instructions: string | null }): string {
  let base: string;
  if (agent.custom_instructions) {
    base = agent.custom_instructions;
  } else {
    const matched = PERSONAS.find(p => agent.handle.includes(p.suffix));
    base = matched?.persona || 'A balanced pragmatist who weighs evidence carefully. You have no default bias and form opinions based on the specific merits of each question.';
  }

  // Inject taxonomy context for April taxonomy agents
  const taxonomyContext = getTaxonomyContext(agent.handle);
  if (taxonomyContext) {
    return `${base}\n\nYour knowledge base (from your reading and study):\n${taxonomyContext}`;
  }

  // Inject dosage-truncated canonical text for June context-dosage agents.
  // Cohort A (dosage_chars=0) returns null here and falls through to persona-only.
  const juneContext = getJuneContext(agent.handle);
  if (juneContext) {
    return `${base}\n\nYour knowledge base:\n${juneContext}`;
  }

  return base;
}

function resolveObjective(agent: { custom_objective: string | null }, index: number): string {
  if (agent.custom_objective) return agent.custom_objective;
  const bucket = Math.min(Math.floor(index / Math.max(1, Math.ceil(OBJECTIVES.length))), OBJECTIVES.length - 1);
  return OBJECTIVES[bucket] || OBJECTIVES[0];
}

export async function runBulkExpress(options: BulkExpressOptions = {}): Promise<BulkExpressResult> {
  const startTime = Date.now();
  const delayMs = options.delay_ms ?? 500;
  const dryRun = options.dry_run ?? false;

  const result: BulkExpressResult = {
    agents_processed: 0,
    opinions_submitted: 0,
    errors: 0,
    skipped: 0,
    duration_ms: 0,
    details: [],
  };

  // 1. Fetch eligible agents (active, not expired, has balance, NOT real humans).
  // Bulk-express is a synthetic-respondent fallback — under Architecture A' it must
  // never write opinions on behalf of real humans. Only system/e2e/legacy-untagged
  // agents are eligible. Untagged rows are backfilled to 'human' by migration 0014,
  // so post-migration this is strictly system/e2e.
  const now = new Date().toISOString();
  const allAgents = await db.select().from(agents);
  const eligibleAgents = allAgents.filter(a =>
    a.id !== PLATFORM_TREASURY_ID &&
    a.is_active === 1 &&
    a.points_balance > 0 &&
    (!a.expires_at || a.expires_at > now) &&
    a.agent_type !== 'human'
  );

  if (eligibleAgents.length === 0) {
    result.duration_ms = Date.now() - startTime;
    return result;
  }

  // 2. Fetch open markets
  const openMarkets = await db.select().from(markets).where(eq(markets.status, 'open'));
  if (openMarkets.length === 0) {
    result.duration_ms = Date.now() - startTime;
    return result;
  }

  // 3. Build existing opinions lookup: agentId -> Set<marketId>
  const allOpinions = await db.select({
    agent_id: opinions.agent_id,
    market_id: opinions.market_id,
  }).from(opinions);

  const opinionMap = new Map<string, Set<string>>();
  for (const op of allOpinions) {
    if (!opinionMap.has(op.agent_id)) opinionMap.set(op.agent_id, new Set());
    opinionMap.get(op.agent_id)!.add(op.market_id);
  }

  // 4. Process each agent
  for (let i = 0; i < eligibleAgents.length; i++) {
    const agent = eligibleAgents[i];
    const agentOpinions = opinionMap.get(agent.id) || new Set();

    // Find markets this agent hasn't expressed on
    const pendingMarkets = openMarkets.filter(m =>
      !agentOpinions.has(m.id) &&
      m.created_by !== agent.id // can't express on own markets
    );

    if (pendingMarkets.length === 0) {
      result.skipped++;
      continue;
    }

    result.agents_processed++;
    const persona = resolvePersona(agent);
    const objective = resolveObjective(agent, i);
    const fullPersona = `${persona}\n\nYour objective: ${objective}`;

    for (const market of pendingMarkets) {
      try {
        if (dryRun) {
          result.details.push({ agent: agent.handle, market: market.question.slice(0, 60), status: 'dry_run' });
          result.opinions_submitted++;
          continue;
        }

        // Check market participant limit
        if (market.max_participants) {
          const participantCount = allOpinions.filter(o => o.market_id === market.id).length;
          if (participantCount >= market.max_participants) {
            result.details.push({ agent: agent.handle, market: market.question.slice(0, 60), status: 'market_full' });
            result.skipped++;
            continue;
          }
        }

        const answerType = market.answer_type || 'binary';
        let opinion: { answer: string; basis: string; confidence: number | null; provenance: ProvenancePayload | null } | null = null;

        // July corpus-intensity agents get per-(agent, market) knowledge-base
        // context: retrieval depends on the market question, so it cannot be
        // folded into resolvePersona() like the per-agent June/taxonomy context.
        const julyContext = getJulyContext(agent.handle, { question: market.question, description: market.description });
        if (!julyContext && isJulyTreatmentAgent(agent.handle)) {
          // Treatment agent with no knowledge base = corpus file missing in
          // this deployment. Expressing anyway would silently run the cohort
          // as a control and null the experiment — skip loudly instead.
          logger.error({ agent: agent.handle, marketId: market.id }, 'July KB missing for treatment agent — skipping (run scripts:july-documents and deploy the corpus)');
          result.details.push({ agent: agent.handle, market: market.question.slice(0, 60), status: 'july_kb_missing' });
          result.errors++;
          continue;
        }
        const marketPersona = julyContext ? `${fullPersona}\n\n${julyContext}` : fullPersona;

        if (answerType === 'longform') {
          opinion = await generateLongformOpinion(market, marketPersona);
        } else {
          opinion = await generateOpinion(market, marketPersona);
        }

        if (!opinion || !opinion.answer) {
          result.details.push({ agent: agent.handle, market: market.question.slice(0, 60), status: 'llm_failed' });
          result.errors++;
          continue;
        }

        // Validate answer based on answer type
        if (answerType === 'binary') {
          const valid = ['yes', 'no', 'abstain'];
          if (!valid.includes(opinion.answer.toLowerCase())) {
            result.details.push({ agent: agent.handle, market: market.question.slice(0, 60), status: 'invalid_answer' });
            result.errors++;
            continue;
          }
        } else if (answerType === 'single_choice' && market.answer_options) {
          const options = JSON.parse(market.answer_options) as string[];
          const validAnswers = [...options.map(o => o.toLowerCase()), 'abstain'];
          if (!validAnswers.includes(opinion.answer.toLowerCase())) {
            result.details.push({ agent: agent.handle, market: market.question.slice(0, 60), status: 'invalid_answer' });
            result.errors++;
            continue;
          }
        } else if (answerType === 'multi_choice' && market.answer_options) {
          if (opinion.answer !== 'abstain') {
            try {
              const selections = JSON.parse(opinion.answer) as string[];
              const options = JSON.parse(market.answer_options) as string[];
              const validLower = options.map(o => o.toLowerCase());
              if (!Array.isArray(selections) || selections.length === 0 || !selections.every(s => validLower.includes(String(s).toLowerCase()))) {
                result.details.push({ agent: agent.handle, market: market.question.slice(0, 60), status: 'invalid_answer' });
                result.errors++;
                continue;
              }
            } catch {
              result.details.push({ agent: agent.handle, market: market.question.slice(0, 60), status: 'invalid_answer' });
              result.errors++;
              continue;
            }
          }
        } else if (answerType === 'ranking' && market.answer_options) {
          if (opinion.answer !== 'abstain') {
            try {
              const ranking = JSON.parse(opinion.answer) as string[];
              const options = JSON.parse(market.answer_options) as string[];
              if (!Array.isArray(ranking) || ranking.length !== options.length) {
                result.details.push({ agent: agent.handle, market: market.question.slice(0, 60), status: 'invalid_answer' });
                result.errors++;
                continue;
              }
            } catch {
              result.details.push({ agent: agent.handle, market: market.question.slice(0, 60), status: 'invalid_answer' });
              result.errors++;
              continue;
            }
          }
        } else if (answerType === 'scale') {
          if (opinion.answer !== 'abstain') {
            const num = Number(opinion.answer);
            if (isNaN(num) || !Number.isInteger(num)) {
              result.details.push({ agent: agent.handle, market: market.question.slice(0, 60), status: 'invalid_answer' });
              result.errors++;
              continue;
            }
          }
        }

        // Insert opinion directly. Longform from synthetic agents still runs through
        // the PII pipeline — the LLM can hallucinate PII-shaped strings — so the
        // admin queue gets the same surface it does for real-human longform.
        let bulkReviewState: 'pending' | 'approved' | null = null;
        let bulkRedacted: string | null = null;
        let bulkFindingsJson: string | null = null;
        if (answerType === 'longform') {
          const piiResult = await redactPII(opinion.answer);
          if (piiResult.severity === 'reject') {
            result.details.push({ agent: agent.handle, market: market.question.slice(0, 60), status: 'pii_rejected' });
            result.errors++;
            continue;
          }
          bulkReviewState = piiResult.severity === 'review' ? 'pending' : 'approved';
          bulkRedacted = piiResult.redacted;
          bulkFindingsJson = JSON.stringify({
            provider: piiResult.provider,
            severity: piiResult.severity,
            findings: piiResult.findings,
          });
        }

        // Filter PII out of the synthetic agent's basis + LLM-declared
        // provenance notes. The LLM may omit provenance (parseProvenance
        // returns null) — in that case we leave provenance_json null on
        // storage so cohort-report's `opinions_with_provenance` stays
        // an accurate count of declared opinions.
        // agent_kb citations are only trusted from July corpus agents, and
        // only for doc ids actually retrieved for this market — otherwise any
        // agent could fabricate knowledge-base grounding.
        const declaredProvenance: ProvenancePayload = opinion.provenance ?? { sources: [] };
        const llmProvenance = sanitizeAgentKbProvenance(
          agent.handle,
          { question: market.question, description: market.description },
          declaredProvenance,
        );
        const bulkFreeText = await redactFreeTextFields({
          basis: opinion.basis ?? null,
          provenance: llmProvenance,
        });

        let provenanceJsonToStore: string | null = null;
        let provenanceScoreToStore: number | null = null;
        if (llmProvenance.sources.length > 0) {
          provenanceJsonToStore = JSON.stringify(bulkFreeText.provenance_redacted);
          const ks = ((market.knowledge_source as KnowledgeSource | undefined) ?? 'any');
          provenanceScoreToStore = computeProvenanceScore(bulkFreeText.provenance_redacted, ks).score;
        }

        const opinionId = randomUUID();
        const opinionNow = new Date().toISOString();
        await db.insert(opinions).values({
          id: opinionId,
          market_id: market.id,
          agent_id: agent.id,
          answer: opinion.answer,
          basis: bulkFreeText.basis_redacted,
          provenance_json: provenanceJsonToStore,
          provenance_score: provenanceScoreToStore,
          confidence: opinion.confidence ?? null,
          created_at: opinionNow,
          review_state: bulkReviewState,
          redacted_answer: bulkRedacted,
          pii_findings_json: bulkFindingsJson,
        });

        result.opinions_submitted++;
        result.details.push({
          agent: agent.handle,
          market: market.question.slice(0, 60),
          status: 'expressed',
          answer: opinion.answer,
        });

        // Delay between LLM calls
        if (delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (err) {
        logger.error({ err, agent: agent.handle, marketId: market.id }, 'Bulk-express error');
        result.details.push({ agent: agent.handle, market: market.question.slice(0, 60), status: 'error' });
        result.errors++;
      }
    }
  }

  result.duration_ms = Date.now() - startTime;
  return result;
}

// ── Bulk Market Creation ──

interface BulkCreateMarketsOptions {
  agent_filter?: string;
  markets_per_agent?: number;
  deadline_hours?: number;
  dry_run?: boolean;
}

interface BulkCreateMarketsResult {
  agents_processed: number;
  markets_created: number;
  errors: number;
  skipped: number;
  duration_ms: number;
  details: Array<{ agent: string; question?: string; status: string }>;
}

export async function runBulkCreateMarkets(options: BulkCreateMarketsOptions = {}): Promise<BulkCreateMarketsResult> {
  const startTime = Date.now();
  const marketsPerAgent = options.markets_per_agent ?? 1;
  const deadlineHours = options.deadline_hours ?? 24;
  const dryRun = options.dry_run ?? false;
  const agentFilter = options.agent_filter;

  const result: BulkCreateMarketsResult = {
    agents_processed: 0,
    markets_created: 0,
    errors: 0,
    skipped: 0,
    duration_ms: 0,
    details: [],
  };

  const now = new Date().toISOString();
  const minFunding = parseInt(process.env.MIN_MARKET_FUNDING || '50');

  // Fetch eligible agents (synthetic only — see runBulkExpress for rationale)
  const allAgents = await db.select().from(agents);
  const eligibleAgents = allAgents.filter(a =>
    a.id !== PLATFORM_TREASURY_ID &&
    a.is_active === 1 &&
    a.points_balance >= minFunding &&
    (!a.expires_at || a.expires_at > now) &&
    (!agentFilter || a.handle.startsWith(agentFilter)) &&
    a.agent_type !== 'human'
  );

  if (eligibleAgents.length === 0) {
    result.duration_ms = Date.now() - startTime;
    return result;
  }

  const categoriesStr = (VALID_CATEGORIES as readonly string[]).join(', ');

  for (let i = 0; i < eligibleAgents.length; i++) {
    const agent = eligibleAgents[i];
    result.agents_processed++;

    const persona = resolvePersona(agent);
    const objective = resolveObjective(agent, i);
    const fullPersona = `${persona}\n\nYour objective: ${objective}`;

    for (let m = 0; m < marketsPerAgent; m++) {
      try {
        // Ask LLM to generate a market question based on agent's domain expertise
        const system = `You are an AI agent with this persona: ${fullPersona}

You are creating a market question for an opinion platform where other AI agents will express their views.`;

        const user = `Generate a thought-provoking market question based on your domain expertise and worldview.

The question should be something other agents can have genuine opinions about.

Valid categories: ${categoriesStr}

Respond with JSON only:
{
  "question": "<a clear, specific question under 200 chars>",
  "description": "<2-3 sentence description providing context, under 500 chars>",
  "category": "<one of the valid categories>",
  "answer_type": "binary"
}`;

        const content = await callLLM(system, user, { temperature: 1.0, maxTokens: 500 });
        if (!content) {
          result.details.push({ agent: agent.handle, status: 'llm_failed' });
          result.errors++;
          continue;
        }

        let parsed: { question: string; description: string; category: string; answer_type?: string };
        try {
          parsed = JSON.parse(content);
        } catch {
          result.details.push({ agent: agent.handle, status: 'parse_failed' });
          result.errors++;
          continue;
        }

        if (!parsed.question || !parsed.description || !parsed.category) {
          result.details.push({ agent: agent.handle, status: 'incomplete_response' });
          result.errors++;
          continue;
        }

        // Validate category
        if (!(VALID_CATEGORIES as readonly string[]).includes(parsed.category)) {
          parsed.category = 'society_culture'; // fallback
        }

        if (dryRun) {
          result.details.push({ agent: agent.handle, question: parsed.question.slice(0, 60), status: 'dry_run' });
          result.markets_created++;
          continue;
        }

        // Check agent can afford funding
        const currentAgent = await db.select({ points_balance: agents.points_balance })
          .from(agents).where(eq(agents.id, agent.id));
        if (!currentAgent[0] || currentAgent[0].points_balance < minFunding) {
          result.details.push({ agent: agent.handle, status: 'insufficient_points' });
          result.skipped++;
          continue;
        }

        const marketId = randomUUID();
        const deadline = new Date(Date.now() + deadlineHours * 3600000).toISOString();
        const takeRate = parseFloat(process.env.TAKE_RATE || '0.6');
        const platformFee = Math.floor(minFunding * takeRate);
        const netRewardPool = minFunding - platformFee;
        const marketNow = new Date().toISOString();

        await db.insert(markets).values({
          id: marketId,
          question: parsed.question.slice(0, 500),
          description: parsed.description.slice(0, 2000),
          context_json: '{}',
          category: parsed.category,
          status: 'open',
          created_by: agent.id,
          deadline,
          created_at: marketNow,
          answer_type: 'binary',
          answer_options: null,
          response_constraints: null,
          max_participants: null,
          tags: null,
          scheduled_start: null,
          creator_type: 'agent',
          funded_amount: minFunding,
          platform_fee: platformFee,
          reward_pool: netRewardPool,
          reward_distributed: 0,
        });

        // Deduct funding from agent
        await db.update(agents)
          .set({ points_balance: sql`${agents.points_balance} - ${minFunding}` })
          .where(eq(agents.id, agent.id));

        // Credit treasury with platform fee
        await db.update(agents)
          .set({ points_balance: sql`${agents.points_balance} + ${platformFee}` })
          .where(eq(agents.id, PLATFORM_TREASURY_ID));

        // Record funding transaction
        await db.insert(pointTransactions).values({
          id: randomUUID(),
          agent_id: agent.id,
          market_id: marketId,
          amount: -minFunding,
          type: 'market_funding',
          created_at: marketNow,
        });

        // Record platform fee transaction
        await db.insert(pointTransactions).values({
          id: randomUUID(),
          agent_id: PLATFORM_TREASURY_ID,
          market_id: marketId,
          amount: platformFee,
          type: 'platform_fee',
          created_at: marketNow,
        });

        result.markets_created++;
        result.details.push({
          agent: agent.handle,
          question: parsed.question.slice(0, 60),
          status: 'created',
        });

        logger.info({ agent: agent.handle, marketId, question: parsed.question.slice(0, 80) }, 'Taxonomy agent created market');

      } catch (err) {
        logger.error({ err, agent: agent.handle }, 'Bulk-create-markets error');
        result.details.push({ agent: agent.handle, status: 'error' });
        result.errors++;
      }
    }
  }

  result.duration_ms = Date.now() - startTime;
  return result;
}
