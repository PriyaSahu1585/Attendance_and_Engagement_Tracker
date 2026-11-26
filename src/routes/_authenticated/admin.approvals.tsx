import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { checked } from '@/lib/query-result';
import { QueryError } from '@/components/QueryError';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/_authenticated/admin/approvals')({
  head: () => ({ meta: [{ title: 'Access approvals — AttendIQ' }, { name: 'description', content: 'Review teacher and administrator account requests.' }, { property: 'og:title', content: 'Access approvals — AttendIQ' }, { property: 'og:description', content: 'Review teacher and administrator account requests.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  component: Approvals,
});

function Approvals() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const { data = [], error, isLoading, refetch } = useQuery({
    queryKey: ['access-requests'], enabled: role === 'admin',
    queryFn: async () => {
      const result = await checked(supabase.from('access_requests').select('*,profiles(full_name,email,college_name,department,teaching_subject)').order('created_at', { ascending: false }));
      return result.data ?? [];
    },
  });
  const review = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => { await checked(supabase.rpc('review_access_request', { _request_id: id, _approve: approve })); },
    onSuccess: () => { toast.success('Access request updated'); void qc.invalidateQueries(); },
    onError: (error: Error) => toast.error(error.message),
  });
  if (role !== 'admin') return <p>Only administrators can review account requests.</p>;
  if (error) return <QueryError error={error} retry={refetch} />;
  return <div className="space-y-6">
    <div><h1 className="text-3xl font-semibold">Access requests</h1><p className="mt-2 text-muted-foreground">{data.filter(r => r.status === 'pending').length} awaiting review</p></div>
    {isLoading ? <p>Loading requests…</p> : !data.length ? <div className="border-y py-16 text-center"><ShieldCheck className="mx-auto mb-3 size-8 text-primary" /><p>No account requests yet.</p></div> :
      <div className="divide-y border-y">{data.map(r => <div key={r.id} className="flex flex-wrap items-center justify-between gap-4 py-5">
        <div className="min-w-0"><h2 className="font-semibold">{r.profiles?.full_name || 'Account'}</h2><p className="break-all text-sm text-muted-foreground">{r.profiles?.email}</p><p className="mt-2 text-sm">{r.profiles?.college_name || 'College not provided'} · {r.profiles?.department || 'Department not provided'}</p>{r.profiles?.teaching_subject && <p className="text-sm text-muted-foreground">Subject: {r.profiles.teaching_subject}</p>}</div>
        <div className="flex flex-wrap items-center gap-2"><span className="mr-3 text-sm capitalize">{r.requested_role} · {r.status}</span>{r.status === 'pending' && <><Button size="sm" disabled={review.isPending} onClick={() => review.mutate({ id: r.id, approve: true })}><Check className="size-4" />Approve</Button><Button size="sm" variant="outline" disabled={review.isPending} onClick={() => review.mutate({ id: r.id, approve: false })}><X className="size-4" />Reject</Button></>}</div>
      </div>)}</div>}
  </div>;
}