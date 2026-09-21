import { FormEvent, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../app/auth-context';
import { Button, Card, ErrorFallback, Field, LoadingState, PageShell } from '../components/ui';
import { useFetch } from '../utils/use-fetch';

const MODULE_KEYS = ['surveys', 'responses', 'summary', 'activity'];

interface Org {
  id: string;
  name: string;
  maxSessionsPerUser: number;
  orgModules: Array<{ module: { key: string } }>;
}

export function AdminOrgsPage() {
  const { token } = useAuth();
  const { data, error, loading, retry } = useFetch<Org[]>(
    () => api('/orgs', token),
    [token],
  );
  const [name, setName] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    try {
      await api('/orgs', token, { method: 'POST', body: JSON.stringify({ name }) });
      setName('');
      setStatus('Organization created.');
      retry();
    } catch (err) {
      setStatus((err as { message: string }).message);
    }
  }

  async function handleModules(orgId: string, keys: string[]) {
    try {
      await api(`/orgs/${orgId}/modules`, token, {
        method: 'PUT',
        body: JSON.stringify({ moduleKeys: keys }),
      });
      retry();
    } catch (err) {
      setStatus((err as { message: string }).message);
    }
  }

  return (
    <PageShell title="Organizations">
      <Card>
        <form onSubmit={handleCreate}>
          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Button type="submit">Create</Button>
        </form>
        {status && <p>{status}</p>}
      </Card>
      {loading && <LoadingState />}
      {error && <ErrorFallback message={error} onRetry={retry} />}
      {data?.map((org) => {
        const current = org.orgModules.map((row) => row.module.key);
        return (
          <Card key={org.id}>
            <strong>{org.name}</strong>
            <p className="muted">max sessions {org.maxSessionsPerUser}</p>
            <div className="field">
              {MODULE_KEYS.map((key) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={current.includes(key)}
                    onChange={() => {
                      const next = current.includes(key)
                        ? current.filter((item) => item !== key)
                        : [...current, key];
                      void handleModules(org.id, next);
                    }}
                  />{' '}
                  {key}
                </label>
              ))}
            </div>
          </Card>
        );
      })}
    </PageShell>
  );
}
