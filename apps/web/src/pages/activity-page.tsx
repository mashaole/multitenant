import { api } from '../api/client';
import { useAuth } from '../app/auth-context';
import { Card, ErrorFallback, LoadingState, PageShell } from '../components/ui';
import { useFetch } from '../utils/use-fetch';

interface Activity {
  id: string;
  action: string;
  group: string;
  createdAt: string;
  user: { name: string };
}

export function ActivityPage() {
  const { token } = useAuth();
  const { data, error, loading, retry } = useFetch<Activity[]>(
    () => api('/activity', token),
    [token],
  );

  if (loading) {
    return (
      <PageShell title="Activity">
        <LoadingState />
      </PageShell>
    );
  }
  if (error) {
    return (
      <PageShell title="Activity">
        <ErrorFallback message={error} onRetry={retry} />
      </PageShell>
    );
  }

  return (
    <PageShell title="Activity">
      {data?.length === 0 && <p>No events yet.</p>}
      {data?.map((item) => (
        <Card key={item.id}>
          <strong>{item.action}</strong>
          <p className="muted">
            {item.user.name} · {item.group} ·{' '}
            {new Date(item.createdAt).toLocaleString()}
          </p>
        </Card>
      ))}
    </PageShell>
  );
}
