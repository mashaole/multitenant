import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../app/auth-context';
import { Button, Card, Pager, PageShell } from '../components/ui';
import { Page, pagePath } from '../models/page';

interface PickerUser {
  id: string;
  name: string;
  email: string;
  org: { id: string; name: string };
  role: { name: string };
}

export function LoginPage() {
  const { login, token, has } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<Page<PickerUser> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Page<PickerUser>>(pagePath('/auth/users', page), null)
      .then(setUsers)
      .catch((err) => setError(err.message));
  }, [page]);

  useEffect(() => {
    if (!token) {
      return;
    }
    if (has('orgs:create')) {
      navigate('/orgs');
    } else if (has('summary:read')) {
      navigate('/summary');
    } else {
      navigate('/survey');
    }
  }, [token, has, navigate]);

  const grouped = (users?.items ?? []).reduce<Record<string, PickerUser[]>>(
    (acc, user) => {
      acc[user.org.name] = acc[user.org.name] ?? [];
      acc[user.org.name].push(user);
      return acc;
    },
    {},
  );

  return (
    <PageShell title="Sign in">
      <p className="muted">Pick a seeded user. Session cap defaults to 1 per org.</p>
      {error && <p className="error-text">{error}</p>}
      {Object.entries(grouped).map(([org, list]) => (
        <Card key={org}>
          <h2>{org}</h2>
          <ul className="user-list">
            {list.map((user) => (
              <li key={user.id}>
                <div>
                  <strong>{user.name}</strong>
                  <span className="muted"> {user.role.name}</span>
                </div>
                <Button onClick={() => login(user.id).catch((e) => setError(e.message))}>
                  Enter
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ))}
      {users && (
        <Pager
          page={users.page}
          limit={users.limit}
          total={users.total}
          onPage={setPage}
        />
      )}
    </PageShell>
  );
}
