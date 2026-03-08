export interface FilterInput {
  field: string;
  operator: string;
  value: unknown[];
}

export function buildFilterBody(filters: FilterInput[]): Record<string, { value: unknown[]; operator: string }> {
  const body: Record<string, { value: unknown[]; operator: string }> = {};
  for (const f of filters) {
    body[f.field] = {
      value: f.value,
      operator: f.operator || '',
    };
  }
  return body;
}
