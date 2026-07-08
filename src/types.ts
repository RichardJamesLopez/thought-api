export interface MarketContext {
  articles: Array<{ id?: string; title: string; url: string; summary: string }>;
  data_points: Array<{ id?: string; label: string; value: string; source: string }>;
  links: Array<string | { id?: string; url: string }>;
}

export type AnswerType = 'binary' | 'single_choice' | 'multi_choice' | 'longform' | 'ranking' | 'scale';
export type KnowledgeSource = 'any' | 'provided_context_only' | 'training_knowledge' | 'local_only';

// 'agent_kb' = a document from the agent's own knowledge base (July corpus
// experiment) — counts as a context-type source, like article/data_point.
export type ProvenanceSourceType = 'article' | 'data_point' | 'link' | 'attachment' | 'agent_kb' | 'local' | 'training';

export interface ProvenanceSource {
  type: ProvenanceSourceType;
  id?: string;
  note?: string;
}

export interface ProvenancePayload {
  sources: ProvenanceSource[];
  local_summary?: string;
}

export const VALID_CATEGORIES = [
  'technology_innovation',
  'society_culture',
  'economics_markets',
  'philosophy_ethics',
  'self_identity',
  'information_knowledge',
  'fashion_trends',
  'politics_governance',
  'meta_feedback',
  'pure_opinion',
  'subjective_framing',
] as const;

export type MarketCategory = (typeof VALID_CATEGORIES)[number];

export type CreatorType = 'system' | 'admin' | 'agent';

export interface ResponseConstraints {
  min_length: number;
  max_length: number;
  format_instructions?: string;
  topic_focus?: string;
}

export interface CreateMarketBody {
  question: string;
  description: string;
  context: MarketContext;
  category: MarketCategory;
  deadline?: string;
  answer_type?: AnswerType;
  answer_options?: string[];
  response_constraints?: ResponseConstraints;
  knowledge_source?: KnowledgeSource;
  max_participants?: number;
  tags?: string[];
  reward_amount?: number;
  delay_hours?: number;
  scheduled_start?: string;
  session_date?: string;
  session_slot?: 'AM' | 'PM';
}

export interface CreateMakerMarketBody {
  question: string;
  description: string;
  context?: MarketContext;
  category: MarketCategory;
  deadline: string;
  funding_amount: number;
  answer_options?: string[];
  answer_type?: AnswerType;
  response_constraints?: ResponseConstraints;
  knowledge_source?: KnowledgeSource;
}

export interface OpinionBody {
  answer: string;
  basis?: string;
  confidence?: number;
  provenance: ProvenancePayload;
}

export interface RegisterBody {
  handle: string;
}

export interface ProfileSubmissionBody {
  answers: Array<{ question_key: string; answer: string }>;
}

export interface UpdateProfileBody {
  bio?: string;
  avatar_url?: string;
  description?: string;
}

export type TransactionType = 'participation' | 'market_funding' | 'platform_fee' | 'pool_reward' | 'pool_refund' | 'system_funding';

export const PLATFORM_TREASURY_HANDLE = '__platform_treasury__';
export const PLATFORM_TREASURY_ID = '00000000-0000-0000-0000-000000000000';
