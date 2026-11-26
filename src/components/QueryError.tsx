import { Button } from '@/components/ui/button';
export function QueryError({ error, retry }: { error: Error; retry: () => unknown }) {
  return <div role="alert" className="space-y-3 border border-destructive p-5"><p>Could not load your records. {error.message}</p><Button variant="outline" onClick={retry}>Try again</Button></div>;
}