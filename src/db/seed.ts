import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from './index.js';
import { markets } from './schema.js';
import logger from '../logger.js';
import { normalizeContextForStorage } from '../services/context.js';
import { getDefaultMarketFunding } from '../utils.js';

const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const defaultFunding = getDefaultMarketFunding();

const seedMarkets = [
  {
    question: 'Should men pay for the first date?',
    description: 'A perennial dating norm debate. Consider cultural expectations, gender equality, and modern relationship dynamics.',
    context: {
      articles: [
        {
          title: 'The Evolution of Dating Norms',
          url: 'https://example.com/dating-norms',
          summary: 'Survey data shows 63% of men still expect to pay on first dates, while 45% of women prefer splitting. Generational divide is significant.',
        },
      ],
      data_points: [
        { label: 'Men who expect to pay', value: '63%', source: 'Pew Research 2024' },
        { label: 'Women who prefer splitting', value: '45%', source: 'Pew Research 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
  },
  {
    question: 'Did Beyonce deserve Album of the Year?',
    description: "Beyonce's 'Cowboy Carter' won Album of the Year at the 2025 Grammys. Was it deserved over the other nominees?",
    context: {
      articles: [
        {
          title: '2025 Grammy Album of the Year nominees',
          url: 'https://example.com/grammys-2025',
          summary: 'Nominees included Beyonce (Cowboy Carter), Charli XCX (Brat), Billie Eilish, Sabrina Carpenter.',
        },
      ],
      data_points: [
        { label: 'Beyonce total Grammy wins', value: '32', source: 'Recording Academy' },
        { label: 'Chart position', value: '#1 Billboard 200', source: 'Billboard' },
      ],
      links: [],
    },
    category: 'pure_opinion',
  },
  {
    question: 'Was the 2024 election outcome surprising?',
    description: 'The 2024 US presidential election resulted in a decisive outcome. Given pre-election polling, media narratives, and historical precedent — was the result surprising?',
    context: {
      articles: [
        {
          title: '2024 Election Polling vs Results',
          url: 'https://example.com/2024-election',
          summary: 'Pre-election polls showed a tight race. Final result diverged from polling averages.',
        },
      ],
      data_points: [
        { label: 'Polling average margin', value: '~1 point', source: '538/Silver Bulletin' },
        { label: 'Actual margin', value: 'Larger than polled', source: 'AP' },
      ],
      links: [],
    },
    category: 'subjective_framing',
  },
  {
    question: 'Is remote work here to stay?',
    description: 'Despite return-to-office mandates from major companies, remote work remains widespread.',
    context: {
      articles: [
        {
          title: 'State of Remote Work 2025',
          url: 'https://example.com/remote-work-2025',
          summary: '28% fully remote, 40% hybrid. Amazon and JPMorgan mandated 5-day RTO.',
        },
      ],
      data_points: [
        { label: 'Fully remote (US)', value: '28%', source: 'BLS' },
        { label: 'Hybrid (US)', value: '40%', source: 'Gallup 2025' },
      ],
      links: [],
    },
    category: 'subjective_framing',
  },
  {
    question: 'Should employers post salary ranges?',
    description: 'Pay transparency laws are spreading across US states and EU countries. Should all employers post salary ranges in job listings?',
    context: {
      articles: [
        {
          title: 'Pay Transparency Laws 2025',
          url: 'https://example.com/pay-transparency',
          summary: '10+ US states require salary ranges. EU directive takes effect 2026.',
        },
      ],
      data_points: [
        { label: 'States with laws', value: '10+', source: 'SHRM' },
        { label: 'Gender pay gap (US)', value: '16%', source: 'Dept of Labor' },
        { label: 'Job seekers preferring ranges', value: '82%', source: 'LinkedIn' },
      ],
      links: [],
    },
    category: 'pure_opinion',
  },
];

async function seed() {
  logger.info('Seeding markets...');

  for (const market of seedMarkets) {
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
      funded_amount: defaultFunding,
      platform_fee: 0,
      reward_pool: defaultFunding,
      reward_distributed: 0,
    });

    logger.info({ question: market.question }, 'Inserted market');
  }

  logger.info('Seeding complete.');
}

seed().catch((err) => {
  logger.error({ err }, 'Seed failed');
  process.exit(1);
});
