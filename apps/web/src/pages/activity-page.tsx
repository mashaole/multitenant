import { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../app/auth-context';
import { Card, ErrorFallback, Field, LoadingState, Pager, PageShell } from '../components/ui';
import { Page, pagePath } from '../models/page';
import { useFetch } from '../utils/use-fetch';

interface Activity {
  id: string;
  action: string;
  group: string;
  createdAt: string;
  user: { name: string };
}

const GROUPS = ['auth', 'admin', 'access', 'surveys', 'responses'];

export function ActivityPage() {
  const { token } = useAuth();
  const [group, setGroup] = useState('');
  const [page, setPage] = useState(1);
  const { data, error, loading, retry } = useFetch<Page<Activity>>(
    () => api(pagePath('/activity', page, { group }), token),
    [token, group, page],
  );

  if (error) {
    return (
      <PageShell title="Activity">
        <ErrorFallback message={error} onRetry={retry} />
      </PageShell>
    );
  }

  return (
    <PageShell title="Activity">
      <Card>
        <Field label="Group">
          <select
            value={group}
            onChange={(e) => {
              setGroup(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by group"
          >
            <option value="">All groups</option>
            {GROUPS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
      </Card>
      {loading && <LoadingState />}
      {!loading && data?.items.length === 0 && <p>No events yet.</p>}
      {!loading &&
        data?.items.map((item) => (
          <Card key={item.id}>
            <strong>{item.action}</strong>
            <p className="muted">
              {item.user.name} · {item.group} ·{' '}
              {new Date(item.createdAt).toLocaleString()}
            </p>
          </Card>
        ))}
      {data && (
        <Pager
          page={data.page}
          limit={data.limit}
          total={data.total}
          onPage={setPage}
        />
      )}
    </PageShell>
  );
}
