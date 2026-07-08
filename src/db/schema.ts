import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  handle: text('handle').notNull().unique(),
  api_key_hash: text('api_key_hash').notNull(),
  points_balance: integer('points_balance').notNull().default(0),
  created_at: text('created_at').notNull(),
  bio: text('bio'),
  avatar_url: text('avatar_url'),
  description: text('description'),
  is_active: integer('is_active').notNull().default(1),
  expires_at: text('expires_at'), // ISO datetime; null = never expires
  agent_type: text('agent_type'), // 'human' | 'e2e' | 'system' | null (untagged)
  custom_instructions: text('custom_instructions'), // override hardcoded persona
  custom_objective: text('custom_objective'), // override cohort objective
  location_country: text('location_country'), // ISO 3166-1 alpha-2
  location_region: text('location_region'), // state/province
  location_city: text('location_city'),
  consent_version: text('consent_version'), // version string from consent_versions
  consented_at: text('consented_at'), // ISO datetime of most recent acceptance
  retention_days: integer('retention_days'), // null = retain until delete; UI default 90
  deletion_requested_at: text('deletion_requested_at'), // ISO; soft-delete tombstone before confirm
  email: text('email'), // optional, used for delete-confirmation flow
});

export const markets = sqliteTable('markets', {
  id: text('id').primaryKey(),
  question: text('question').notNull(),
  description: text('description').notNull(),
  context_json: text('context_json').notNull(),
  category: text('category').notNull(),
  status: text('status').notNull().default('open'),
  created_by: text('created_by').notNull(),
  deadline: text('deadline').notNull(),
  majority_position: text('majority_position'),
  created_at: text('created_at').notNull(),
  // Maker API funding fields
  funded_amount: integer('funded_amount'),
  platform_fee: integer('platform_fee'),
  reward_pool: integer('reward_pool'),
  reward_distributed: integer('reward_distributed').default(0),
  answer_options: text('answer_options'), // JSON array of custom options, null = yes/no
  answer_type: text('answer_type').notNull().default('binary'), // 'binary' | 'single_choice' | 'multi_choice' | 'longform' | 'ranking' | 'scale'
  response_constraints: text('response_constraints'), // JSON: { min_length, max_length, format_instructions?, topic_focus? }
  knowledge_source: text('knowledge_source').notNull().default('any'), // 'any' | 'provided_context_only' | 'training_knowledge' | 'local_only'
  max_participants: integer('max_participants'), // null = unlimited
  tags: text('tags'), // JSON array of strings
  scheduled_start: text('scheduled_start'), // ISO datetime; null = live immediately
  session_id: text('session_id'), // FK to sessions.id; null for non-session markets
  session_order: integer('session_order'), // stable order inside an AM/PM session
  creator_type: text('creator_type'), // 'system' | 'admin' | 'agent'
  research_theme: text('research_theme'), // internal research theme id (not exposed to agents)
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  slot_label: text('slot_label').notNull(), // 'AM' | 'PM'
  scheduled_start_utc: text('scheduled_start_utc').notNull(),
  deadline_utc: text('deadline_utc').notNull(),
  status: text('status').notNull().default('scheduled'), // 'scheduled' | 'active' | 'completed'
});

export const opinions = sqliteTable('opinions', {
  id: text('id').primaryKey(),
  market_id: text('market_id').notNull(),
  agent_id: text('agent_id').notNull(),
  answer: text('answer').notNull(),
  basis: text('basis'),
  provenance_json: text('provenance_json'),
  provenance_score: real('provenance_score'),
  confidence: integer('confidence'), // 0-100, optional
  created_at: text('created_at').notNull(),
  // Longform review queue (NULL for typed answers; 'pending' default for longform)
  review_state: text('review_state'), // 'pending' | 'approved' | 'rejected' | null
  redacted_answer: text('redacted_answer'), // PII-stripped version surfaced once approved
  reviewer_id: text('reviewer_id'), // admin agent id who approved/rejected
  reviewed_at: text('reviewed_at'), // ISO datetime
  pii_findings_json: text('pii_findings_json'), // structured PII pipeline output for audit
});

// Append-only audit trail of every consent acceptance (GDPR proof-of-consent).
// agents.consent_version only stores current; this table preserves history.
export const consentRecords = sqliteTable('consent_records', {
  id: text('id').primaryKey(),
  agent_id: text('agent_id').notNull(),
  consent_version: text('consent_version').notNull(),
  accepted_at: text('accepted_at').notNull(),
  ip_hash: text('ip_hash'), // sha256(client ip), nullable until anonymized
  user_agent: text('user_agent'), // nullable until anonymized
});

// The actual ToS / Privacy text the user accepted, versioned in DB so /privacy
// and /terms can serve current text without redeploy.
export const consentVersions = sqliteTable('consent_versions', {
  version: text('version').primaryKey(), // e.g. '2026-05-08'
  tos_markdown: text('tos_markdown').notNull(),
  privacy_markdown: text('privacy_markdown').notNull(),
  effective_at: text('effective_at').notNull(),
  is_current: integer('is_current').notNull().default(0), // 1 = current, 0 = superseded
});

// Two-step delete confirmation tokens. DELETE /agents/me inserts a row;
// POST /agents/me/delete-confirm consumes one to run the hard-delete cascade.
// 24h TTL, lazy cleanup on lookup.
export const pendingDeletions = sqliteTable('pending_deletions', {
  id: text('id').primaryKey(), // confirm_token returned to the client
  agent_id: text('agent_id').notNull(),
  expires_at: text('expires_at').notNull(),
  created_at: text('created_at').notNull(),
});

// Market image/file attachments
export const marketAttachments = sqliteTable('market_attachments', {
  id: text('id').primaryKey(),
  market_id: text('market_id').notNull(),
  filename: text('filename').notNull(), // stored filename (uuid-based)
  original_name: text('original_name').notNull(),
  content_type: text('content_type').notNull(),
  size_bytes: integer('size_bytes').notNull(),
  created_at: text('created_at').notNull(),
});

// DEPRECATED: retained for migration compatibility, no longer queried or populated
export const synthesisDeliverables = sqliteTable('synthesis_deliverables', {
  id: text('id').primaryKey(),
  market_id: text('market_id').notNull(),
  type: text('type').notNull(), // 'executive_summary' | 'thematic_analysis' | 'outlier_highlights'
  title: text('title').notNull(),
  content: text('content').notNull(),
  model_used: text('model_used'),
  response_count: integer('response_count'),
  generated_at: text('generated_at').notNull(),
});

export const pointTransactions = sqliteTable('point_transactions', {
  id: text('id').primaryKey(),
  agent_id: text('agent_id').notNull(),
  market_id: text('market_id').notNull(),
  amount: integer('amount').notNull(),
  type: text('type').notNull(),
  created_at: text('created_at').notNull(),
});

export const profileAnswers = sqliteTable('profile_answers', {
  id: text('id').primaryKey(),
  agent_id: text('agent_id').notNull(),
  question_key: text('question_key').notNull(),
  answer: text('answer').notNull(),
  question_version: integer('question_version').notNull().default(1),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
}, (table) => ({
  agentQuestionUnique: uniqueIndex('profile_answers_agent_question_unique').on(table.agent_id, table.question_key),
}));

// Research funnels (admin-managed methodology themes that drive automatic market generation)
export const researchFunnels = sqliteTable('research_funnels', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  insight_goal: text('insight_goal').notNull(),
  display_insight_name: text('display_insight_name').notNull(),
  example_topics: text('example_topics').notNull().default('[]'), // JSON string[]
  generation_guidance: text('generation_guidance').notNull().default('[]'), // JSON [{phase, guidance}]
  forbidden_terms: text('forbidden_terms').notNull().default('[]'), // JSON string[]
  camouflage_categories: text('camouflage_categories').notNull().default('[]'), // JSON string[]
  status: text('status').notNull().default('active'), // 'active' | 'paused' | 'archived'
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
  analysis_json: text('analysis_json'), // JSON { consensus, outliers, trends }
  analysis_generated_at: text('analysis_generated_at'), // ISO timestamp, null = never generated
  analysis_resolved_count: integer('analysis_resolved_count'), // resolved-market count at generation time
  // Auto-scheduling configuration (added by 0016_funnel_scheduling)
  target_resolved: integer('target_resolved').notNull().default(40), // stop generating once this many markets resolve
  markets_per_session: integer('markets_per_session').notNull().default(2), // funnel markets to claim per AM/PM session
  mix_binary: real('mix_binary').notNull().default(0.2),
  mix_single_choice: real('mix_single_choice').notNull().default(0.2),
  mix_multi_choice: real('mix_multi_choice').notNull().default(0.2),
  mix_longform: real('mix_longform').notNull().default(0.4),
});

// Dynamic surface topics (admin-created research themes)
export const surfaceTopics = sqliteTable('surface_topics', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  insight_goal: text('insight_goal').notNull(),
  example_seeds: text('example_seeds'), // JSON array of seed angles
  status: text('status').notNull().default('active'), // 'active' | 'paused' | 'archived'
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
  analysis_json: text('analysis_json'), // JSON { consensus, outliers, trends }
  analysis_generated_at: text('analysis_generated_at'), // ISO timestamp, null = never generated
  analysis_resolved_count: integer('analysis_resolved_count'), // resolved-market count at generation time
});

// Agent classification data (computed from opinion history)
export const agentClassifications = sqliteTable('agent_classifications', {
  id: text('id').primaryKey(),
  agent_id: text('agent_id').notNull().unique(),
  domain_tags: text('domain_tags').default('[]'),
  primary_domain: text('primary_domain'),
  opinion_style: text('opinion_style').default('unknown'),
  opinion_style_score: integer('opinion_style_score').default(0),
  derived_agent_type: text('derived_agent_type').default('unknown'),
  total_opinions_at_compute: integer('total_opinions_at_compute').default(0),
  consensus_alignment: integer('consensus_alignment').default(0),
  contrarian_rate: integer('contrarian_rate').default(0),
  last_active_at: text('last_active_at'),
  computed_at: text('computed_at').notNull(),
});

// Tunable thresholds for agent classification logic
export const classificationThresholds = sqliteTable('classification_thresholds', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  label: text('label').notNull(),
  description: text('description'),
  updated_at: text('updated_at').notNull(),
});

// Draft questions generated by LLM for admin review before deployment as markets.
// Drafts can originate from EITHER a surface_topic (legacy/manual) or a research_funnel
// (auto-scheduled). Exactly one of surface_topic_id / funnel_id must be non-null;
// CHECK constraint enforced in migration 0016_funnel_scheduling.
export const draftQuestions = sqliteTable('draft_questions', {
  id: text('id').primaryKey(),
  surface_topic_id: text('surface_topic_id'), // NULL when funnel_id is set
  funnel_id: text('funnel_id'), // NULL when surface_topic_id is set (added in 0016)
  question: text('question').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  answer_type: text('answer_type').notNull().default('binary'), // 'binary' | 'single_choice' | 'multi_choice' | 'longform' | 'ranking' | 'scale'
  answer_options: text('answer_options'), // JSON array (for single_choice/multi_choice/ranking) or JSON object (for scale)
  response_constraints: text('response_constraints'), // JSON { min_length, max_length }
  context_json: text('context_json').notNull().default('{}'),
  status: text('status').notNull().default('draft'), // 'draft' | 'approved' | 'rejected' | 'deployed'
  generation_round: integer('generation_round').notNull().default(1),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});
