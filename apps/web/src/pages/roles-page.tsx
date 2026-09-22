import { FormEvent, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../app/auth-context';
import { Button, Card, ErrorFallback, Field, LoadingState, Pager, PageShell } from '../components/ui';
import { Page, pagePath } from '../models/page';
import { useFetch } from '../utils/use-fetch';

interface Role {
  id: string;
  name: string;
  isSystem: boolean;
}

interface Permission {
  key: string;
  domain: string;
}

export function RolesPage() {
  const { token } = useAuth();
  const [rolePage, setRolePage] = useState(1);
  const [permPage, setPermPage] = useState(1);
  const roles = useFetch<Page<Role>>(
    () => api(pagePath('/roles', rolePage), token),
    [token, rolePage],
  );
  const permissions = useFetch<Page<Permission>>(
    () => api(pagePath('/permissions', permPage), token),
    [token, permPage],
  );
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const next: Record<string, Permission[]> = {};
    for (const row of permissions.data?.items ?? []) {
      next[row.domain] = next[row.domain] ?? [];
      next[row.domain].push(row);
    }
    return next;
  }, [permissions.data]);

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
      setRolePage(1);
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
          {Object.entries(grouped).map(([domain, list]) => (
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
          {permissions.data && (
            <Pager
              page={permissions.data.page}
              limit={permissions.data.limit}
              total={permissions.data.total}
              onPage={setPermPage}
            />
          )}
          <Button type="submit" disabled={selected.length === 0}>
            Create role
          </Button>
        </form>
        {status && <p>{status}</p>}
      </Card>
      {roles.loading && <LoadingState />}
      {roles.error && <ErrorFallback message={roles.error} onRetry={roles.retry} />}
      {roles.data?.items.map((role) => (
        <Card key={role.id}>
          <strong>{role.name}</strong>
          <p className="muted">{role.isSystem ? 'System' : 'Custom'}</p>
        </Card>
      ))}
      {roles.data && (
        <Pager
          page={roles.data.page}
          limit={roles.data.limit}
          total={roles.data.total}
          onPage={setRolePage}
        />
      )}
    </PageShell>
  );
}
