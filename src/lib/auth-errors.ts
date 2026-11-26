export function authErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const code = 'code' in error ? error.code : undefined;
    if (code === 'invalid_credentials') return 'Email or password is incorrect. If this is your first visit to this restored app, create an account first. Accounts from the old app have not been imported.';
    if (code === 'email_not_confirmed') return 'Confirm your email before signing in. Check your inbox and spam folder.';
    const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
    if (/530|failed to fetch|networkerror|network request failed/i.test(message)) return 'The connection is temporarily unavailable. Please try again shortly; your details have not been saved.';
    if (message) return message;
  }
  return fallback;
}