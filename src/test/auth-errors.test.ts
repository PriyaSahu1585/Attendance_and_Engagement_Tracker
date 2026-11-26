import { describe, expect, it } from 'vitest';
import { authErrorMessage } from '@/lib/auth-errors';
describe('account error extraction', () => {
  it('preserves messages from structured service errors', () => {
    expect(authErrorMessage({ message: 'Account lookup failed' }, 'Fallback')).toBe('Account lookup failed');
  });
  it('handles absent error details without throwing', () => {
    expect(authErrorMessage(null, 'Fallback')).toBe('Fallback');
  });
});