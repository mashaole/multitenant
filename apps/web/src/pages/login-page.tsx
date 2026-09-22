import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../app/auth-context';
import { Button, Card, Field, PageShell } from '../components/ui';

export function LoginPage() {
  const { login, token, has } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await login(email, password);
    } catch (err) {
      setError((err as { message: string }).message);
    }
  }

  return (
    <PageShell title="Sign in">
      <p className="muted">
        Use your work email and password. Session cap defaults to 1 per org.
      </p>
      {error && <p className="error-text">{error}</p>}
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
          <Button type="submit">Sign in</Button>
        </form>
      </Card>
    </PageShell>
  );
}
