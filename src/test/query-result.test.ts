import { describe, expect, it } from 'vitest';
import { checked } from '@/lib/query-result';
describe('record request failures', () => {
  it('rejects errors rather than returning a misleading empty dataset', async () => {
    await expect(checked(Promise.resolve({ data: null, error: { message: 'Connection failed' } }))).rejects.toThrow('Connection failed');
  });
  it('retains successful records', async () => {
    expect(await checked(Promise.resolve({ data: [{ id: 'record-1' }], error: null }))).toEqual({ data: [{ id: 'record-1' }], error: null });
  });
});