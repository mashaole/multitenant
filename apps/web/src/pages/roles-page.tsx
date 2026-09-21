import { FormEvent, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../app/auth-context';
import { Button, Card, ErrorFallback, Field, LoadingState, PageShell } from '../components/ui';
import { useFetch } from '../utils/use-fetch';

interface Role {
  id: string;
  name: string;
  isSystem: boolean;
}

export function RolesPage() {
  const { token } = useAuth();
  const roles = useFetch<Role[]>(() => api('/roles', token), [token]);
  const permissions = useFetch<Record<string, Array<{ key: string }>>>(
    () => api('/permissions', token),
    [token],
  );
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  function handleToggle(key: string) {
    setSelected((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    try {
      await api('/roles', token, {
        method: 'POST',
        body: JSON.stringify({ name, permissionKeys: selected }),
      });
      setName('');
      setSelected([]);
      setStatus('Role created.');
      roles.retry();
    } catch (err) {
      setStatus((err as { message: string }).message);
    }
  }

  return (
    <PageShell title="Roles">
      <Card>
        <form onSubmit={handleCreate}>
          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          {permissions.loading && <LoadingState />}
          {permissions.error && (
            <ErrorFallback message={permissions.error} onRetry={permissions.retry} />
          )}
          {permissions.data &&
            Object.entries(permissions.data).map(([domain, list]) => (
              <fieldset key={domain} className="field">
                <legend>{domain}</legend>
                {list.map((item) => (
                  <label key={item.key}>
                    <input
                      type="checkbox"
                      checked={selected.includes(item.key)}
                      onChange={() => handleToggle(item.key)}
                    />{' '}
                    {item.key}
                  </label>
                ))}
              </fieldset>
            ))}
          <Button type="submit" disabled={selected.length === 0}>
            Create role
          </Button>
        </form>
        {status && <p>{status}</p>}
      </Card>
      {roles.loading && <LoadingState />}
      {roles.error && <ErrorFallback message={roles.error} onRetry={roles.retry} />}
      {roles.data?.map((role) => (
        <Card key={role.id}>
          <strong>{role.name}</strong>
          <p className="muted">{role.isSystem ? 'System' : 'Custom'}</p>
        </Card>
      ))}
    </PageShell>
  );
}
