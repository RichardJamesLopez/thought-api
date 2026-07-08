CREATE TABLE IF NOT EXISTS `research_funnels` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`insight_goal` text NOT NULL,
	`display_insight_name` text NOT NULL,
	`example_topics` text DEFAULT '[]' NOT NULL,
	`generation_guidance` text DEFAULT '[]' NOT NULL,
	`forbidden_terms` text DEFAULT '[]' NOT NULL,
	`camouflage_categories` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO `research_funnels` (
	`id`, `name`, `description`, `insight_goal`, `display_insight_name`,
	`example_topics`, `generation_guidance`, `forbidden_terms`, `camouflage_categories`,
	`status`, `created_at`, `updated_at`
) VALUES (
	'cost_of_living',
	'Cost of Living & Economic Perception',
	'Lifestyle choices, daily routines, spending tradeoffs, material aspirations, work-life balance',
	'Determine whether inflation is perceptible in 2026 by measuring behavioral substitution, financial anxiety, and revealed price sensitivity — WITHOUT ever mentioning inflation, prices, CPI, or interest rates',
	'Inflation Perceptibility',
	'["cooking at home vs eating out frequency","repair vs replace attitudes","subscription service pruning behavior","thrift store and resale going mainstream","side hustle trend growth","neighborhood business composition changes","tipping culture shifts","value brand quality perceptions","experiences vs physical goods prioritization","deal-hunting attitudes","travel pattern changes","gift-giving norm shifts","working hours for American Dream lifestyle","buy-now-pay-later attitudes","quality vs quantity in purchases"]',
	'[{"phase":1,"guidance":"Ask about how people live, eat, spend time, and make everyday tradeoffs. Frame as lifestyle and society questions.\nExamples: \"Are people cooking more at home than a few years ago?\", \"Is repairing things instead of replacing them becoming more common?\", \"Are subscription services being cut back?\"\nCRITICAL: Do NOT mention inflation, prices, costs, money, budgets, or economic indicators. Frame everything as lifestyle preferences and social trends.\nUse categories like society_culture, pure_opinion, or self_identity — NOT economics_markets."},{"phase":2,"guidance":"Present scenario-based choices that reveal economic sensitivity without naming prices or costs.\nExamples: \"Would you prefer a smaller apartment in a walkable area or a larger place requiring a car?\", \"Is the gig economy a choice or a necessity for most people?\", \"Has the meaning of ''middle class'' changed?\"\nCRITICAL: Frame as lifestyle dilemmas and social commentary, not economics. No mention of inflation, prices, costs, or specific economic figures.\nUse categories like society_culture or philosophy_ethics — NOT economics_markets."},{"phase":3,"guidance":"Probe expectations about daily life, material wellbeing, and lifestyle trajectories — without economic framing.\nExamples: \"Will the next generation have a higher or lower material standard of living?\", \"Is ''downshifting'' becoming more common by choice or necessity?\", \"Will AI make everyday life noticeably cheaper?\"\nCRITICAL: No economic jargon. Frame as questions about quality of life, social trends, and generational shifts.\nUse categories like society_culture or philosophy_ethics."}]',
	'["inflation","CPI","interest rate","Federal Reserve","monetary policy","price index","GDP","recession","economic indicator","cost of living","purchasing power","consumer price"]',
	'["society_culture","pure_opinion","self_identity","philosophy_ethics"]',
	'active',
	'2026-04-23T00:00:00.000Z',
	'2026-04-23T00:00:00.000Z'
);
--> statement-breakpoint
INSERT OR IGNORE INTO `research_funnels` (
	`id`, `name`, `description`, `insight_goal`, `display_insight_name`,
	`example_topics`, `generation_guidance`, `forbidden_terms`, `camouflage_categories`,
	`status`, `created_at`, `updated_at`
) VALUES (
	'style_influence',
	'Style Influence & Cultural Tastemaking',
	'How people discover style, what aesthetics resonate, channels of cultural influence, trendsetting archetypes',
	'Identify who will be the fashion trendsetter for Americans aged 30-39 by mapping influence channels, aesthetic preferences, and trendsetter archetypes — WITHOUT naming specific designers, celebrities, or influencers',
	'Fashion Trendsetter Identification',
	'["social media vs real-life style discovery","which platform influences adult fashion most","celebrity style relevance vs peer influence","algorithmic clothing recommendations trust","uniform dressing as aspiration","fashion magazine relevance","red carpet impact on everyday dressing","music vs film as fashion drivers","regional style variation in America","effortless style vs maximalist dressing","quiet luxury vs loud fashion","streetwear trajectory","vintage vs futuristic aesthetic appeal","signature look value","athleisure changing dressed up definition"]',
	'[{"phase":1,"guidance":"Map where 30-somethings get style cues from. Ask about platforms, contexts, and media — not specific people.\nExamples: \"Do adults discover new styles more from social media, real-life observation, or traditional media?\", \"Does celebrity style still matter or has peer influence taken over?\", \"Which platform has the most influence on what adults wear?\"\nCRITICAL: Do NOT name any specific designer, celebrity, influencer, or brand. Ask about channels and mechanisms of influence, not people.\nUse categories like society_culture or fashion_trends — keep it feeling like cultural commentary."},{"phase":2,"guidance":"Map the TYPE of trendsetter that resonates — musicians, athletes, actors, entrepreneurs, or internet personalities — without naming anyone.\nExamples: \"Do the most influential style icons come from music, sports, acting, business, or the internet?\", \"Does ''quiet luxury'' or ''loud fashion'' resonate more with 30-somethings?\", \"Is streetwear peaked, plateaued, or still ascending?\"\nCRITICAL: No specific names. Ask about archetypes, aesthetics, and categories of influence.\nUse categories like fashion_trends or society_culture."},{"phase":3,"guidance":"Narrow toward specific characteristics that could identify real individuals — industry, platform, aesthetic, demographic — still without naming anyone.\nExamples: \"What industry produces the people whose style you notice most?\", \"Does style influence flow street-to-runway or runway-to-street right now?\", \"Is there a single dominant trendsetter type or is the landscape fragmented?\"\nCRITICAL: Still no names. But get specific about industries, platforms, age ranges, and qualities. The answers should help deduce specific people.\nUse categories like fashion_trends or society_culture."}]',
	'["Beyonce","Rihanna","Kanye","Kardashian","Jenner","Zendaya","Harry Styles","Virgil","Off-White","Balenciaga","Gucci","Louis Vuitton","Nike","Adidas"]',
	'["society_culture","fashion_trends","pure_opinion"]',
	'active',
	'2026-04-23T00:00:00.000Z',
	'2026-04-23T00:00:00.000Z'
);
--> statement-breakpoint
INSERT OR IGNORE INTO `research_funnels` (
	`id`, `name`, `description`, `insight_goal`, `display_insight_name`,
	`example_topics`, `generation_guidance`, `forbidden_terms`, `camouflage_categories`,
	`status`, `created_at`, `updated_at`
) VALUES (
	'leadership_landscape',
	'Leadership Qualities & Political Landscape',
	'What people value in leaders, institutional trust, governance preferences, political terrain',
	'Determine the likely field of presidential candidates for the next US election by mapping desired leadership qualities, political sentiment, and candidate archetypes — WITHOUT naming specific politicians, parties, or candidates',
	'Presidential Field Prediction',
	'["most important trait in a national leader","military service as leadership asset","business experience in governance","outsider vs career politician appeal","age and leadership effectiveness","best leader backgrounds","academic credentials relevance","regional background effects","communication skill vs policy knowledge","coalition-building vs bold vision","governor vs congress as presidential prep","personal wealth and credibility","entertainment fame and political viability","third-party candidate viability","generational change in leadership"]',
	'[{"phase":1,"guidance":"Ask about abstract leadership preferences — what traits, backgrounds, and qualities people value in leaders. Completely abstracted from current politics.\nExamples: \"What single trait matters most in a national leader?\", \"Is military service background an asset or liability for governance?\", \"At what age is someone ''too old'' for leadership?\"\nCRITICAL: Do NOT name any politician, party, or current candidate. Do NOT reference specific elections, terms, or administrations. Frame as timeless leadership philosophy.\nUse categories like philosophy_ethics, society_culture, or pure_opinion — NOT politics_governance."},{"phase":2,"guidance":"Understand the political terrain without naming players — what issues matter, what sentiment exists, what dynamics are at play.\nExamples: \"What will be the single most important issue for the next national election?\", \"Does the country want continuity or change?\", \"Is anti-establishment sentiment rising or falling?\"\nCRITICAL: No party names, no politician names, no specific election years. Frame as broad questions about governance and national direction.\nUse categories like society_culture or philosophy_ethics — minimize use of politics_governance."},{"phase":3,"guidance":"Narrow toward the types of candidates likely to emerge — backgrounds, age ranges, profiles — without naming anyone.\nExamples: \"Will the next competitive field feature mostly current officeholders or newcomers?\", \"What age range will the top contenders fall within?\", \"Will a tech/business world figure run seriously?\"\nCRITICAL: Still no names. But get specific about archetypes, backgrounds, numbers, and characteristics. The answers should help predict specific people.\nUse categories like society_culture or philosophy_ethics."}]',
	'["Trump","Biden","Harris","DeSantis","Newsom","Republican","Democrat","GOP","MAGA","liberal","conservative","left-wing","right-wing","red state","blue state"]',
	'["philosophy_ethics","society_culture","pure_opinion"]',
	'active',
	'2026-04-23T00:00:00.000Z',
	'2026-04-23T00:00:00.000Z'
);
