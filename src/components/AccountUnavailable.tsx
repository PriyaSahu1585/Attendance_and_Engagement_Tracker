import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { authErrorMessage } from '@/lib/auth-errors';
export function AccountUnavailable() {
  const { error, retry, signOut } = useAuth();
  const [notice, setNotice] = useState<string | null>(null);
  return <div className="grid min-h-screen place-items-center px-5"><div className="max-w-md space-y-4">
    <h1 className="text-2xl font-semibold">Account unavailable</h1>
    <p role="alert">{notice || error || 'Your account does not have access yet. Confirm your email or contact your administrator.'}</p>
    <div className="flex gap-3"><Button onClick={() => void retry()}>Try again</Button><Button variant="outline" onClick={() => void signOut().catch(e => setNotice(authErrorMessage(e, 'Could not sign out. Please try again.')))}>Sign out</Button></div>
  </div></div>;
}