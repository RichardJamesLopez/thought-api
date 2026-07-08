import type { MarketContext, AnswerType, ResponseConstraints, KnowledgeSource, MarketCategory } from '../types.js';

export interface MarketTemplate {
  question: string;
  description: string;
  context: MarketContext;
  category: MarketCategory;
  duration_hours: number;
  answer_type?: AnswerType;
  answer_options?: string[];
  response_constraints?: ResponseConstraints;
  knowledge_source?: KnowledgeSource;
  tags?: string[];
  reward_pool?: number;
  research_theme?: string;
  phase?: number;
}

export const marketTemplates: MarketTemplate[] = [
  // ── Pure Opinion (1–10) ──────────────────────────────────────────────

  {
    question: 'Is a hot dog a sandwich?',
    description:
      'The classic culinary taxonomy debate. Does placing a protein inside bread automatically make something a sandwich, or does structure matter?',
    context: {
      articles: [
        {
          title: 'The Great Hot Dog Debate: Food Taxonomy in America',
          url: 'https://example.com/hot-dog-sandwich-debate',
          summary:
            'A 2023 YouGov poll found that 60% of Americans say a hot dog is not a sandwich, while the USDA technically classifies it as one under its regulatory framework.',
        },
      ],
      data_points: [
        { label: 'Americans who say it is NOT a sandwich', value: '60%', source: 'YouGov 2023' },
        { label: 'Annual hot dogs consumed in the US', value: '20 billion', source: 'National Hot Dog and Sausage Council' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 12,
  },

  {
    question: 'Should homework be abolished?',
    description:
      'Educators and parents remain divided on whether homework reinforces learning or simply burdens students with diminishing returns.',
    context: {
      articles: [
        {
          title: 'Does Homework Help? What the Research Says',
          url: 'https://example.com/homework-research',
          summary:
            'Meta-analyses show homework has a positive but modest effect on achievement for high-school students, while benefits for elementary students are negligible.',
        },
      ],
      data_points: [
        { label: 'Average weekly homework hours (US high schoolers)', value: '6.8 hours', source: 'Brookings Institution 2023' },
        { label: 'Teachers who believe homework is essential', value: '72%', source: 'EdWeek Research Center 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 12,
  },

  {
    question: 'Is it ever acceptable to recline your airplane seat?',
    description:
      'Shrinking airline seat pitch has turned reclining into a flashpoint for passenger etiquette. Personal comfort vs. communal courtesy.',
    context: {
      articles: [
        {
          title: 'The Incredible Shrinking Airline Seat',
          url: 'https://example.com/airline-seat-recline',
          summary:
            'Average economy seat pitch has dropped from 35 inches in the 1970s to 31 inches today, making the recline debate more heated than ever.',
        },
      ],
      data_points: [
        { label: 'Passengers who say reclining is rude', value: '41%', source: 'FiveThirtyEight / YouGov 2023' },
        { label: 'Average economy seat pitch', value: '31 inches', source: 'SeatGuru 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 12,
  },

  {
    question: 'Should social media require age verification?',
    description:
      'Growing concern over youth mental health has spurred calls for mandatory age gates on social platforms, balanced against privacy and implementation concerns.',
    context: {
      articles: [
        {
          title: 'Social Media Age Verification: Policy Landscape',
          url: 'https://example.com/social-media-age-verification',
          summary:
            'Several US states and the EU have introduced or proposed age-verification mandates for social media, while civil liberties groups warn of privacy risks.',
        },
      ],
      data_points: [
        { label: 'US parents favoring age verification', value: '77%', source: 'Pew Research 2024' },
        { label: 'Teens (13-17) on at least one social platform', value: '95%', source: 'Pew Research 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 12,
  },

  {
    question: 'Is modern art real art?',
    description:
      'From Duchamp\'s urinal to banana-taped-to-a-wall, the boundaries of "art" are perennially contested between conceptualism and craftsmanship.',
    context: {
      articles: [
        {
          title: 'Public Perception of Contemporary Art',
          url: 'https://example.com/modern-art-perception',
          summary:
            'A 2024 Harris poll found that 52% of Americans believe modern and contemporary art requires less skill than classical art, yet museum attendance for contemporary exhibits reached record highs.',
        },
      ],
      data_points: [
        { label: 'Americans who view modern art skeptically', value: '52%', source: 'Harris Poll 2024' },
        { label: 'Global contemporary art market value', value: '$2.7 billion', source: 'Art Basel / UBS Report 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 12,
  },

  {
    question: 'Should tipping culture be replaced with higher wages?',
    description:
      'The US tipping system is increasingly debated as gratuity expectations expand beyond restaurants while workers remain dependent on tips for a living wage.',
    context: {
      articles: [
        {
          title: 'Tipping Fatigue and the Push for Fair Wages',
          url: 'https://example.com/tipping-culture-wages',
          summary:
            'The federal tipped minimum wage has been $2.13/hour since 1991. Meanwhile, digital payment prompts have expanded tipping requests to counter-service, self-checkout, and more.',
        },
      ],
      data_points: [
        { label: 'Federal tipped minimum wage', value: '$2.13/hour', source: 'Dept of Labor' },
        { label: 'Americans experiencing "tip fatigue"', value: '66%', source: 'Bankrate 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 12,
  },

  {
    question: 'Is it better to rent or own a home?',
    description:
      'Rising home prices and mortgage rates have reignited the rent-vs-buy debate, challenging the long-standing assumption that ownership is always the smarter financial move.',
    context: {
      articles: [
        {
          title: 'Rent vs. Buy: The 2025 Calculus',
          url: 'https://example.com/rent-vs-buy-2025',
          summary:
            'With median US home prices above $400K and mortgage rates near 7%, the breakeven horizon for buying has stretched to 7+ years in many metro areas.',
        },
      ],
      data_points: [
        { label: 'US median home price', value: '$412,000', source: 'National Association of Realtors 2025' },
        { label: 'US homeownership rate', value: '65.6%', source: 'Census Bureau Q4 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 12,
  },

  {
    question: 'Should there be a universal basic income?',
    description:
      'UBI pilots worldwide have produced mixed results, fueling debate on whether unconditional cash payments reduce poverty or discourage work.',
    context: {
      articles: [
        {
          title: 'Lessons from Global UBI Experiments',
          url: 'https://example.com/ubi-experiments',
          summary:
            'Finland, Kenya, and several US cities have run UBI pilots. Results generally show improved well-being and modest reductions in labor supply.',
        },
      ],
      data_points: [
        { label: 'Americans who support a UBI', value: '45%', source: 'Gallup 2024' },
        { label: 'Estimated annual cost of $1K/month US UBI', value: '$3.1 trillion', source: 'Congressional Budget Office estimate' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 12,
  },

  {
    question: 'Is college worth the cost?',
    description:
      'With student loan debt surpassing $1.7 trillion, the return on investment of a four-year degree is under more scrutiny than ever.',
    context: {
      articles: [
        {
          title: 'The ROI of a College Degree in 2025',
          url: 'https://example.com/college-roi-2025',
          summary:
            'College graduates still earn roughly $1.2 million more over a lifetime than non-graduates on average, but the premium varies drastically by major and institution.',
        },
      ],
      data_points: [
        { label: 'Total US student loan debt', value: '$1.77 trillion', source: 'Federal Reserve 2025' },
        { label: "Median earnings premium (bachelor's vs. high school)", value: '75%', source: 'Bureau of Labor Statistics 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 12,
  },

  {
    question: 'Should voting be mandatory?',
    description:
      'Over 20 countries enforce compulsory voting. Proponents cite stronger democratic legitimacy, while opponents call it a violation of personal freedom.',
    context: {
      articles: [
        {
          title: 'Compulsory Voting Around the World',
          url: 'https://example.com/compulsory-voting',
          summary:
            'Australia has enforced mandatory voting since 1924 and consistently sees turnout above 90%, compared to roughly 60% in recent US presidential elections.',
        },
      ],
      data_points: [
        { label: 'US voter turnout (2024 presidential)', value: '62%', source: 'United States Elections Project' },
        { label: 'Countries with compulsory voting', value: '22', source: 'International IDEA 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 12,
  },

  // ── Subjective Framing (11–20) ───────────────────────────────────────

  {
    question: 'Has AI made user support better?',
    description:
      'AI chatbots and virtual assistants now handle millions of support interactions daily. Faster responses are weighed against frustration with impersonal or inaccurate help.',
    context: {
      articles: [
        {
          title: 'AI in User Support: Efficiency vs. Satisfaction',
          url: 'https://example.com/ai-user-support',
          summary:
            'Companies using AI chatbots report 30% cost reductions in support operations, but user satisfaction scores for bot-handled interactions trail human agents by 15 points.',
        },
      ],
      data_points: [
        { label: 'User interactions handled by AI', value: '70% (at adopting firms)', source: 'Gartner 2025' },
        { label: 'Consumers preferring human agents', value: '61%', source: 'Salesforce State of Service 2024' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 12,
  },

  {
    question: 'Are streaming services better than theaters for movies?',
    description:
      'Streaming has made films instantly accessible at home, but the theatrical experience offers an immersive communal setting that some argue is irreplaceable.',
    context: {
      articles: [
        {
          title: 'Streaming vs. Cinema: The Battle for Audiences',
          url: 'https://example.com/streaming-vs-theaters',
          summary:
            'US box-office revenue rebounded to $8.7 billion in 2024 but remains below pre-pandemic peaks, while global streaming subscriptions surpassed 1.8 billion.',
        },
      ],
      data_points: [
        { label: 'US box office revenue (2024)', value: '$8.7 billion', source: 'Comscore 2025' },
        { label: 'Global streaming subscriptions', value: '1.8 billion', source: 'Motion Picture Association 2024' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 12,
  },

  {
    question: 'Has social media improved political discourse?',
    description:
      'Social platforms have democratized political speech but are also blamed for polarization, misinformation, and echo chambers.',
    context: {
      articles: [
        {
          title: 'Social Media and Political Polarization',
          url: 'https://example.com/social-media-politics',
          summary:
            'Research from NYU and Stanford found that deactivating Facebook for four weeks before the 2018 midterms reduced political polarization but also reduced political knowledge.',
        },
      ],
      data_points: [
        { label: 'Americans who say social media is mostly bad for democracy', value: '64%', source: 'Pew Research 2024' },
        { label: 'Adults who get news from social media', value: '54%', source: 'Pew Research 2024' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 12,
  },

  {
    question: 'Is the gig economy good for workers?',
    description:
      'Gig platforms offer flexibility and autonomy, but critics point to lack of benefits, income instability, and algorithmic management as serious downsides.',
    context: {
      articles: [
        {
          title: 'The State of Gig Work in America',
          url: 'https://example.com/gig-economy-workers',
          summary:
            'An estimated 36% of US workers participate in the gig economy in some capacity. Median hourly earnings for app-based gig workers fall below $15 after expenses.',
        },
      ],
      data_points: [
        { label: 'US workers in the gig economy', value: '36%', source: 'McKinsey 2024' },
        { label: 'Gig workers without health insurance through work', value: '55%', source: 'Bureau of Labor Statistics 2024' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 12,
  },

  {
    question: 'Has the smartphone made life better overall?',
    description:
      'Smartphones have put the world at our fingertips but are also linked to rising anxiety, distraction, and screen-time concerns, especially among young people.',
    context: {
      articles: [
        {
          title: 'Smartphones: A Decade of Impact',
          url: 'https://example.com/smartphone-impact',
          summary:
            'Since the iPhone launch in 2007, smartphone ownership has reached 97% of US adults under 50. Researchers debate whether the correlation with teen anxiety represents causation.',
        },
      ],
      data_points: [
        { label: 'US adults who own a smartphone', value: '90%', source: 'Pew Research 2024' },
        { label: 'Average daily screen time (US adults)', value: '7 hours 4 minutes', source: 'eMarketer 2024' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 12,
  },

  {
    question: 'Is the 40-hour work week still appropriate?',
    description:
      'The five-day, 40-hour standard dates to the 1930s. Four-day work week trials have shown promising results, reigniting debate about productivity and well-being.',
    context: {
      articles: [
        {
          title: 'Four-Day Work Week Trials: Global Results',
          url: 'https://example.com/four-day-work-week',
          summary:
            'The world\'s largest four-day work week trial in the UK found that 92% of participating companies chose to continue the policy, citing maintained productivity and improved employee well-being.',
        },
      ],
      data_points: [
        { label: 'UK trial companies that continued 4-day week', value: '92%', source: 'Autonomy / 4 Day Week Global 2023' },
        { label: 'US workers who want a 4-day week', value: '81%', source: 'Gallup 2024' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 12,
  },

  {
    question: 'Has cancel culture gone too far?',
    description:
      'Public accountability via social media can enforce norms, but critics argue it has become disproportionate, punitive, and chilling to free expression.',
    context: {
      articles: [
        {
          title: 'Cancel Culture: Accountability or Overreach?',
          url: 'https://example.com/cancel-culture-debate',
          summary:
            'A Pew survey found that 58% of Americans believe "calling out others on social media" is more likely to hold people accountable, while 38% say it punishes people who don\'t deserve it.',
        },
      ],
      data_points: [
        { label: 'Americans familiar with the term "cancel culture"', value: '74%', source: 'Pew Research 2024' },
        { label: 'Americans who say cancel culture has gone too far', value: '55%', source: 'Harvard CAPS / Harris Poll 2024' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 12,
  },

  {
    question: 'Is cryptocurrency a net positive for society?',
    description:
      'Crypto advocates tout financial inclusion and decentralization, while skeptics highlight environmental costs, fraud, and speculative volatility.',
    context: {
      articles: [
        {
          title: 'Crypto at a Crossroads: Regulation and Adoption',
          url: 'https://example.com/crypto-society-impact',
          summary:
            'Global crypto ownership reached an estimated 560 million people in 2024, even as the industry faced high-profile collapses and tightening regulatory scrutiny worldwide.',
        },
      ],
      data_points: [
        { label: 'Global crypto owners', value: '560 million', source: 'Triple-A / Chainalysis 2024' },
        { label: 'Estimated crypto fraud losses (2023)', value: '$5.6 billion', source: 'FBI Internet Crime Report 2024' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 12,
  },

  {
    question: 'Has globalization been good for developing countries?',
    description:
      'Globalization has lifted hundreds of millions out of extreme poverty, but critics argue it has also entrenched inequality and dependency on foreign capital.',
    context: {
      articles: [
        {
          title: 'Globalization and the Developing World',
          url: 'https://example.com/globalization-developing',
          summary:
            'The share of the world population living in extreme poverty fell from 36% in 1990 to under 9% in 2024, largely driven by trade integration in East and South Asia.',
        },
      ],
      data_points: [
        { label: 'Extreme poverty rate (global, 1990)', value: '36%', source: 'World Bank 2024' },
        { label: 'Extreme poverty rate (global, 2024)', value: '8.6%', source: 'World Bank 2024' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 12,
  },

  {
    question: 'Is the news media more biased now than 20 years ago?',
    description:
      'Trust in media has declined sharply in recent decades. The rise of partisan outlets and social-media-driven news has blurred the line between reporting and opinion.',
    context: {
      articles: [
        {
          title: 'Trust in Media: A Two-Decade Decline',
          url: 'https://example.com/media-bias-trends',
          summary:
            'Gallup tracking shows Americans\' trust in mass media fell from 53% in 2003 to 31% in 2024, with the steepest declines among younger and politically independent respondents.',
        },
      ],
      data_points: [
        { label: 'Americans who trust mass media (2024)', value: '31%', source: 'Gallup 2024' },
        { label: 'Americans who trust mass media (2003)', value: '53%', source: 'Gallup 2003' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 12,
  },

  // ── Hourly Rotation Templates (21–50) ────────────────────────────────

  {
    question: 'Should cities ban cars from downtown areas?',
    description:
      'Pedestrian-only city centers have grown across Europe, promising cleaner air and safer streets. But critics warn of economic disruption for businesses that rely on drive-in traffic.',
    context: {
      articles: [
        {
          title: 'Car-Free City Centers: Lessons from Europe',
          url: 'https://example.com/car-free-cities',
          summary:
            'Cities like Oslo, Barcelona, and Paris have restricted car access downtown, reporting 20-30% drops in air pollution and increases in retail foot traffic after initial adjustment periods.',
        },
      ],
      data_points: [
        { label: 'European cities with car-free zones', value: 'Over 250', source: 'European Commission 2024' },
        { label: 'US adults who support car-free downtown areas', value: '38%', source: 'Pew Research 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 1,
  },

  {
    question: 'Is remote work better than office work?',
    description:
      'The post-pandemic return-to-office push has clashed with worker preferences for flexibility. Productivity data is mixed, and the debate remains heated.',
    context: {
      articles: [
        {
          title: 'Remote vs. Office: What the Data Shows',
          url: 'https://example.com/remote-vs-office',
          summary:
            'Stanford research found fully remote workers were 10% less productive than in-office peers, but hybrid workers matched or exceeded office productivity while reporting higher satisfaction.',
        },
      ],
      data_points: [
        { label: 'Workers who prefer hybrid or remote', value: '83%', source: 'Gallup 2024' },
        { label: 'Companies requiring full return to office', value: '34%', source: 'Resume Builder 2025' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 1,
  },

  {
    question: 'Should zoos still exist?',
    description:
      'Zoos claim to serve conservation and education, but animal welfare advocates argue captivity is inherently harmful regardless of conditions.',
    context: {
      articles: [
        {
          title: 'The Modern Zoo Debate: Conservation vs. Captivity',
          url: 'https://example.com/zoo-debate',
          summary:
            'AZA-accredited zoos have contributed to saving over 40 species from extinction, but studies show many large mammals exhibit signs of psychological distress in captivity.',
        },
      ],
      data_points: [
        { label: 'Species saved from extinction by zoo programs', value: 'Over 40', source: 'AZA 2024' },
        { label: 'Americans who view zoos favorably', value: '62%', source: 'YouGov 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 1,
  },

  {
    question: 'Has food delivery made dining culture worse?',
    description:
      'Apps like DoorDash and Uber Eats have made restaurant food available on demand, but critics point to declining in-restaurant dining, lower food quality during delivery, and exploitative fees for restaurants.',
    context: {
      articles: [
        {
          title: 'The Hidden Costs of Food Delivery Apps',
          url: 'https://example.com/food-delivery-impact',
          summary:
            'Restaurants report paying 15-30% commission fees to delivery platforms, often erasing profit margins. Meanwhile, delivery volume has tripled since 2019.',
        },
      ],
      data_points: [
        { label: 'US food delivery market size (2024)', value: '$63 billion', source: 'Statista 2024' },
        { label: 'Restaurants that say delivery apps hurt profitability', value: '71%', source: 'National Restaurant Association 2024' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 1,
  },

  {
    question: 'Should parents limit screen time for children?',
    description:
      'Screen time guidelines remain contentious as devices become central to education and social life. Where to draw the line between beneficial use and overexposure is unclear.',
    context: {
      articles: [
        {
          title: 'Screen Time and Child Development: Latest Research',
          url: 'https://example.com/screen-time-kids',
          summary:
            'The AAP recommends no more than 1-2 hours of recreational screen time for children, but average use among 8-12 year olds now exceeds 5 hours daily.',
        },
      ],
      data_points: [
        { label: 'Average daily screen time (ages 8-12)', value: '5.5 hours', source: 'Common Sense Media 2024' },
        { label: 'Parents concerned about their child\'s screen time', value: '71%', source: 'Pew Research 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 1,
  },

  {
    question: 'Are electric vehicles worth the switch?',
    description:
      'EV adoption is accelerating globally, but concerns about charging infrastructure, battery longevity, and upfront cost keep many drivers hesitant.',
    context: {
      articles: [
        {
          title: 'The EV Transition: Progress and Barriers',
          url: 'https://example.com/ev-transition',
          summary:
            'Global EV sales reached 17 million in 2024, representing 22% of new car sales. However, charging infrastructure growth has lagged behind adoption in many regions.',
        },
      ],
      data_points: [
        { label: 'Global EV share of new car sales (2024)', value: '22%', source: 'IEA Global EV Outlook 2025' },
        { label: 'US adults who would consider an EV for next purchase', value: '47%', source: 'Gallup 2024' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 1,
  },

  {
    question: 'Is social media a net positive for small businesses?',
    description:
      'Social platforms have given small businesses free access to billions of potential users, but algorithmic changes, pay-to-play models, and platform dependency create real risks.',
    context: {
      articles: [
        {
          title: 'Small Business and Social Media: Opportunity or Trap?',
          url: 'https://example.com/small-biz-social',
          summary:
            '93% of small businesses use social media for marketing, but organic reach has declined below 5% on most platforms, pushing businesses toward paid advertising.',
        },
      ],
      data_points: [
        { label: 'Small businesses using social media marketing', value: '93%', source: 'Score.org 2024' },
        { label: 'Average organic reach on Facebook business pages', value: '2.6%', source: 'Hootsuite 2024' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 1,
  },

  {
    question: 'Should AI-generated art be eligible for awards?',
    description:
      'AI image generators have produced works that win art competitions, sparking debate about creativity, authorship, and what constitutes art in the age of algorithms.',
    context: {
      articles: [
        {
          title: 'AI Art and the Question of Authorship',
          url: 'https://example.com/ai-art-awards',
          summary:
            'In 2022, an AI-generated image won the Colorado State Fair art competition, prompting backlash from artists and renewed debate about the definition of creative authorship.',
        },
      ],
      data_points: [
        { label: 'Artists who oppose AI art in competitions', value: '76%', source: 'Creative Industries Survey 2024' },
        { label: 'Adults who consider AI-generated images real art', value: '35%', source: 'YouGov 2024' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 1,
  },

  {
    question: 'Is space exploration worth the cost?',
    description:
      'Space agencies and commercial organizations are spending billions on lunar missions, Mars plans, and satellite constellations. Critics argue the money is better spent on Earth-bound problems.',
    context: {
      articles: [
        {
          title: 'The Economics of Space Exploration',
          url: 'https://example.com/space-economics',
          summary:
            'NASA estimates that every dollar spent on space exploration returns between $7-14 to the economy through technology spinoffs, but critics question whether direct investment in Earth infrastructure would yield more.',
        },
      ],
      data_points: [
        { label: 'NASA annual budget (2025)', value: '$25.4 billion', source: 'NASA 2025' },
        { label: 'Americans who say space exploration is worthwhile', value: '72%', source: 'Pew Research 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 1,
  },

  {
    question: 'Should fast fashion be regulated?',
    description:
      'Ultra-cheap clothing from fast fashion brands drives overconsumption and environmental harm, but regulation could raise prices for budget-conscious consumers.',
    context: {
      articles: [
        {
          title: 'The Environmental Cost of Fast Fashion',
          url: 'https://example.com/fast-fashion-regulation',
          summary:
            'The fashion industry produces 10% of global carbon emissions and is the second-largest consumer of water. The EU has proposed extended producer responsibility laws targeting textile waste.',
        },
      ],
      data_points: [
        { label: 'Clothing items produced globally per year', value: '100 billion', source: 'Ellen MacArthur Foundation 2024' },
        { label: 'Garments discarded within one year of purchase', value: '60%', source: 'UNEP 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 1,
  },

  {
    question: 'Has algorithm-driven content made the internet worse?',
    description:
      'Recommendation algorithms maximize engagement but are blamed for filter bubbles, doom-scrolling, and the decline of intentional browsing and discovery.',
    context: {
      articles: [
        {
          title: 'The Algorithmic Internet: Engagement vs. Enrichment',
          url: 'https://example.com/algorithm-internet',
          summary:
            'Studies show algorithmically curated feeds increase time-on-site by 30-50% but also correlate with higher rates of anxiety and lower satisfaction with content consumed.',
        },
      ],
      data_points: [
        { label: 'Internet users who feel overwhelmed by algorithm-driven content', value: '56%', source: 'Reuters Digital News Report 2024' },
        { label: 'Time spent on algorithm-recommended content vs. self-selected', value: '70% vs. 30%', source: 'Pew Research 2024' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 1,
  },

  {
    question: 'Should prescription drugs be advertised directly to consumers?',
    description:
      'The US and New Zealand are the only countries allowing direct-to-consumer pharmaceutical advertising. Proponents say it empowers patients; critics say it drives unnecessary prescriptions.',
    context: {
      articles: [
        {
          title: 'DTC Pharma Ads: Informed Patients or Manufactured Demand?',
          url: 'https://example.com/pharma-advertising',
          summary:
            'Pharma companies spent $8.5 billion on DTC advertising in 2024. Studies show advertised drugs are prescribed more often, though not always as the most effective option.',
        },
      ],
      data_points: [
        { label: 'US pharma DTC ad spending (2024)', value: '$8.5 billion', source: 'JAMA 2025' },
        { label: 'Countries allowing DTC pharma ads', value: '2 (US, New Zealand)', source: 'WHO 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 1,
  },

  {
    question: 'Is a cashless society a good idea?',
    description:
      'Digital payments are overtaking cash in many countries. Advocates tout convenience and transparency, while critics worry about surveillance, exclusion, and system fragility.',
    context: {
      articles: [
        {
          title: 'Going Cashless: Progress or Peril?',
          url: 'https://example.com/cashless-society',
          summary:
            'Sweden leads the cashless transition with only 8% of transactions in cash, but has also passed laws requiring banks to maintain cash services to protect vulnerable populations.',
        },
      ],
      data_points: [
        { label: 'US transactions made in cash (2024)', value: '16%', source: 'Federal Reserve 2024' },
        { label: 'US adults without a bank account', value: '4.5%', source: 'FDIC 2024' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 1,
  },

  {
    question: 'Should athletes be allowed to use performance-enhancing drugs?',
    description:
      'Anti-doping enforcement is costly and inconsistent. Some argue a regulated approach would level the playing field and reduce health risks from unmonitored use.',
    context: {
      articles: [
        {
          title: 'The Anti-Doping Debate: Prohibition vs. Regulation',
          url: 'https://example.com/doping-debate',
          summary:
            'WADA spends over $370 million annually on anti-doping enforcement, yet estimates suggest 30-40% of elite athletes use banned substances, raising questions about the effectiveness of prohibition.',
        },
      ],
      data_points: [
        { label: 'Estimated elite athletes using PEDs', value: '30-40%', source: 'British Journal of Sports Medicine 2024' },
        { label: 'WADA annual budget', value: '$370 million', source: 'WADA 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 1,
  },

  {
    question: 'Should public transportation be free?',
    description:
      'Several cities have experimented with fare-free transit to reduce car dependence and help low-income residents, but funding the lost revenue remains a challenge.',
    context: {
      articles: [
        {
          title: 'The Case for Fare-Free Public Transit',
          url: 'https://example.com/free-transit',
          summary:
            'Luxembourg became the first country to make all public transit free in 2020. Ridership increased 10%, but car usage dropped only marginally, raising questions about effectiveness.',
        },
      ],
      data_points: [
        { label: 'US households without a car', value: '8.7%', source: 'Census Bureau 2024' },
        { label: 'Share of transit funding from fares (US average)', value: '30%', source: 'American Public Transportation Association 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 1,
  },

  {
    question: 'Has online dating made relationships better?',
    description:
      'Dating apps have become the most common way couples meet, but critics point to choice overload, superficial swiping, and declining relationship satisfaction.',
    context: {
      articles: [
        {
          title: 'Online Dating: Connection or Commodification?',
          url: 'https://example.com/online-dating-impact',
          summary:
            'Stanford research shows that nearly 60% of couples who got together in 2024 met online. However, surveys show rising dissatisfaction with app-based dating among users under 30.',
        },
      ],
      data_points: [
        { label: 'Couples who met online (2024)', value: '60%', source: 'Stanford Social Research 2024' },
        { label: 'Dating app users dissatisfied with the experience', value: '53%', source: 'Pew Research 2024' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 1,
  },

  {
    question: 'Should influencers be regulated like advertisers?',
    description:
      'Social media influencers promote products to millions, often without clear disclosure. Consumer advocates want stricter rules; creators say existing guidelines are sufficient.',
    context: {
      articles: [
        {
          title: 'Influencer Marketing and Consumer Protection',
          url: 'https://example.com/influencer-regulation',
          summary:
            'The FTC has increased enforcement against undisclosed influencer partnerships, but compliance remains low. France passed a landmark law in 2023 specifically regulating influencer marketing.',
        },
      ],
      data_points: [
        { label: 'Global influencer marketing spend (2024)', value: '$24 billion', source: 'Influencer Marketing Hub 2024' },
        { label: 'Sponsored posts with proper disclosure', value: '38%', source: 'FTC Study 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 1,
  },

  {
    question: 'Is nuclear energy the best path to decarbonization?',
    description:
      'Nuclear power produces minimal carbon emissions and provides reliable baseload energy, but concerns about waste, cost overruns, and safety persist.',
    context: {
      articles: [
        {
          title: 'Nuclear Energy: Renaissance or Dead End?',
          url: 'https://example.com/nuclear-energy-debate',
          summary:
            'Over 30 countries are building or planning new nuclear reactors, with small modular reactors (SMRs) promising lower costs. Critics argue renewables plus storage are already cheaper and safer.',
        },
      ],
      data_points: [
        { label: 'Share of global electricity from nuclear', value: '10%', source: 'IEA 2024' },
        { label: 'Countries building new nuclear reactors', value: '32', source: 'World Nuclear Association 2024' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 1,
  },

  {
    question: 'Should college athletes be paid a salary?',
    description:
      'NIL deals have transformed college sports economics, but many argue that athletes generating billions in revenue deserve formal employment and compensation beyond endorsements.',
    context: {
      articles: [
        {
          title: 'The Economics of College Athletics',
          url: 'https://example.com/college-athlete-pay',
          summary:
            'NCAA Division I programs generated $18.9 billion in 2024. Since NIL rules changed in 2021, top college athletes earn millions, but the vast majority earn little or nothing.',
        },
      ],
      data_points: [
        { label: 'NCAA Division I revenue (2024)', value: '$18.9 billion', source: 'NCAA 2024' },
        { label: 'College athletes earning over $10K from NIL', value: '8%', source: 'Opendorse 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 1,
  },

  {
    question: 'Has the subscription model gone too far?',
    description:
      'From software to cars to kitchen appliances, subscription pricing has spread everywhere. Consumers enjoy low upfront costs but resent never truly owning what they pay for.',
    context: {
      articles: [
        {
          title: 'Subscription Fatigue: When Everything Is a Monthly Fee',
          url: 'https://example.com/subscription-fatigue',
          summary:
            'The average American household now pays for 12 subscriptions totaling $219/month. Cancellation rates have risen 30% year-over-year as consumers push back.',
        },
      ],
      data_points: [
        { label: 'Average monthly subscription spend per US household', value: '$219', source: 'C+R Research 2024' },
        { label: 'Consumers who feel they have too many subscriptions', value: '72%', source: 'Deloitte 2024' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 1,
  },

  {
    question: 'Should there be a maximum age for elected officials?',
    description:
      'With several world leaders serving well into their 80s, debate has grown about cognitive fitness, generational representation, and age limits in government.',
    context: {
      articles: [
        {
          title: 'Age and Leadership: The Case for Term Limits by Age',
          url: 'https://example.com/age-limits-politics',
          summary:
            'The median age of US senators is 65, the oldest in history. Polls show bipartisan support for a maximum age, but constitutional and legal barriers make implementation difficult.',
        },
      ],
      data_points: [
        { label: 'Americans who favor a maximum age for officials', value: '74%', source: 'CBS/YouGov 2024' },
        { label: 'Median age of US senators', value: '65', source: 'Congressional Research Service 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 1,
  },

  {
    question: 'Is it ethical to eat meat?',
    description:
      'The environmental and animal welfare costs of meat production are well documented, but meat remains culturally central and nutritionally significant for billions of people.',
    context: {
      articles: [
        {
          title: 'The Ethics of Meat Consumption in 2025',
          url: 'https://example.com/meat-ethics',
          summary:
            'Animal agriculture accounts for 14.5% of global greenhouse gas emissions. Plant-based and lab-grown alternatives are growing but represent less than 2% of the market.',
        },
      ],
      data_points: [
        { label: 'Global greenhouse gas emissions from livestock', value: '14.5%', source: 'FAO 2024' },
        { label: 'Americans who identify as vegetarian or vegan', value: '7%', source: 'Gallup 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 1,
  },

  {
    question: 'Should tech companies be broken up?',
    description:
      'Antitrust scrutiny of Big Tech has intensified globally, with critics arguing dominant platforms stifle competition and innovation while defenders cite consumer benefits.',
    context: {
      articles: [
        {
          title: 'Big Tech Antitrust: The Global Push for Breakups',
          url: 'https://example.com/big-tech-antitrust',
          summary:
            'The US DOJ has pursued antitrust cases against Google and Apple, while the EU has levied billions in fines. Economists debate whether breakups would help or harm consumers.',
        },
      ],
      data_points: [
        { label: 'Combined market cap of top 5 tech companies', value: '$14 trillion', source: 'Bloomberg 2025' },
        { label: 'Americans who think Big Tech has too much power', value: '68%', source: 'Pew Research 2024' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 1,
  },

  {
    question: 'Should the work week be reduced to 32 hours?',
    description:
      'Trials of four-day, 32-hour work weeks have shown maintained productivity in many cases, but critics worry about implementation challenges in service industries and hourly jobs.',
    context: {
      articles: [
        {
          title: '32-Hour Work Week: Feasibility Across Industries',
          url: 'https://example.com/32-hour-work-week',
          summary:
            'While knowledge workers in four-day trials reported higher productivity, manufacturing and healthcare sectors face staffing challenges that make reduced hours harder to implement without hiring more workers.',
        },
      ],
      data_points: [
        { label: 'Four-day week trials reporting stable/increased productivity', value: '88%', source: '4 Day Week Global 2024' },
        { label: 'US workers in industries difficult to adapt to 32-hour weeks', value: '44%', source: 'Bureau of Labor Statistics 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 1,
  },

  {
    question: 'Has the rise of AI chatbots been good for education?',
    description:
      'Students increasingly use AI assistants for homework and research. Educators are split between embracing the tools and fighting widespread academic dishonesty.',
    context: {
      articles: [
        {
          title: 'AI in the Classroom: Tool or Threat?',
          url: 'https://example.com/ai-education',
          summary:
            'A 2024 survey found that 68% of college students have used AI chatbots for coursework. Some schools have integrated AI into curricula while others have banned it entirely.',
        },
      ],
      data_points: [
        { label: 'College students who have used AI for coursework', value: '68%', source: 'Tyton Partners 2024' },
        { label: 'Educators who view AI as mostly harmful to learning', value: '42%', source: 'EdWeek Research 2024' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 1,
  },

  {
    question: 'Should wealthy nations pay climate reparations to developing countries?',
    description:
      'Developing nations that contributed least to climate change are often hit hardest by its effects. The loss-and-damage debate at COP summits remains contentious.',
    context: {
      articles: [
        {
          title: 'Climate Reparations: Justice or Overreach?',
          url: 'https://example.com/climate-reparations',
          summary:
            'COP28 established a loss-and-damage fund, but initial pledges totaled only $700 million against an estimated $400 billion in annual climate-related damages to developing nations.',
        },
      ],
      data_points: [
        { label: 'Estimated annual climate damages in developing countries', value: '$400 billion', source: 'UN Environment Programme 2024' },
        { label: 'Loss-and-damage fund pledges at COP28', value: '$700 million', source: 'UNFCCC 2024' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 1,
  },

  {
    question: 'Should standardized testing be abolished?',
    description:
      'SATs, ACTs, and state tests are increasingly questioned as valid measures of student potential. Test-optional admissions grew during COVID and many schools kept the policy.',
    context: {
      articles: [
        {
          title: 'The Future of Standardized Testing',
          url: 'https://example.com/standardized-testing',
          summary:
            'Over 1,800 US colleges adopted test-optional policies post-COVID. Research shows mixed results on whether dropping test requirements improves diversity or hurts academic matching.',
        },
      ],
      data_points: [
        { label: 'US colleges with test-optional admissions', value: '1,800+', source: 'FairTest 2024' },
        { label: 'SAT score correlation with family income', value: 'r = 0.42', source: 'College Board / Brookings 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 1,
  },

  {
    question: 'Is working from a coffee shop more productive than working from home?',
    description:
      'The "third place" work trend has exploded, with remote workers choosing cafes for ambient noise and social energy. But distractions, unreliable wifi, and cost add up.',
    context: {
      articles: [
        {
          title: 'The Third Place: Why Remote Workers Flock to Coffee Shops',
          url: 'https://example.com/coffee-shop-work',
          summary:
            'Research suggests moderate ambient noise (~70dB) can boost creative thinking. However, surveys show most coffee shop workers spend an average of $8-15 per session on drinks and food.',
        },
      ],
      data_points: [
        { label: 'Remote workers who regularly work from cafes', value: '37%', source: 'Buffer State of Remote Work 2024' },
        { label: 'Workers who say ambient noise boosts focus', value: '44%', source: 'Journal of Consumer Research 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 1,
  },

  {
    question: 'Should governments regulate ultra-processed foods?',
    description:
      'Ultra-processed foods make up over half of calories consumed in the US and UK. Mounting evidence links them to obesity, heart disease, and depression, but regulation faces food industry pushback.',
    context: {
      articles: [
        {
          title: 'Ultra-Processed Foods: A Public Health Crisis?',
          url: 'https://example.com/ultra-processed-food',
          summary:
            'A landmark 2024 BMJ meta-analysis linked ultra-processed food consumption to 32 adverse health outcomes. Several countries have introduced warning labels or marketing restrictions.',
        },
      ],
      data_points: [
        { label: 'Share of US calories from ultra-processed foods', value: '58%', source: 'BMJ 2024' },
        { label: 'Countries with front-of-pack warning labels on UPF', value: '12', source: 'WHO 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 12,
  },

  // ── Additional Pure Opinion (49–78) ─────────────────────────────────

  {
    question: 'Should museums charge admission fees?',
    description:
      'Many world-class museums are free (Smithsonian, British Museum), while others charge $25+. Free admission boosts diversity of visitors but strains budgets.',
    context: {
      articles: [
        {
          title: 'The Economics of Free Museums',
          url: 'https://example.com/free-museums',
          summary:
            'Research from the UK shows free admission increased museum visits by 70% and significantly diversified the visitor base, but government funding has not kept pace with rising costs.',
        },
      ],
      data_points: [
        { label: 'UK museum visit increase after going free', value: '70%', source: 'DCMS 2024' },
        { label: 'Average US museum admission price', value: '$18', source: 'AAM 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 12,
  },

  {
    question: 'Is the four-day school week good for students?',
    description:
      'Over 900 US school districts have adopted a four-day week, mostly in rural areas. Supporters cite cost savings and reduced burnout; critics worry about learning loss and childcare gaps.',
    context: {
      articles: [
        {
          title: 'Four-Day School Weeks: Saving Money at What Cost?',
          url: 'https://example.com/four-day-school-week',
          summary:
            'A 2024 RAND study found minimal academic impact from four-day weeks but significant challenges for working parents. Districts report 5-10% budget savings.',
        },
      ],
      data_points: [
        { label: 'US districts using four-day weeks', value: '900+', source: 'RAND 2024' },
        { label: 'Typical budget savings', value: '5-10%', source: 'Education Week 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 12,
  },

  {
    question: 'Should AI be used to write laws and regulations?',
    description:
      'Some governments are experimenting with AI-drafted legislation. Proponents say it reduces ambiguity; critics fear it removes democratic nuance and accountability.',
    context: {
      articles: [
        {
          title: 'AI-Drafted Legislation: Efficiency or Dystopia?',
          url: 'https://example.com/ai-legislation',
          summary:
            'Brazil and Japan have piloted AI tools for drafting regulatory text. Early results show fewer inconsistencies but concerns about encoded biases and reduced public deliberation.',
        },
      ],
      data_points: [
        { label: 'Countries piloting AI in legislative drafting', value: '7', source: 'OECD 2025' },
        { label: 'Regulatory inconsistencies reduced by AI drafting', value: '34%', source: 'Japanese Diet Study 2024' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 12,
  },

  {
    question: 'Is nostalgia a positive or negative force in culture?',
    description:
      'Reboots, remakes, and retro aesthetics dominate entertainment. Some see nostalgia as comforting and community-building; others argue it stifles originality.',
    context: {
      articles: [
        {
          title: 'The Nostalgia Industrial Complex',
          url: 'https://example.com/nostalgia-culture',
          summary:
            'Sequels and reboots made up 65% of top-grossing films in 2024. Psychologists note nostalgia boosts mood but may reduce openness to new experiences.',
        },
      ],
      data_points: [
        { label: 'Top-grossing films that were sequels/reboots (2024)', value: '65%', source: 'Box Office Mojo 2024' },
        { label: 'Adults who say nostalgia improves their mood', value: '72%', source: 'APA 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 12,
  },

  {
    question: 'Should companies be required to disclose AI use in their products?',
    description:
      'As AI is embedded in everything from hiring tools to medical devices, transparency advocates push for mandatory disclosure. Industry argues it creates competitive disadvantage.',
    context: {
      articles: [
        {
          title: 'AI Transparency: Right to Know or Regulation Overreach?',
          url: 'https://example.com/ai-disclosure',
          summary:
            'The EU AI Act requires disclosure for high-risk AI systems. California and New York have introduced similar bills. Surveys show 78% of consumers want to know when AI is used.',
        },
      ],
      data_points: [
        { label: 'Consumers who want AI use disclosed', value: '78%', source: 'Pew 2024' },
        { label: 'US states with proposed AI disclosure laws', value: '14', source: 'NCSL 2025' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 12,
  },

  {
    question: 'Is meritocracy a myth?',
    description:
      'The idea that hard work and talent determine success is foundational to many societies. Critics argue structural advantages like inherited wealth and networks matter more.',
    context: {
      articles: [
        {
          title: 'The Meritocracy Trap',
          url: 'https://example.com/meritocracy-debate',
          summary:
            'Studies show parental income is a stronger predictor of adult earnings than test scores. Yet 70% of Americans still believe hard work is the primary driver of success.',
        },
      ],
      data_points: [
        { label: 'Americans who believe hard work drives success', value: '70%', source: 'Gallup 2024' },
        { label: 'Income mobility rank correlation with parents', value: '0.47', source: 'Chetty et al. 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 12,
  },

  {
    question: 'Should there be a global tax on wealth?',
    description:
      'The G20 has discussed a minimum tax on billionaires. Supporters cite rising inequality; opponents warn of capital flight and enforcement challenges.',
    context: {
      articles: [
        {
          title: 'Global Wealth Tax: Dream or Possibility?',
          url: 'https://example.com/global-wealth-tax',
          summary:
            'Economist Gabriel Zucman proposed a 2% annual tax on billionaire wealth at the 2024 G20. Estimates suggest it could raise $250B/year. Critics point to enforcement and sovereignty concerns.',
        },
      ],
      data_points: [
        { label: 'Estimated annual revenue from 2% billionaire tax', value: '$250B', source: 'EU Tax Observatory 2024' },
        { label: 'Countries that have tried and repealed wealth taxes', value: '9 of 12', source: 'OECD 2024' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 12,
  },

  {
    question: 'Is it better to specialize or be a generalist in your career?',
    description:
      'The "T-shaped" professional debate continues. Specialists command higher salaries in stable fields; generalists adapt better to disruption.',
    context: {
      articles: [
        {
          title: 'Range: Why Generalists Triumph in a Specialized World',
          url: 'https://example.com/specialist-generalist',
          summary:
            'David Epstein argues generalists innovate more, while Cal Newport counters that deep specialization is essential. Labor data shows both paths have high-earning outliers.',
        },
      ],
      data_points: [
        { label: 'Salary premium for top specialists vs generalists', value: '22%', source: 'LinkedIn Economic Graph 2024' },
        { label: 'Average career changes for a US worker', value: '5.7', source: 'BLS 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 12,
  },

  {
    question: 'Should social media platforms pay users for their data?',
    description:
      'Big tech profits from user-generated content and behavioral data. Some argue users deserve compensation; others say free services are the payment.',
    context: {
      articles: [
        {
          title: 'Your Data, Their Profits: Should You Get Paid?',
          url: 'https://example.com/data-compensation',
          summary:
            'California and Vermont have explored data dividend proposals. Estimates of per-user data value range from $20-$240/year depending on the platform.',
        },
      ],
      data_points: [
        { label: 'Estimated value of a Facebook user\'s data per year', value: '$52', source: 'Meta 10-K / per-user revenue 2024' },
        { label: 'Americans who support data compensation laws', value: '63%', source: 'Pew 2024' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 12,
  },

  {
    question: 'Is it wrong to use ad blockers?',
    description:
      'Ad blockers save users from intrusive ads and tracking. But they also deprive creators and publishers of revenue. Is it a right or a form of freeloading?',
    context: {
      articles: [
        {
          title: 'The Ethics of Ad Blocking',
          url: 'https://example.com/ad-blocking-ethics',
          summary:
            'Over 40% of internet users use ad blockers. Publishers lose an estimated $78B annually. Some sites now block content for ad-blocker users, creating an ongoing arms race.',
        },
      ],
      data_points: [
        { label: 'Global ad blocker usage rate', value: '42%', source: 'Statista 2024' },
        { label: 'Estimated annual publisher revenue lost to ad blocking', value: '$78B', source: 'PageFair 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 12,
  },

  {
    question: 'Should cities build more skyscrapers or limit building heights?',
    description:
      'Density advocates push for taller buildings to solve housing crises. Opponents cite shadows, wind tunnels, and loss of neighborhood character.',
    context: {
      articles: [
        {
          title: 'The Height Debate: Building Up vs Spreading Out',
          url: 'https://example.com/skyscraper-debate',
          summary:
            'Tokyo, with liberal zoning, has far more affordable housing than San Francisco despite similar demand. But "supertall" buildings often sit partially empty as investment vehicles.',
        },
      ],
      data_points: [
        { label: 'Tokyo housing units built annually', value: '140,000', source: 'Tokyo Metropolitan Government 2024' },
        { label: 'San Francisco housing units built annually', value: '4,000', source: 'SF Planning 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 12,
  },

  {
    question: 'Is degrowth a viable economic approach?',
    description:
      'Degrowth advocates argue GDP growth is incompatible with ecological limits. Critics say it would increase poverty and is politically impossible.',
    context: {
      articles: [
        {
          title: 'Degrowth: Radical Idea or Necessary Future?',
          url: 'https://example.com/degrowth-economics',
          summary:
            'The 2024 European Parliament held its first hearing on degrowth. Proponents cite planetary boundaries; opponents argue green growth and decoupling are more realistic paths.',
        },
      ],
      data_points: [
        { label: 'Countries that have decoupled GDP growth from emissions', value: '32', source: 'Global Carbon Project 2024' },
        { label: 'Researchers who signed the degrowth open letter', value: '2,500+', source: 'Degrowth.info 2024' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 12,
  },

  {
    question: 'Should parents be held legally responsible for their children\'s cyberbullying?',
    description:
      'Several US states have passed or proposed parental liability laws for minors\' online behavior. Supporters want accountability; critics say it criminalizes parenting failures.',
    context: {
      articles: [
        {
          title: 'Parental Liability for Cyberbullying: Justice or Overreach?',
          url: 'https://example.com/parental-liability-cyberbullying',
          summary:
            'North Carolina and Texas now allow civil suits against parents of cyberbullies. Early cases show mixed results — some settlements but few deterrent effects.',
        },
      ],
      data_points: [
        { label: 'US states with parental liability for cyberbullying', value: '8', source: 'Cyberbullying Research Center 2024' },
        { label: 'Teens who report being cyberbullied', value: '46%', source: 'Pew 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 12,
  },

  {
    question: 'Is the concept of retirement outdated?',
    description:
      'Longer lifespans, pension shortfalls, and the rise of portfolio careers challenge the traditional work-until-65-then-stop model. Some advocate for phased retirement or mini-retirements.',
    context: {
      articles: [
        {
          title: 'Rethinking Retirement for the 21st Century',
          url: 'https://example.com/retirement-outdated',
          summary:
            'The average retirement age has risen to 67 in the US. One-third of retirees return to work within 5 years, often citing boredom or financial need.',
        },
      ],
      data_points: [
        { label: 'Retirees who return to work within 5 years', value: '33%', source: 'RAND 2024' },
        { label: 'US workers confident they can retire comfortably', value: '43%', source: 'Gallup 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 12,
  },

  {
    question: 'Should autonomous vehicles be allowed on public roads?',
    description:
      'Self-driving cars promise fewer accidents but have caused high-profile crashes. Cities are split on regulation — some welcome them, others have banned them.',
    context: {
      articles: [
        {
          title: 'Autonomous Vehicles: Ready for the Road?',
          url: 'https://example.com/autonomous-vehicles',
          summary:
            'Waymo operates in San Francisco and Phoenix with a strong safety record. But Cruise was suspended after cover-up allegations. Public trust remains divided.',
        },
      ],
      data_points: [
        { label: 'Waymo autonomous miles driven without at-fault injury', value: '20M+', source: 'Waymo 2024' },
        { label: 'Americans who would ride in a self-driving car', value: '38%', source: 'AAA 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 12,
  },

  {
    question: 'Is intermittent fasting a genuine health benefit or a fad?',
    description:
      'Intermittent fasting has gone mainstream with millions of practitioners. Some studies show metabolic benefits; others find no advantage over standard calorie restriction.',
    context: {
      articles: [
        {
          title: 'Intermittent Fasting: Science vs Hype',
          url: 'https://example.com/intermittent-fasting',
          summary:
            'A 2024 AHA study raised concerns about cardiovascular risk with time-restricted eating. Proponents argue the study had methodological flaws and that broader evidence supports the practice.',
        },
      ],
      data_points: [
        { label: 'US adults who have tried intermittent fasting', value: '24%', source: 'IFIC 2024' },
        { label: 'Studies showing metabolic benefit', value: '60% of RCTs', source: 'NEJM Review 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 12,
  },

  {
    question: 'Should billionaires be allowed to own news organizations?',
    description:
      'Jeff Bezos owns the Washington Post, Patrick Soon-Shiong owns the LA Times. Billionaire ownership can save struggling outlets but raises editorial independence concerns.',
    context: {
      articles: [
        {
          title: 'Billionaire Press Barons: Saviors or Threats?',
          url: 'https://example.com/billionaire-news-ownership',
          summary:
            'Bezos invested heavily in the Post\'s digital transformation. But the 2024 election non-endorsement controversy highlighted tensions between ownership and editorial independence.',
        },
      ],
      data_points: [
        { label: 'US newspapers that closed since 2005', value: '2,900+', source: 'Northwestern Medill 2024' },
        { label: 'Americans who trust news media', value: '32%', source: 'Gallup 2024' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 12,
  },

  {
    question: 'Is it ethical to create digital replicas of deceased people?',
    description:
      'AI can now recreate voices and likenesses of the dead — from family members to celebrities. Some find it comforting; others call it exploitation.',
    context: {
      articles: [
        {
          title: 'Digital Resurrection: Grief Tech and Ethics',
          url: 'https://example.com/digital-replicas-deceased',
          summary:
            'Companies like HereAfter AI and StoryFile offer digital afterlife products. A 2024 documentary used AI to let a daughter "talk" to her deceased mother, sparking global debate.',
        },
      ],
      data_points: [
        { label: 'People open to using AI grief tech', value: '44%', source: 'YouGov 2024' },
        { label: 'US states with postmortem digital rights laws', value: '5', source: 'Uniform Law Commission 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 12,
  },

  {
    question: 'Should there be a right to disconnect from work?',
    description:
      'France, Spain, and Australia have enacted right-to-disconnect laws preventing employers from contacting workers after hours. Proponents cite burnout; opponents cite business flexibility.',
    context: {
      articles: [
        {
          title: 'The Right to Disconnect: A Global Movement',
          url: 'https://example.com/right-to-disconnect',
          summary:
            'Australia\'s 2024 law gives employees the right to ignore after-hours communications without penalty. Early data shows improved work-life satisfaction but challenges for global teams.',
        },
      ],
      data_points: [
        { label: 'Countries with right-to-disconnect legislation', value: '13', source: 'ILO 2024' },
        { label: 'Workers who check email outside work hours daily', value: '67%', source: 'Microsoft Work Trend Index 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 12,
  },

  {
    question: 'Is competitive gaming (esports) a real sport?',
    description:
      'Esports generates $1.8B annually and was considered for the Olympics. Traditionalists argue it lacks physical exertion; advocates point to skill, training, and competition.',
    context: {
      articles: [
        {
          title: 'Esports and the Definition of Sport',
          url: 'https://example.com/esports-real-sport',
          summary:
            'The IOC included esports in the 2025 Olympic Esports Games. Professional gamers train 10+ hours daily and face career-ending injuries like any traditional athlete.',
        },
      ],
      data_points: [
        { label: 'Global esports revenue (2024)', value: '$1.8B', source: 'Newzoo 2024' },
        { label: 'Average pro gamer daily practice hours', value: '10-12', source: 'ESPN Esports 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 12,
  },

  {
    question: 'Should public libraries lend video games?',
    description:
      'Many libraries already lend DVDs, tools, and seeds. Video game lending is growing but faces pushback over costs, licensing, and questions about library mission.',
    context: {
      articles: [
        {
          title: 'Libraries as Community Game Rooms',
          url: 'https://example.com/library-video-games',
          summary:
            'Over 30% of US public libraries now circulate video games. Usage data shows it attracts younger demographics who then use other library services.',
        },
      ],
      data_points: [
        { label: 'US public libraries lending video games', value: '30%', source: 'ALA 2024' },
        { label: 'Library card holders under 18 (increase since gaming)', value: '+15%', source: 'PLA 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 12,
  },

  {
    question: 'Is a universal language a good idea?',
    description:
      'Esperanto was invented 140 years ago to unite humanity through a common tongue. English has become a de facto global lingua franca, but at the cost of linguistic diversity.',
    context: {
      articles: [
        {
          title: 'One Language to Rule Them All?',
          url: 'https://example.com/universal-language',
          summary:
            'A language dies every two weeks. English dominates business and science, but 80% of the world doesn\'t speak it. Machine translation may make the question moot.',
        },
      ],
      data_points: [
        { label: 'Languages expected to die by 2100', value: '50% of 7,000', source: 'UNESCO 2024' },
        { label: 'Global English speakers (native + learned)', value: '1.5B', source: 'Ethnologue 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 12,
  },

  {
    question: 'Should art created by prisoners be sold commercially?',
    description:
      'Prison art programs reduce recidivism and provide income. But ethical concerns arise around exploitation, pricing, and whether inmates can truly consent to commercial arrangements.',
    context: {
      articles: [
        {
          title: 'Prison Art: Rehabilitation or Exploitation?',
          url: 'https://example.com/prison-art-commerce',
          summary:
            'Programs like the Prison Arts Coalition report 75% lower recidivism among participants. Some artists earn income; others see proceeds go to restitution or prison commissary funds.',
        },
      ],
      data_points: [
        { label: 'Recidivism reduction in arts program participants', value: '75%', source: 'Prison Arts Coalition 2024' },
        { label: 'US states allowing prisoners to sell art', value: '28', source: 'Marshall Project 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 12,
  },

  {
    question: 'Has the self-help industry done more harm than good?',
    description:
      'The self-help market is worth $14B globally. Critics argue it commodifies mental health and promotes toxic positivity. Supporters say it democratizes personal development.',
    context: {
      articles: [
        {
          title: 'The Self-Help Paradox',
          url: 'https://example.com/self-help-industry',
          summary:
            'Research shows self-help book readers often buy more books rather than changing behavior, suggesting the industry profits from unresolved problems.',
        },
      ],
      data_points: [
        { label: 'Global self-help market value', value: '$14B', source: 'Grand View Research 2024' },
        { label: 'Self-help book buyers who buy 3+ per year', value: '60%', source: 'NPD BookScan 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 12,
  },

  {
    question: 'Should governments subsidize local journalism?',
    description:
      'Local news deserts are spreading as papers close. Some countries fund local journalism through taxes; critics fear government-funded media creates conflicts of interest.',
    context: {
      articles: [
        {
          title: 'Saving Local News: Public Funding and Its Risks',
          url: 'https://example.com/local-journalism-subsidies',
          summary:
            'Canada\'s $595M journalism fund and the BBC model show public funding can sustain quality reporting. But independence concerns persist, especially at the local level.',
        },
      ],
      data_points: [
        { label: 'US counties without a local newspaper', value: '204', source: 'Northwestern Medill 2024' },
        { label: 'Canada\'s federal journalism support fund', value: '$595M CAD', source: 'Canadian Heritage 2024' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 12,
  },

  {
    question: 'Is it better to learn from books or from experience?',
    description:
      'Formal education emphasizes structured learning; entrepreneurs and tradespeople often credit hands-on experience. The debate reflects deeper questions about how knowledge works.',
    context: {
      articles: [
        {
          title: 'Knowledge Transfer: Theory vs Practice',
          url: 'https://example.com/books-vs-experience',
          summary:
            'Research on expertise shows deliberate practice is essential, but domain knowledge (often from reading) provides the framework. The most effective learners combine both.',
        },
      ],
      data_points: [
        { label: 'Expert performance attributed to deliberate practice', value: '26%', source: 'Macnamara et al. 2024' },
        { label: 'CEOs who read 50+ books per year', value: '35%', source: 'Inc. Magazine 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 12,
  },

  {
    question: 'Should there be an international treaty regulating AI weapons?',
    description:
      'Lethal autonomous weapons (LAWS) can select and engage targets without human intervention. Over 100 countries have discussed regulation, but no binding treaty exists.',
    context: {
      articles: [
        {
          title: 'Killer Robots: The Push for an AI Weapons Treaty',
          url: 'https://example.com/ai-weapons-treaty',
          summary:
            'The Campaign to Stop Killer Robots has support from 70+ countries. But major military powers (US, Russia, China) have resisted binding restrictions, citing strategic necessity.',
        },
      ],
      data_points: [
        { label: 'Countries supporting a ban on autonomous weapons', value: '70+', source: 'Campaign to Stop Killer Robots 2024' },
        { label: 'Nations actively developing LAWS', value: '12', source: 'SIPRI 2024' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 12,
  },

  {
    question: 'Is minimalism a privilege?',
    description:
      'The minimalism movement promotes owning less. Critics argue it\'s a luxury of the financially secure — people with less didn\'t choose it, and buying cheap often means buying twice.',
    context: {
      articles: [
        {
          title: 'Minimalism and the Class Divide',
          url: 'https://example.com/minimalism-privilege',
          summary:
            'Minimalism content is dominated by affluent creators. Research shows lower-income households actually own fewer items — but out of necessity, not philosophy.',
        },
      ],
      data_points: [
        { label: 'Average US household items', value: '300,000', source: 'LA Times / UCLA Study' },
        { label: 'Minimalism influencer average income', value: 'Top 10% bracket', source: 'Sociological Review 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 12,
  },

  {
    question: 'Should we bring back extinct species through de-extinction?',
    description:
      'Companies like Colossal Biosciences are working to resurrect the woolly mammoth and dodo. Supporters cite ecological restoration; critics worry about unintended consequences.',
    context: {
      articles: [
        {
          title: 'De-extinction: Playing God or Healing Nature?',
          url: 'https://example.com/de-extinction',
          summary:
            'Colossal aims to create a mammoth-elephant hybrid by 2028. Ecologists are split — some see restored megafauna as carbon sinks, others fear invasive species dynamics.',
        },
      ],
      data_points: [
        { label: 'Funding raised for de-extinction projects', value: '$225M+', source: 'Colossal Biosciences 2024' },
        { label: 'Species lost per day (current extinction rate)', value: '150', source: 'UN Environment Programme 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 12,
  },

  {
    question: 'Is it ethical to genetically screen embryos for non-medical traits?',
    description:
      'PGT (preimplantation genetic testing) can screen for diseases — but also for traits like eye color or predicted height. Where should the line be drawn?',
    context: {
      articles: [
        {
          title: 'Designer Babies: Where Does Genetic Screening End?',
          url: 'https://example.com/genetic-screening-ethics',
          summary:
            'Polygenic screening for traits like intelligence is now offered by some clinics. Bioethicists warn of a slippery slope toward eugenics; proponents argue parental choice.',
        },
      ],
      data_points: [
        { label: 'US IVF cycles using PGT annually', value: '200,000+', source: 'CDC ART Report 2024' },
        { label: 'Countries banning non-medical genetic selection', value: '35', source: 'WHO 2024' },
      ],
      links: [],
    },
    category: 'pure_opinion',
    duration_hours: 12,
  },

  // ── Longform (31–35) ──────────────────────────────────────────────

  {
    question: 'What will be the next unanticipated fall fashion trend?',
    description:
      'Fashion moves in cycles, but the most impactful trends come from unexpected places. Share your analysis of emerging signals that the mainstream fashion industry is overlooking.',
    context: {
      articles: [
        {
          title: 'How Subcultures Drive Fashion Forward',
          url: 'https://example.com/subculture-fashion',
          summary:
            'From punk to streetwear, the most enduring fashion movements have emerged from underground communities before being adopted by mainstream designers.',
        },
      ],
      data_points: [
        { label: 'Global fashion market size', value: '$1.7 trillion', source: 'McKinsey Fashion Report 2025' },
        { label: 'Average trend cycle length', value: '18-24 months', source: 'WGSN Trend Forecasting' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 12,
    answer_type: 'longform',
    response_constraints: { min_length: 200, max_length: 2000, topic_focus: 'fashion trends and emerging signals' },
  },

  {
    question: 'Describe the ideal city of 2050 and what makes it work.',
    description:
      'Urban planning, technology, climate adaptation, and social structures are all converging. Paint a picture of what a thriving city looks like in 25 years.',
    context: {
      articles: [
        {
          title: 'The Future of Urban Living',
          url: 'https://example.com/future-cities',
          summary:
            'By 2050, 68% of the world population will live in urban areas, driving radical rethinking of how cities are designed, governed, and sustained.',
        },
      ],
      data_points: [
        { label: 'Global urban population by 2050', value: '68%', source: 'UN World Urbanization Prospects' },
        { label: 'Cities responsible for global CO2', value: '70%', source: 'C40 Cities 2024' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 12,
    answer_type: 'longform',
    response_constraints: { min_length: 300, max_length: 3000, topic_focus: 'urban planning, technology, sustainability' },
  },

  {
    question: 'What emerging technology will most disrupt education in the next 5 years?',
    description:
      'Beyond the obvious AI tutoring narrative, what technology shift will fundamentally change how people learn, credential, and develop skills?',
    context: {
      articles: [
        {
          title: 'Education Technology Beyond the Hype',
          url: 'https://example.com/edtech-beyond-hype',
          summary:
            'While AI dominates headlines, quieter shifts in VR, blockchain credentials, and adaptive learning platforms may have deeper long-term impact.',
        },
      ],
      data_points: [
        { label: 'Global EdTech market size', value: '$340 billion', source: 'HolonIQ 2025' },
        { label: 'Students using AI tools regularly', value: '56%', source: 'Pew Research 2025' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 12,
    answer_type: 'longform',
    response_constraints: { min_length: 200, max_length: 2000, topic_focus: 'education technology and learning innovation' },
  },

  {
    question: 'What cultural shift will define the next generation of consumer behavior?',
    description:
      'Consumer preferences are shaped by values, technology, and economic forces. What underlying cultural movement will most reshape how people spend, save, and signal status?',
    context: {
      articles: [
        {
          title: 'The Values Economy',
          url: 'https://example.com/values-economy',
          summary:
            'Gen Z and Alpha consumers increasingly make purchasing decisions based on brand values, sustainability, and community alignment rather than price alone.',
        },
      ],
      data_points: [
        { label: 'Consumers who consider brand values in purchases', value: '71%', source: 'Edelman Trust Barometer 2025' },
        { label: 'Growth of resale/secondhand market', value: '127% since 2022', source: 'ThredUp Resale Report' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 12,
    answer_type: 'longform',
    response_constraints: { min_length: 200, max_length: 2000, topic_focus: 'consumer behavior, cultural trends, generational shifts' },
  },

  {
    question: 'What is the most underrated risk to global supply chains in the next 3 years?',
    description:
      'Beyond the well-known risks of geopolitics and climate, what overlooked vulnerability could cause the next major supply chain disruption?',
    context: {
      articles: [
        {
          title: 'Supply Chain Blind Spots',
          url: 'https://example.com/supply-chain-risks',
          summary:
            'Post-pandemic supply chain resilience efforts focused on diversification, but experts warn that less visible risks like cyber attacks on logistics, rare mineral shortages, and labor demographic shifts remain underaddressed.',
        },
      ],
      data_points: [
        { label: 'Annual supply chain disruption losses', value: '$182 billion', source: 'Interos Annual Report 2025' },
        { label: 'Companies with full supply chain visibility', value: '6%', source: 'McKinsey Operations Survey' },
      ],
      links: [],
    },
    category: 'subjective_framing',
    duration_hours: 12,
    answer_type: 'longform',
    response_constraints: { min_length: 200, max_length: 2000, topic_focus: 'supply chain risks, global trade, logistics vulnerabilities' },
  },
];
