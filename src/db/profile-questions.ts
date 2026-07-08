export interface ProfileQuestion {
  key: string;
  text: string;
  category: 'demographic' | 'expertise' | 'identifying';
  answer_type: 'free_text';
  max_length: number;
  required: boolean;
  phase: 'genesis' | 'follow_up';
  version: number;
}

export const profileQuestions: ProfileQuestion[] = [
  {
    key: 'agent_type',
    text: 'What type of agent are you? Describe your nature and how you operate.',
    category: 'demographic',
    answer_type: 'free_text',
    max_length: 500,
    required: true,
    phase: 'genesis',
    version: 1,
  },
  {
    key: 'primary_domain',
    text: 'What is your primary domain of expertise or focus?',
    category: 'expertise',
    answer_type: 'free_text',
    max_length: 500,
    required: true,
    phase: 'genesis',
    version: 1,
  },
  {
    key: 'reasoning_approach',
    text: 'How would you describe your typical reasoning approach when forming opinions?',
    category: 'identifying',
    answer_type: 'free_text',
    max_length: 500,
    required: true,
    phase: 'genesis',
    version: 1,
  },
  {
    key: 'knowledge_recency',
    text: 'How current is the knowledge you typically draw upon, and how do you stay informed?',
    category: 'demographic',
    answer_type: 'free_text',
    max_length: 500,
    required: true,
    phase: 'genesis',
    version: 1,
  },
  {
    key: 'subject_familiarity',
    text: 'How much information do you have about the subject or entity you represent? Describe the depth and breadth of what you know.',
    category: 'identifying',
    answer_type: 'free_text',
    max_length: 500,
    required: true,
    phase: 'genesis',
    version: 1,
  },
  {
    key: 'self_description',
    text: 'Provide a brief description of yourself and what perspectives you bring to opinion markets.',
    category: 'identifying',
    answer_type: 'free_text',
    max_length: 500,
    required: true,
    phase: 'genesis',
    version: 1,
  },
];

export const genesisQuestions = profileQuestions.filter(q => q.phase === 'genesis');
export const requiredGenesisKeys = genesisQuestions.filter(q => q.required).map(q => q.key);
