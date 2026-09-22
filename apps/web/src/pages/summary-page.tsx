import { FormEvent, useState } from 'react';
import { api } from '../api/client';
import { Panel } from '../app/error-boundary';
import { useAuth } from '../app/auth-context';
import { Button, Card, ErrorFallback, Field, LoadingState, Pager, PageShell } from '../components/ui';
import { Page, pagePath } from '../models/page';
import { useFetch } from '../utils/use-fetch';

interface Survey {
  id: string;
  title: string;
}

interface Summary {
  weekStart: string;
  memberCount: number;
  completionCount: number;
  completionRate: number;
  questions: Array<{
    questionId: string;
    text: string;
    type: string;
    average?: number;
    count?: number;
    yes?: number;
    no?: number;
  }>;
}

export function SummaryPage() {
  const { token, has } = useAuth();
  const [page, setPage] = useState(1);
  const surveys = useFetch<Page<Survey>>(
    () => api(pagePath('/surveys', page), token),
    [token, page],
  );
  const selected = surveys.data?.items[0];
  const summary = useFetch<Summary>(
    () =>
      selected
        ? api(`/surveys/${selected.id}/summary`, token)
        : Promise.resolve({
            weekStart: '',
            memberCount: 0,
            completionCount: 0,
            completionRate: 0,
            questions: [],
          }),
    [token, selected?.id],
  );
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    try {
      await api('/surveys', token, {
        method: 'POST',
        body: JSON.stringify({
          title,
          questions: [
            { text: 'How was this week?', type: 'RATING', position: 1 },
            { text: 'Did you hit your goal?', type: 'YES_NO', position: 2 },
          ],
        }),
      });
      setTitle('');
      setStatus('Survey created.');
      setPage(1);
      surveys.retry();
    } catch (err) {
      setStatus((err as { message: string }).message);
    }
  }

  return (
    <PageShell title="Team pulse">
      {has('surveys:create') && (
        <Panel>
          <Card>
            <form onSubmit={handleCreate}>
              <Field label="New survey title">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </Field>
              <Button type="submit">Create survey</Button>
            </form>
            {status && <p>{status}</p>}
          </Card>
        </Panel>
      )}
      {surveys.loading || summary.loading ? <LoadingState /> : null}
      {surveys.error && (
        <ErrorFallback message={surveys.error} onRetry={surveys.retry} />
      )}
      {summary.error && (
        <ErrorFallback message={summary.error} onRetry={summary.retry} />
      )}
      {surveys.data && surveys.data.items.length > 1 && (
        <Panel>
          <ul className="user-list">
            {surveys.data.items.map((survey) => (
              <li key={survey.id}>
                <strong>{survey.title}</strong>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {summary.data && selected && !summary.error && (
        <Panel>
          <Card>
            <h2>{selected.title}</h2>
            <p>Week of {summary.data.weekStart}</p>
            <p>
              {summary.data.completionCount} of {summary.data.memberCount} members
              submitted
            </p>
            <p>
              Completion {Math.round(summary.data.completionRate * 100)}%
            </p>
            {summary.data.questions.map((q) => (
              <p key={q.questionId}>
                {q.text}:{' '}
                {q.type === 'RATING'
                  ? `avg ${q.average?.toFixed(1) ?? 0} (${q.count ?? 0})`
                  : `yes ${q.yes ?? 0} / no ${q.no ?? 0}`}
              </p>
            ))}
          </Card>
        </Panel>
      )}
      {surveys.data && (
        <Pager
          page={surveys.data.page}
          limit={surveys.data.limit}
          total={surveys.data.total}
          onPage={setPage}
        />
      )}
    </PageShell>
  );
}
