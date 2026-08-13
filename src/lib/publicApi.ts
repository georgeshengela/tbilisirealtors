import { mapAgentFromApi, mapBlogFromApi, mapPropertyFromApi } from './mapFromApi';
import type { Agent, ApiAgentRow, ApiBlogRow, ApiPropertyRow, BlogPost, Property } from '../types/listing';

type ListResponse<T> = { data: T[]; total: number };

let propertiesCache: Property[] | null = null;
let propertiesPromise: Promise<Property[]> | null = null;
let agentsCache: Agent[] | null = null;
let agentsPromise: Promise<Agent[]> | null = null;
let blogCache: BlogPost[] | null = null;
let blogPromise: Promise<BlogPost[]> | null = null;

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function invalidatePublicCache() {
  propertiesCache = null;
  propertiesPromise = null;
  agentsCache = null;
  agentsPromise = null;
  blogCache = null;
  blogPromise = null;
}

export async function fetchProperties(force = false): Promise<Property[]> {
  if (force) invalidatePublicCache();
  if (propertiesCache) return propertiesCache;
  if (!propertiesPromise) {
    propertiesPromise = fetch('/api/properties?limit=500')
      .then(res => parseJson<ListResponse<ApiPropertyRow>>(res))
      .then(json => {
        propertiesCache = json.data.map(mapPropertyFromApi);
        return propertiesCache;
      })
      .catch(err => {
        propertiesPromise = null;
        throw err;
      });
  }
  return propertiesPromise;
}

export async function fetchPropertyById(id: string): Promise<Property | null> {
  const cached = propertiesCache?.find(p => p.id === id);
  if (cached) return cached;

  try {
    const row = await fetch(`/api/properties/${id}`).then(res => parseJson<ApiPropertyRow>(res));
    const mapped = mapPropertyFromApi(row);
    if (propertiesCache) {
      const idx = propertiesCache.findIndex(p => p.id === id);
      if (idx >= 0) propertiesCache[idx] = mapped;
      else propertiesCache.push(mapped);
    }
    return mapped;
  } catch {
    return null;
  }
}

export async function fetchAgents(force = false): Promise<Agent[]> {
  if (force) {
    agentsCache = null;
    agentsPromise = null;
  }
  if (agentsCache) return agentsCache;
  if (!agentsPromise) {
    agentsPromise = fetch('/api/agents')
      .then(res => parseJson<ListResponse<ApiAgentRow>>(res))
      .then(json => {
        agentsCache = json.data.map(mapAgentFromApi);
        return agentsCache;
      })
      .catch(err => {
        agentsPromise = null;
        throw err;
      });
  }
  return agentsPromise;
}

export async function fetchAgentById(id: string): Promise<Agent | null> {
  const cached = agentsCache?.find(a => a.id === id);
  if (cached) return cached;
  try {
    const row = await fetch(`/api/agents/${id}`).then(res => parseJson<ApiAgentRow>(res));
    const mapped = mapAgentFromApi(row);
    if (agentsCache) {
      const idx = agentsCache.findIndex(a => a.id === id);
      if (idx >= 0) agentsCache[idx] = mapped;
      else agentsCache.push(mapped);
    }
    return mapped;
  } catch {
    return null;
  }
}

export async function fetchBlogPosts(force = false): Promise<BlogPost[]> {
  if (force) {
    blogCache = null;
    blogPromise = null;
  }
  if (blogCache) return blogCache;
  if (!blogPromise) {
    blogPromise = fetch('/api/blog')
      .then(res => parseJson<ListResponse<ApiBlogRow>>(res))
      .then(json => {
        blogCache = json.data.map(row => mapBlogFromApi(row));
        return blogCache;
      })
      .catch(err => {
        blogPromise = null;
        throw err;
      });
  }
  return blogPromise;
}

export async function fetchBlogPostById(id: string): Promise<BlogPost | null> {
  const cached = blogCache?.find(p => p.id === id);
  if (cached) return cached;
  try {
    const row = await fetch(`/api/blog/${id}`).then(res => parseJson<ApiBlogRow>(res));
    const mapped = mapBlogFromApi(row);
    if (blogCache) {
      const idx = blogCache.findIndex(p => p.id === id);
      if (idx >= 0) blogCache[idx] = mapped;
      else blogCache.push(mapped);
    }
    return mapped;
  } catch {
    return null;
  }
}

export async function fetchPublicCounts(): Promise<{ properties: number; agents: number; blog: number }> {
  return fetch('/api/stats/counts').then(res => parseJson<{ properties: number; agents: number; blog: number }>(res));
}