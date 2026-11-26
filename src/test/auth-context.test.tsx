import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, useAuth, type AuthState } from '@/lib/auth-context';

afterEach(cleanup);

function Consumer() {
  const { role } = useAuth();
  return <span>{role ?? 'signed out'}</span>;
}

describe('shared account context', () => {
  it('keeps consumer access when the provider rerenders', () => {
    const value: AuthState = { user: null, profile: null, role: null, loading: false, error: null, retry: vi.fn(), signOut: vi.fn() };
    const view = render(<AuthContext.Provider value={value}><Consumer /></AuthContext.Provider>);
    expect(screen.getByText('signed out')).toBeInTheDocument();
    view.rerender(<AuthContext.Provider value={{ ...value, role: 'student' }}><Consumer /></AuthContext.Provider>);
    expect(screen.getByText('student')).toBeInTheDocument();
  });
});