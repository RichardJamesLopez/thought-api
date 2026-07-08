import { randomUUID } from 'crypto';
import type { MarketContext } from '../types.js';

export interface NormalizedContextArticle {
  id: string;
  title?: string;
  url?: string;
  summary?: string;
}

export interface NormalizedContextDataPoint {
  id: string;
  label?: string;
  value?: string;
  source?: string;
}

export interface NormalizedContextLink {
  id: string;
  url: string;
}

export interface NormalizedMarketContext {
  articles: NormalizedContextArticle[];
  data_points: NormalizedContextDataPoint[];
  links: NormalizedContextLink[];
}

export const EMPTY_MARKET_CONTEXT: MarketContext = {
  articles: [],
  data_points: [],
  links: [],
};

function normalizeContext(context: MarketContext | null | undefined, assignIds: boolean): NormalizedMarketContext {
  const articles = Array.isArray(context?.articles) ? context?.articles : [];
  const dataPoints = Array.isArray(context?.data_points) ? context?.data_points : [];
  const links = Array.isArray(context?.links) ? context?.links : [];

  const normalizedArticles = articles.map((a, idx) => ({
    id: a.id && String(a.id).trim().length > 0 ? String(a.id) : assignIds ? randomUUID() : `article:${idx}`,
    title: a.title,
    url: a.url,
    summary: a.summary,
  }));

  const normalizedDataPoints = dataPoints.map((d, idx) => ({
    id: d.id && String(d.id).trim().length > 0 ? String(d.id) : assignIds ? randomUUID() : `data_point:${idx}`,
    label: d.label,
    value: d.value,
    source: d.source,
  }));

  const normalizedLinks = links.map((link, idx) => {
    if (typeof link === 'string') {
      return {
        id: assignIds ? randomUUID() : `link:${idx}`,
        url: link,
      };
    }
    const url = typeof (link as any)?.url === 'string' ? (link as any).url : '';
    const id = typeof (link as any)?.id === 'string' && (link as any).id.trim().length > 0
      ? (link as any).id
      : assignIds ? randomUUID() : `link:${idx}`;
    return { id, url };
  });

  return {
    articles: normalizedArticles,
    data_points: normalizedDataPoints,
    links: normalizedLinks,
  };
}

export function normalizeContextForStorage(context: MarketContext | null | undefined): NormalizedMarketContext {
  return normalizeContext(context, true);
}

export function normalizeContextForResponse(context: MarketContext | null | undefined): NormalizedMarketContext {
  return normalizeContext(context, false);
}

export function collectContextIds(context: NormalizedMarketContext): {
  articleIds: Set<string>;
  dataPointIds: Set<string>;
  linkIds: Set<string>;
} {
  return {
    articleIds: new Set(context.articles.map(a => a.id)),
    dataPointIds: new Set(context.data_points.map(d => d.id)),
    linkIds: new Set(context.links.map(l => l.id)),
  };
}
