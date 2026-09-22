import { useState } from 'react';
import { api } from '../api/client';
import { Panel } from '../app/error-boundary';
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

  function handleGroupChange(next: string) {
    setGroup(next);
    setPage(1);
  }

  return (
    <PageShell title="Activity">
      <Panel>
        <Card>
          <Field label="Group">
            <select
              value={group}
              onChange={(e) => handleGroupChange(e.target.value)}
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
      </Panel>
      <Panel>
        {error && <ErrorFallback message={error} onRetry={retry} />}
        {loading && <LoadingState />}
        {!loading && !error && data?.items.length === 0 && (
          <p>No events yet.</p>
        )}
        {!loading &&
          !error &&
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
      </Panel>
    </PageShell>
  );
}
