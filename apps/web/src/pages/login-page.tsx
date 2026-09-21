import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../app/auth-context';
import { Button, Card, PageShell } from '../components/ui';

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
  const [users, setUsers] = useState<PickerUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<PickerUser[]>('/auth/users', null)
      .then(setUsers)
      .catch((err) => setError(err.message));
  }, []);

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

  const grouped = users.reduce<Record<string, PickerUser[]>>((acc, u) => {
    acc[u.org.name] = acc[u.org.name] ?? [];
    acc[u.org.name].push(u);
    return acc;
  }, {});

  return (
    <PageShell title="Sign in">
      <p className="muted">Pick a seeded user. Session cap defaults to 1 per org.</p>
      {error && <p className="error-text">{error}</p>}
      {Object.entries(grouped).map(([org, list]) => (
        <Card key={org}>
          <h2>{org}</h2>
          <ul className="user-list">
            {list.map((u) => (
              <li key={u.id}>
                <div>
                  <strong>{u.name}</strong>
                  <span className="muted"> {u.role.name}</span>
                </div>
                <Button onClick={() => login(u.id).catch((e) => setError(e.message))}>
                  Enter
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </PageShell>
  );
}
