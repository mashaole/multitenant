import { FormEvent, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../app/auth-context';
import { Button, Card, Field, PageShell } from '../components/ui';

export function SettingsPage() {
  const { token, org } = useAuth();
  const [cap, setCap] = useState(1);
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!org) {
      return;
    }
    try {
      await api(`/orgs/${org.id}/settings`, token, {
        method: 'PATCH',
        body: JSON.stringify({ maxSessionsPerUser: cap }),
      });
      setStatus('Session cap updated.');
    } catch (err) {
      setStatus((err as { message: string }).message);
    }
  }

  return (
    <PageShell title="Organization settings">
      <Card>
        <form onSubmit={handleSubmit}>
          <Field label="Max sessions per user (1–20)">
            <input
              type="number"
              min={1}
              max={20}
              value={cap}
              onChange={(e) => setCap(Number(e.target.value))}
              required
            />
          </Field>
          <Button type="submit">Save</Button>
        </form>
        {status && <p>{status}</p>}
      </Card>
    </PageShell>
  );
}
