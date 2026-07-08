import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from './index.js';
import { markets } from './schema.js';
import logger from '../logger.js';
import { normalizeContextForStorage } from '../services/context.js';
import { getDefaultMarketFunding } from '../utils.js';

const customMarkets = [
  // Binary markets
  {
    question: 'Should napping be a formal part of the workday?',
    description:
      'Some companies and cultures embrace midday naps as a productivity tool, while others see them as laziness. Should employers provide nap rooms and scheduled rest periods?',
    context: {
      articles: [
        {
          title: 'The Science of Workplace Napping',
          url: 'https://example.com/workplace-napping',
          summary:
            'NASA research found a 26-minute nap improved pilot performance by 34%. Companies like Google and Nike have installed nap pods. Japan\'s "inemuri" tradition normalizes sleeping at work.',
        },
      ],
      data_points: [
        { label: 'Productivity boost from 20-min nap', value: '34%', source: 'NASA 1995 study' },
        { label: 'US workers who nap on workdays', value: '34%', source: 'Pew Research 2023' },
      ],
      links: [],
    },
    category: 'pure_opinion' as const,
    answer_type: 'binary' as const,
  },
  {
    question: 'Is it rude to wear headphones during a casual dinner with friends?',
    description:
      'With AirPods and earbuds becoming near-permanent accessories, the etiquette around wearing them in social settings is hotly debated. Where do you draw the line?',
    context: {
      articles: [
        {
          title: 'The Etiquette of Always-On Audio',
          url: 'https://example.com/headphone-etiquette',
          summary:
            'Etiquette experts are divided. Some say one earbud is acceptable, others say any headphone use during in-person socializing signals disinterest. Gen Z is far more permissive than older generations.',
        },
      ],
      data_points: [
        { label: 'US adults who own wireless earbuds', value: '72%', source: 'CTA 2024' },
        { label: 'Gen Z who find one earbud acceptable at dinner', value: '58%', source: 'Morning Consult 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion' as const,
    answer_type: 'binary' as const,
  },
  // Longform markets
  {
    question: 'If you could add one mandatory subject to every school curriculum worldwide, what would it be and why?',
    description:
      'Education systems vary enormously across countries, but imagine you had the power to add one universal subject from kindergarten through high school. What\'s missing, and how would it change the world?',
    context: {
      articles: [
        {
          title: 'What Schools Don\'t Teach',
          url: 'https://example.com/missing-school-subjects',
          summary:
            'Common suggestions include financial literacy, emotional intelligence, critical thinking, coding, and practical life skills. Finland\'s education reforms are often cited as a model for holistic curriculum design.',
        },
      ],
      data_points: [
        { label: 'US adults who feel financially literate', value: '33%', source: 'FINRA 2024' },
        { label: 'Countries requiring coding in school', value: '25+', source: 'UNESCO 2023' },
        { label: 'Students who report high stress', value: '45%', source: 'APA 2024' },
      ],
      links: [],
    },
    category: 'subjective_framing' as const,
    answer_type: 'longform' as const,
    response_constraints: {
      min_length: 200,
      max_length: 2000,
      topic_focus: 'education, society, and practical impact',
    },
  },
  {
    question: 'What is the most overrated tourist destination and what should people visit instead?',
    description:
      'Some of the world\'s most famous landmarks and cities leave visitors underwhelmed. Pick a destination you think is overrated, explain why, and recommend a superior alternative.',
    context: {
      articles: [
        {
          title: 'Overtourism and Disappointed Travelers',
          url: 'https://example.com/overrated-destinations',
          summary:
            'Cities like Venice, Barcelona, and Dubrovnik have struggled with overtourism. Meanwhile, surveys show many visitors to iconic sites like the Mona Lisa or Hollywood Walk of Fame feel let down.',
        },
      ],
      data_points: [
        { label: 'International tourist arrivals (2024)', value: '1.4 billion', source: 'UNWTO' },
        { label: 'Travelers who felt a destination was overhyped', value: '42%', source: 'Booking.com 2024' },
        { label: 'Average time spent viewing the Mona Lisa', value: '15 seconds', source: 'Louvre internal data' },
      ],
      links: [],
    },
    category: 'pure_opinion' as const,
    answer_type: 'longform' as const,
    response_constraints: {
      min_length: 200,
      max_length: 2000,
      topic_focus: 'travel, culture, and personal experience',
    },
  },
  {
    question: 'Invent a new holiday and explain how it would be celebrated.',
    description:
      'If you could create one new holiday that the whole world would observe, what would it celebrate? Describe the traditions, food, activities, and spirit of the day.',
    context: {
      articles: [
        {
          title: 'How Holidays Are Born',
          url: 'https://example.com/holiday-origins',
          summary:
            'Most modern holidays evolved from religious observances, harvest festivals, or civic commemorations. Recent additions like Earth Day (1970) and International Women\'s Day show new holidays can gain global traction.',
        },
      ],
      data_points: [
        { label: 'UN-recognized international days', value: '200+', source: 'United Nations' },
        { label: 'Americans who want more public holidays', value: '76%', source: 'Gallup 2024' },
        { label: 'Countries with the most public holidays', value: 'Cambodia (28), Sri Lanka (25)', source: 'World Atlas' },
      ],
      links: [],
    },
    category: 'subjective_framing' as const,
    answer_type: 'longform' as const,
    response_constraints: {
      min_length: 200,
      max_length: 2000,
      topic_focus: 'creativity, culture, traditions, and community',
    },
  },
];

export async function seedCustomMarkets() {
  const deadline = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
  const defaultFunding = getDefaultMarketFunding();

  logger.info({ deadline }, 'Seeding 5 custom markets (2 binary, 3 longform)');

  for (const market of customMarkets) {
    const existing = await db
      .select()
      .from(markets)
      .where(eq(markets.question, market.question));

    if (existing.length > 0) {
      logger.info({ question: market.question }, 'Skipping (already exists)');
      continue;
    }

    await db.insert(markets).values({
      id: randomUUID(),
      question: market.question,
      description: market.description,
      context_json: JSON.stringify(normalizeContextForStorage(market.context)),
      category: market.category,
      status: 'open',
      created_by: 'admin',
      creator_type: 'admin',
      deadline,
      created_at: new Date().toISOString(),
      answer_type: market.answer_type,
      response_constraints:
        'response_constraints' in market && market.response_constraints
          ? JSON.stringify(market.response_constraints)
          : null,
      knowledge_source: 'any',
      funded_amount: defaultFunding,
      platform_fee: 0,
      reward_pool: defaultFunding,
      reward_distributed: 0,
    });

    logger.info({ answerType: market.answer_type, question: market.question }, 'Inserted custom market');
  }

  logger.info('Custom market seeding complete');
}

// Run directly when executed as a script
const isDirectRun = process.argv[1]?.includes('seed-custom-markets');
if (isDirectRun) {
  seedCustomMarkets().catch((err) => {
    logger.error({ err }, 'Custom seed failed');
    process.exit(1);
  });
}
