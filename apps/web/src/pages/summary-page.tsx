import { FormEvent, useState } from 'react';
import { api } from '../api/client';
import { Panel } from '../app/error-boundary';
import { useAuth } from '../app/auth-context';
import {
  CompletionDonut,
  RatingGauge,
  YesNoSplit,
} from '../components/summary-charts';
import {
  Button,
  Card,
  ErrorFallback,
  Field,
  LoadingState,
  PageShell,
} from '../components/ui';
import { useFetch } from '../utils/use-fetch';

interface ActiveSurvey {
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

type QuestionType = 'RATING' | 'YES_NO';

interface DraftQuestion {
  text: string;
  type: QuestionType;
}

export function SummaryPage() {
  const { token, has, hasModule } = useAuth();
  const active = useFetch<ActiveSurvey>(
    () => api('/surveys/active', token),
    [token],
  );
  const summary = useFetch<Summary>(
    () =>
      active.data
        ? api(`/surveys/${active.data.id}/summary`, token)
        : Promise.resolve({
            weekStart: '',
            memberCount: 0,
            completionCount: 0,
            completionRate: 0,
            questions: [],
          }),
    [token, active.data?.id],
  );
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<DraftQuestion[]>([
    { text: '', type: 'RATING' },
  ]);
  const [status, setStatus] = useState<string | null>(null);

  function updateQuestion(
    index: number,
    patch: Partial<DraftQuestion>,
  ) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    );
  }

  function addQuestion() {
    if (questions.length >= 3) return;
    setQuestions((prev) => [...prev, { text: '', type: 'RATING' }]);
  }

  function removeQuestion(index: number) {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    try {
      await api('/surveys', token, {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          questions: questions.map((q, i) => ({
            text: q.text.trim(),
            type: q.type,
            position: i + 1,
          })),
        }),
      });
      setTitle('');
      setQuestions([{ text: '', type: 'RATING' }]);
      setStatus('Survey created. Previous active survey was deactivated.');
      active.retry();
    } catch (err) {
      setStatus((err as { message: string }).message);
    }
  }

  const noActive =
    Boolean(active.error) &&
    /no active survey/i.test(active.error ?? '');

  return (
    <PageShell title="Team pulse">
      {has('surveys:create') && hasModule('surveys') && (
        <Panel>
          <Card>
            <form onSubmit={handleCreate}>
              <Field label="New survey title">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={160}
                  required
                />
              </Field>
              <fieldset className="question-drafts">
                <legend>Questions (1–3)</legend>
                {questions.map((q, index) => (
                  <div className="question-draft" key={index}>
                    <Field label={`Question ${index + 1}`}>
                      <input
                        value={q.text}
                        onChange={(e) =>
                          updateQuestion(index, { text: e.target.value })
                        }
                        maxLength={200}
                        required
                      />
                    </Field>
                    <Field label="Type">
                      <select
                        value={q.type}
                        onChange={(e) =>
                          updateQuestion(index, {
                            type: e.target.value as QuestionType,
                          })
                        }
                      >
                        <option value="RATING">Rating (1–5)</option>
                        <option value="YES_NO">Yes / No</option>
                      </select>
                    </Field>
                    {questions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => removeQuestion(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                {questions.length < 3 && (
                  <Button type="button" variant="ghost" onClick={addQuestion}>
                    Add question
                  </Button>
                )}
              </fieldset>
              <Button type="submit">Create survey</Button>
            </form>
            {status && <p>{status}</p>}
          </Card>
        </Panel>
      )}
      {active.loading || summary.loading ? <LoadingState /> : null}
      {active.error && !noActive && (
        <ErrorFallback message={active.error} onRetry={active.retry} />
      )}
      {summary.error && (
        <ErrorFallback message={summary.error} onRetry={summary.retry} />
      )}
      {noActive && (
        <Panel>
          <Card>
            <p className="muted">No active survey for this organization yet.</p>
          </Card>
        </Panel>
      )}
      {summary.data && active.data && !summary.error && (
        <Panel>
          <Card>
            <h2>{active.data.title}</h2>
            <p className="muted">Week of {summary.data.weekStart}</p>
            <div className="summary-grid">
              <CompletionDonut
                completionCount={summary.data.completionCount}
                memberCount={summary.data.memberCount}
                completionRate={summary.data.completionRate}
              />
              <div className="question-stats">
                {summary.data.questions.map((q) => (
                  <section className="question-stat" key={q.questionId}>
                    <h3>{q.text}</h3>
                    {q.type === 'RATING' ? (
                      <RatingGauge
                        average={q.average ?? 0}
                        count={q.count ?? 0}
                      />
                    ) : (
                      <YesNoSplit yes={q.yes ?? 0} no={q.no ?? 0} />
                    )}
                  </section>
                ))}
              </div>
            </div>
          </Card>
        </Panel>
      )}
    </PageShell>
  );
}
