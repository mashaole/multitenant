import { FormEvent, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../app/auth-context';
import { Button, Card, ErrorFallback, Field, LoadingState, Pager, PageShell } from '../components/ui';
import { Page, pagePath } from '../models/page';
import { useFetch } from '../utils/use-fetch';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: { name: string };
}

interface Role {
  id: string;
  name: string;
}

export function AdminUsersPage() {
  const { token } = useAuth();
  const [page, setPage] = useState(1);
  const users = useFetch<Page<UserRow>>(
    () => api(pagePath('/users', page), token),
    [token, page],
  );
  const roles = useFetch<Page<Role>>(
    () => api(pagePath('/roles', 1, {}, 100), token),
    [token],
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    try {
      await api('/users', token, {
        method: 'POST',
        body: JSON.stringify({ name, email, password, roleId }),
      });
      setName('');
      setEmail('');
      setPassword('');
      setStatus('User created.');
      setPage(1);
      users.retry();
    } catch (err) {
      setStatus((err as { message: string }).message);
    }
  }

  return (
    <PageShell title="People">
      <Card>
        <form onSubmit={handleCreate}>
          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </Field>
          <Field label="Role">
            <select value={roleId} onChange={(e) => setRoleId(e.target.value)} required>
              <option value="">Select</option>
              {roles.data?.items.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </Field>
          <Button type="submit">Invite</Button>
        </form>
        {status && <p>{status}</p>}
      </Card>
      {users.loading && <LoadingState />}
      {users.error && <ErrorFallback message={users.error} onRetry={users.retry} />}
      {users.data?.items.map((user) => (
        <Card key={user.id}>
          <strong>{user.name}</strong>
          <p className="muted">
            {user.email} · {user.role.name}
          </p>
        </Card>
      ))}
      {users.data && (
        <Pager
          page={users.data.page}
          limit={users.data.limit}
          total={users.data.total}
          onPage={setPage}
        />
      )}
    </PageShell>
  );
}
