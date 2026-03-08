import { describe, it, expect } from 'vitest';
import { buildFilterBody } from '../lib/shared/filters.js';

describe('buildFilterBody', () => {
  it('empty array produces empty object', () => {
    expect(buildFilterBody([])).toEqual({});
  });

  it('single filter produces the correct structure', () => {
    const result = buildFilterBody([{ field: 'error_count', operator: 'gt', value: [0] }]);
    expect(result).toEqual({ error_count: { value: [0], operator: 'gt' } });
  });

  it('multiple filters all appear as separate keys', () => {
    const result = buildFilterBody([
      { field: 'status_code', operator: 'not', value: [200] },
      { field: 'model', operator: 'eq', value: ['gpt-4'] },
    ]);
    expect(result).toEqual({
      status_code: { value: [200], operator: 'not' },
      model: { value: ['gpt-4'], operator: 'eq' },
    });
  });

  it('filter with empty string operator produces operator: "" in the output', () => {
    const result = buildFilterBody([{ field: 'cost', operator: '', value: [1.5] }]);
    expect(result.cost.operator).toBe('');
  });
});
