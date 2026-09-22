import { FormEvent, useState } from 'react';
import { api } from '../api/client';
import { Panel } from '../app/error-boundary';
import { useAuth } from '../app/auth-context';
import {
  RatingChoices,
  YesNoChoices,
} from '../components/answer-choices';
import {
  Button,
  Card,
  ErrorFallback,
  LoadingState,
  PageShell,
} from '../components/ui';
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
  submittedThisWeek: boolean;
  weekStart: string;
}

function CompletedMessage({
  title,
  justSubmitted,
}: {
  title: string;
  justSubmitted: boolean;
}) {
  return (
    <Card>
      <h2 className="thanks-title">
        {justSubmitted ? 'Thank you' : 'Already completed'}
      </h2>
      <p>
        {justSubmitted
          ? `Thanks for submitting “${title}”. Your answers for this week are saved.`
          : `You have already completed “${title}” for this week.`}
      </p>
      <p className="muted">
        Come back next week for the next pulse. One response per week.
      </p>
    </Card>
  );
}

export function SurveyPage() {
  const { token } = useAuth();
  const { data, error, loading, retry } = useFetch<Survey>(
    () => api('/surveys/active', token),
    [token],
  );
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [yesNo, setYesNo] = useState<Record<string, boolean>>({});
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!data) {
      return;
    }
    const missing = data.questions.some((q) =>
      q.type === 'RATING'
        ? ratings[q.id] === undefined
        : yesNo[q.id] === undefined,
    );
    if (missing) {
      setStatus('Choose an answer for every question.');
      return;
    }
    try {
      await api(`/surveys/${data.id}/responses`, token, {
        method: 'POST',
        body: JSON.stringify({
          answers: data.questions.map((q) =>
            q.type === 'RATING'
              ? { questionId: q.id, ratingValue: ratings[q.id] }
              : { questionId: q.id, yesNoValue: yesNo[q.id] },
          ),
        }),
      });
      setJustSubmitted(true);
      setStatus(null);
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

  const isDone = justSubmitted || data.submittedThisWeek;

  return (
    <PageShell title={data.title}>
      <Panel>
        {isDone ? (
          <CompletedMessage
            title={data.title}
            justSubmitted={justSubmitted}
          />
        ) : (
          <Card>
            <form onSubmit={handleSubmit}>
              {data.questions.map((q) => (
                <div className="field" key={q.id}>
                  <span id={`q-${q.id}`}>{q.text}</span>
                  {q.type === 'RATING' ? (
                    <div aria-labelledby={`q-${q.id}`}>
                      <RatingChoices
                        name={`rating-${q.id}`}
                        value={ratings[q.id]}
                        onChange={(next) =>
                          setRatings((current) => ({
                            ...current,
                            [q.id]: next,
                          }))
                        }
                      />
                    </div>
                  ) : (
                    <div aria-labelledby={`q-${q.id}`}>
                      <YesNoChoices
                        name={`yesno-${q.id}`}
                        value={yesNo[q.id]}
                        onChange={(next) =>
                          setYesNo((current) => ({
                            ...current,
                            [q.id]: next,
                          }))
                        }
                      />
                    </div>
                  )}
                </div>
              ))}
              <Button type="submit">Submit</Button>
            </form>
            {status && <p className="error-text">{status}</p>}
          </Card>
        )}
      </Panel>
    </PageShell>
  );
}
