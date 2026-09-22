import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel } from '../app/error-boundary';
import { useAuth } from '../app/auth-context';
import { homePath } from '../app/home-path';
import { ApiError } from '../api/client';
import { Button, Card, Field, PageShell } from '../components/ui';

export function LoginPage() {
  const { login, token, has, hasModule } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organization, setOrganization] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }
    navigate(homePath(has, hasModule));
  }, [token, has, hasModule, navigate]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await login(email, password, organization.trim());
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message);
    }
  }

  return (
    <PageShell title="Sign in">
      <p className="muted">
        Use your email, password, and organization name.
        Session cap defaults to 1 per org.
      </p>
      {error && <p className="error-text">{error}</p>}
      <Panel>
        <Card>
          <form onSubmit={handleSubmit}>
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                minLength={8}
                required
              />
            </Field>
            <Field label="Organization">
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                autoComplete="organization"
                required
              />
            </Field>
            <Button type="submit">Sign in</Button>
          </form>
        </Card>
      </Panel>
    </PageShell>
  );
}
