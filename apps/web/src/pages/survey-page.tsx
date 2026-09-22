import { FormEvent, useState } from 'react';
import { api } from '../api/client';
import { Panel } from '../app/error-boundary';
import { useAuth } from '../app/auth-context';
import { Button, Card, ErrorFallback, LoadingState, PageShell } from '../components/ui';
import { useFetch } from '../utils/use-fetch';

interface Question {
  id: string;
  text: string;
  type: 'RATING' | 'YES_NO';
}

interface Survey {
  id: string;
  title: string;
  questions: Question[];
}

export function SurveyPage() {
  const { token } = useAuth();
  const { data, error, loading, retry } = useFetch<Survey>(
    () => api('/surveys/active', token),
    [token],
  );
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [yesNo, setYesNo] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!data) {
      return;
    }
    try {
      await api(`/surveys/${data.id}/responses`, token, {
        method: 'POST',
        body: JSON.stringify({
          answers: data.questions.map((q) =>
            q.type === 'RATING'
              ? { questionId: q.id, ratingValue: ratings[q.id] }
              : { questionId: q.id, yesNoValue: yesNo[q.id] ?? false },
          ),
        }),
      });
      setStatus('Saved for this week.');
    } catch (err) {
      setStatus((err as { message: string }).message);
    }
  }

  if (loading) {
    return (
      <PageShell title="Weekly pulse">
        <LoadingState />
      </PageShell>
    );
  }
  if (error) {
    return (
      <PageShell title="Weekly pulse">
        <ErrorFallback message={error} onRetry={retry} />
      </PageShell>
    );
  }
  if (!data) {
    return (
      <PageShell title="Weekly pulse">
        <p>No active survey.</p>
      </PageShell>
    );
  }

  return (
    <PageShell title={data.title}>
      <Panel>
        <Card>
          <form onSubmit={handleSubmit}>
          {data.questions.map((q) => (
            <label className="field" key={q.id}>
              <span>{q.text}</span>
              {q.type === 'RATING' ? (
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={ratings[q.id] ?? ''}
                  onChange={(e) =>
                    setRatings((current) => ({
                      ...current,
                      [q.id]: Number(e.target.value),
                    }))
                  }
                  required
                />
              ) : (
                <select
                  value={yesNo[q.id] === undefined ? '' : String(yesNo[q.id])}
                  onChange={(e) =>
                    setYesNo((current) => ({
                      ...current,
                      [q.id]: e.target.value === 'true',
                    }))
                  }
                  required
                >
                  <option value="">Select</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              )}
            </label>
          ))}
          <Button type="submit">Submit</Button>
        </form>
          {status && <p>{status}</p>}
        </Card>
      </Panel>
    </PageShell>
  );
}
