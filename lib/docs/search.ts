const LLMS_TXT_URL = 'https://respan.docs.buildwithfern.com/llms.txt';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface DocEntry {
  title: string;
  url: string;
  description: string;
}

let cachedEntries: DocEntry[] | null = null;
let cacheTimestamp = 0;

/**
 * Fetch and parse llms.txt into structured doc entries.
 */
export async function fetchDocEntries(): Promise<DocEntry[]> {
  if (cachedEntries && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedEntries;
  }

  const response = await fetch(LLMS_TXT_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch llms.txt: ${response.status}`);
  }

  const text = await response.text();
  const entries: DocEntry[] = [];

  // Parse lines like: - [Title](url): Description
  // or: - [Title](url)
  const lineRegex = /^- \[([^\]]+)\]\(([^)]+)\)(?::\s*(.*))?$/;

  for (const line of text.split('\n')) {
    const match = line.trim().match(lineRegex);
    if (match) {
      entries.push({
        title: match[1],
        url: match[2],
        description: match[3]?.trim() || '',
      });
    }
  }

  cachedEntries = entries;
  cacheTimestamp = Date.now();
  return entries;
}

/**
 * Search doc entries by matching query terms against title and description.
 * Returns entries sorted by relevance score.
 */
export function searchDocs(entries: DocEntry[], query: string): DocEntry[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 1);

  if (terms.length === 0) return entries;

  const scored = entries.map((entry) => {
    const titleLower = entry.title.toLowerCase();
    const descLower = entry.description.toLowerCase();
    const urlLower = entry.url.toLowerCase();

    let score = 0;
    for (const term of terms) {
      // Exact word match in title scores highest
      if (titleLower.includes(term)) score += 3;
      // Description match
      if (descLower.includes(term)) score += 2;
      // URL path match (catches things like /integrations/openai-sdk)
      if (urlLower.includes(term)) score += 1;
    }

    return { entry, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.entry);
}
