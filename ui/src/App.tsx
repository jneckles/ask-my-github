import { useEffect, useRef, useState } from 'react';
import { askMock } from './api';
import type { AskResponse, AskState } from './types';

const RECENT_QUESTIONS_KEY = 'ask-my-github:recent-questions';
const MAX_RECENT_QUESTIONS = 5;

const SAMPLE_QUESTIONS = [
  'How does the eval harness work?',
  'What happens on low-context questions?',
  'Where are retrieval regressions tested?',
];

export default function App() {
  const [question, setQuestion] = useState('');
  const [state, setState] = useState<AskState>({ kind: 'idle' });
  const [recentQuestions, setRecentQuestions] = useState<string[]>([]);
  const [aboutOpen, setAboutOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialQueryRanRef = useRef(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(RECENT_QUESTIONS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecentQuestions(
            parsed.filter((item): item is string => typeof item === 'string'),
          );
        }
      }
    } catch {
      setRecentQuestions([]);
    }
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;

      if (event.key === '/' && !isTyping) {
        event.preventDefault();
        inputRef.current?.focus();
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }

      if (event.key === 'Escape') {
        setAboutOpen(false);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (initialQueryRanRef.current) return;

    const initialQuestion = new URLSearchParams(window.location.search).get('q');
    if (initialQuestion?.trim()) {
      initialQueryRanRef.current = true;
      void runQuestion(initialQuestion);
    }
  }, []);

  function rememberQuestion(nextQuestion: string) {
    setRecentQuestions((current) => {
      const next = [
        nextQuestion,
        ...current.filter(
          (saved) => saved.toLowerCase() !== nextQuestion.toLowerCase(),
        ),
      ].slice(0, MAX_RECENT_QUESTIONS);

      window.localStorage.setItem(RECENT_QUESTIONS_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function runQuestion(nextQuestion: string) {
    const trimmed = nextQuestion.trim();
    if (!trimmed || state.kind === 'loading') return;

    setQuestion(trimmed);
    setState({ kind: 'loading' });
    rememberQuestion(trimmed);

    try {
      const response = await askMock({ question: trimmed, topK: 4 });
      setState({ kind: 'success', response });
    } catch (err) {
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await runQuestion(question);
  }

  return (
    <div className="min-h-screen bg-[#f7faf7] text-[#13201a]">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 border-b border-[#d9e4dc] pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">
                ask-my-github
              </h1>
              <button
                type="button"
                onClick={() => setAboutOpen(true)}
                className="grid size-8 place-items-center rounded-full border border-[#c7d6cc] bg-white text-[#31513e] shadow-sm transition hover:border-[#8fab99] hover:text-[#143d27] focus:outline-none focus:ring-2 focus:ring-[#7fb08f]"
                aria-label="About ask-my-github"
              >
                <InfoIcon />
              </button>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#53665a]">
              Sourced answers over GitHub READMEs, with refusal treated as a
              deliberate product state instead of a failure path.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <Metric label="Top K" value="4" />
            <Metric label="Mode" value="Mock" />
            <Metric label="Scope" value="READMEs" />
          </div>
        </header>

        <section className="grid flex-1 gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-5">
            <form
              onSubmit={submit}
              className="rounded-lg border border-[#d4e0d8] bg-white p-3 shadow-soft"
            >
              <label htmlFor="question" className="sr-only">
                Ask a question
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="question"
                  ref={inputRef}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask about a repo..."
                  className="min-h-12 flex-1 rounded-md border border-[#c7d6cc] bg-[#fbfdfb] px-4 text-sm text-[#13201a] outline-none transition placeholder:text-[#7c8d82] focus:border-[#4d8060] focus:ring-3 focus:ring-[#d7eadc]"
                  disabled={state.kind === 'loading'}
                />
                <button
                  type="submit"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#244c35] px-5 text-sm font-semibold text-white transition hover:bg-[#173b27] focus:outline-none focus:ring-2 focus:ring-[#7fb08f] focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#9baaa0]"
                  disabled={state.kind === 'loading' || !question.trim()}
                >
                  <SearchIcon />
                  {state.kind === 'loading' ? 'Asking' : 'Ask'}
                </button>
              </div>
            </form>

            <QuestionChips
              label="Recent"
              questions={recentQuestions}
              disabled={state.kind === 'loading'}
              onSelect={runQuestion}
            />

            {recentQuestions.length === 0 ? (
              <QuestionChips
                label="Try"
                questions={SAMPLE_QUESTIONS}
                disabled={state.kind === 'loading'}
                onSelect={runQuestion}
              />
            ) : null}

            <ResultPanel state={state} />
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg border border-[#d4e0d8] bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-[#213729]">
                Grounding Contract
              </h2>
              <div className="mt-4 space-y-3">
                <StatusRow tone="green" label="Answer" text="Requires sources" />
                <StatusRow tone="amber" label="Refusal" text="Low context" />
                <StatusRow tone="red" label="Error" text="Network or API" />
              </div>
            </div>

            <div className="rounded-lg border border-[#d4e0d8] bg-[#edf5ef] p-4">
              <h2 className="text-sm font-semibold text-[#213729]">
                Backend Shape
              </h2>
              <dl className="mt-3 space-y-3 text-xs text-[#53665a]">
                <MetadataItem label="Endpoint" value="POST /ask" />
                <MetadataItem label="Request" value="question, topK" />
                <MetadataItem label="Response" value="answer, refusal, sources" />
              </dl>
            </div>
          </aside>
        </section>
      </main>

      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}

function ResultPanel({ state }: { state: AskState }) {
  if (state.kind === 'idle') {
    return (
      <section className="rounded-lg border border-dashed border-[#c7d6cc] bg-white/70 p-8 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-[#e3f0e7] text-[#31513e]">
          <SparkIcon />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-[#213729]">
          Ready for a grounded answer
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#607369]">
          Responses show their supporting files and retrieval scores, so the
          confidence signal is visible in the interface.
        </p>
      </section>
    );
  }

  if (state.kind === 'loading') {
    return (
      <section className="rounded-lg border border-[#d4e0d8] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3 text-sm font-medium text-[#31513e]">
          <SpinnerIcon />
          Retrieving sources
        </div>
        <div className="mt-5 space-y-3">
          <div className="h-4 w-3/4 animate-pulse rounded bg-[#dce8df]" />
          <div className="h-4 w-full animate-pulse rounded bg-[#e8f0ea]" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-[#e8f0ea]" />
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="h-24 animate-pulse rounded-md bg-[#f0f5f1]" />
          <div className="h-24 animate-pulse rounded-md bg-[#f0f5f1]" />
        </div>
      </section>
    );
  }

  if (state.kind === 'error') {
    return (
      <section className="rounded-lg border border-[#f1b9b4] bg-[#fff4f2] p-4 text-sm text-[#8f2c24] shadow-sm">
        <div className="flex items-start gap-3">
          <WarningIcon />
          <div>
            <h2 className="font-semibold">Request failed</h2>
            <p className="mt-1 leading-6">{state.message}</p>
          </div>
        </div>
      </section>
    );
  }

  const { response } = state;

  if (response.refused) {
    return (
      <section className="rounded-lg border border-[#e2bf70] bg-[#fff8e7] p-5 text-[#704d13] shadow-sm">
        <div className="flex items-start gap-3">
          <ShieldIcon />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold">Refused</h2>
              <LatencyChip response={response} />
            </div>
            <p className="mt-2 text-sm leading-6">
              {response.refusalReason ??
                'No supporting context was returned for this question.'}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <article className="rounded-lg border border-[#d4e0d8] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf2ee] pb-4">
        <div>
          <p className="text-xs font-semibold uppercase text-[#4f765e]">
            Answer
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[#213729]">
            Grounded response
          </h2>
        </div>
        <LatencyChip response={response} />
      </div>

      <p className="mt-5 text-sm leading-7 text-[#263d2e]">{response.answer}</p>

      <div>
        <h3 className="mt-6 text-xs font-semibold uppercase text-[#4f765e]">
          Sources
        </h3>

        {response.sources.length === 0 ? (
          <p className="mt-3 rounded-md border border-[#d4e0d8] bg-[#f8fbf9] p-4 text-sm italic text-[#607369]">
            No sources returned - answer is from parametric memory.
          </p>
        ) : (
          <ul className="mt-3 grid gap-3">
            {response.sources.map((source, index) => (
              <SourceCard key={`${source.filePath}-${index}`} source={source} />
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

function QuestionChips({
  label,
  questions,
  disabled,
  onSelect,
}: {
  label: string;
  questions: string[];
  disabled: boolean;
  onSelect: (question: string) => void;
}) {
  if (questions.length === 0) return null;

  return (
    <section className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <h2 className="w-14 shrink-0 text-xs font-semibold uppercase text-[#607369]">
        {label}
      </h2>
      <div className="flex min-w-0 flex-wrap gap-2">
        {questions.map((savedQuestion) => (
          <button
            key={savedQuestion}
            type="button"
            onClick={() => onSelect(savedQuestion)}
            disabled={disabled}
            className="max-w-full truncate rounded-full border border-[#c7d6cc] bg-white px-3 py-1.5 text-left text-xs font-medium text-[#31513e] shadow-sm transition hover:border-[#7fa18b] hover:bg-[#f4faf5] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {savedQuestion}
          </button>
        ))}
      </div>
    </section>
  );
}

function SourceCard({
  source,
}: {
  source: AskResponse['sources'][number];
}) {
  return (
    <li className="rounded-md border border-[#d4e0d8] bg-[#fbfdfb] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="min-w-0 break-words font-mono text-xs font-semibold text-[#31513e]">
          {source.filePath}
        </p>
        <span className="rounded-full bg-[#e3f0e7] px-2.5 py-1 text-xs font-semibold text-[#31513e]">
          {source.score.toFixed(2)}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#53665a]">{source.snippet}</p>
    </li>
  );
}

function LatencyChip({ response }: { response: AskResponse }) {
  const slow = response.latencyMs > 1500;

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
        slow
          ? 'bg-[#fff1cf] text-[#7a5010]'
          : 'bg-[#e3f0e7] text-[#31513e]'
      }`}
    >
      {response.latencyMs}ms
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-20 rounded-md border border-[#d4e0d8] bg-white px-3 py-2 shadow-sm">
      <div className="text-[11px] font-semibold uppercase text-[#607369]">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-[#213729]">{value}</div>
    </div>
  );
}

function StatusRow({
  tone,
  label,
  text,
}: {
  tone: 'green' | 'amber' | 'red';
  label: string;
  text: string;
}) {
  const toneClasses = {
    green: 'bg-[#dff0e4] text-[#244c35]',
    amber: 'bg-[#fff1cf] text-[#7a5010]',
    red: 'bg-[#ffe1dc] text-[#8f2c24]',
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]}`}
      >
        {label}
      </span>
      <span className="text-xs text-[#53665a]">{text}</span>
    </div>
  );
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="font-medium text-[#607369]">{label}</dt>
      <dd className="text-right font-mono text-[#213729]">{value}</dd>
    </div>
  );
}

function AboutModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#13201a]/40 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-title"
      onMouseDown={onClose}
    >
      <section
        className="w-full max-w-lg rounded-lg border border-[#d4e0d8] bg-white p-5 shadow-soft"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-[#4f765e]">
              About
            </p>
            <h2
              id="about-title"
              className="mt-1 text-xl font-semibold text-[#213729]"
            >
              Deterministic evals, visible confidence
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 shrink-0 place-items-center rounded-full border border-[#c7d6cc] text-[#31513e] transition hover:bg-[#f3f8f4] focus:outline-none focus:ring-2 focus:ring-[#7fb08f]"
            aria-label="Close about dialog"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-sm leading-6 text-[#53665a]">
          <p>
            The backend uses source-file-match evals instead of LLM-as-judge, so
            retrieval quality can be tracked independently from answer wording.
          </p>
          <p>
            The UI mirrors that contract: refused answers are not errors, source
            scores stay visible, and empty citations get their own honest state.
          </p>
        </div>
      </section>
    </div>
  );
}

function InfoIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
      <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4 animate-spin"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="mt-0.5 size-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="mt-0.5 size-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3v8Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
