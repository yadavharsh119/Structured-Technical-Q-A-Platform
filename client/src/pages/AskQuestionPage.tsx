import { useEffect, useState } from 'react';
import { CheckCircle2, LogIn, X } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { Button, LinkButton } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { clearDraft, loadDraft, useQuestionDraft, useUnsavedChangesWarning } from '../hooks/useQuestionDraft';
import {
  QUESTION_ATTACHMENTS_MAX,
  QUESTION_ATTACHMENT_EXTENSIONS,
  QUESTION_ATTACHMENT_MAX_BYTES,
  QUESTION_CATEGORIES,
  QUESTION_DESCRIPTION_MAX,
  QUESTION_TAGS,
  QUESTION_TAGS_MAX,
  QUESTION_TITLE_MAX,
  questionSubmissionSchema,
  submitQuestion,
} from '../api/questions';
import type { DraftAttachment, SubmittedQuestion } from '../api/questions';

const input = 'h-12 w-full rounded-lg border border-line bg-white px-4 text-base text-ink placeholder:text-muted';
const label = 'mb-1 block text-sm font-medium text-ink';
const errorText = 'mt-1 text-sm text-ink font-medium';
const counter = 'mt-1 text-right text-xs text-muted';

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function attachmentError(file: File): string | null {
  const dot = file.name.lastIndexOf('.');
  const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
  if (!(QUESTION_ATTACHMENT_EXTENSIONS as readonly string[]).includes(ext)) {
    return `Allowed types: ${QUESTION_ATTACHMENT_EXTENSIONS.join(', ')}.`;
  }
  if (file.size > QUESTION_ATTACHMENT_MAX_BYTES) return 'Each file must be 10 MB or smaller.';
  return null;
}

interface GateProps {
  reason: 'login' | 'verify';
}

function Gate({ reason }: GateProps) {
  return (
    <PageShell>
      <section aria-labelledby="ask-heading" className="bg-white">
        <div className="mx-auto max-w-content px-6 py-16 md:py-24">
          <p className="text-sm font-medium text-muted">Ask a Question</p>
          <h1 id="ask-heading" className="mt-3 max-w-2xl font-serif text-[30px] leading-[1.2] text-ink md:text-[40px]">
            {reason === 'login' ? 'Log in to ask a question.' : 'Verify your email to ask a question.'}
          </h1>
          <p className="mt-4 max-w-2xl text-[20px] text-body">
            {reason === 'login'
              ? 'Only logged-in users with a verified email can submit questions.'
              : 'Check your inbox for the verification link, then come back to submit.'}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href={reason === 'login' ? '/login' : '/verify-email'}>
              <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
              {reason === 'login' ? 'Log in' : 'Verify email'}
            </LinkButton>
            <LinkButton href="/" variant="outline">
              Back to home
            </LinkButton>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

type Errors = Partial<Record<'title' | 'description' | 'category' | 'tags' | 'attachments', string>>;

export function AskQuestionPage() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [techStack, setTechStack] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmittedQuestion | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = loadDraft();
    if (saved) {
      setTitle(saved.title);
      setDescription(saved.description);
      setCategory(saved.category);
      setTechStack(saved.techStack);
      setTags(saved.tags);
    }
    setHydrated(true);
  }, []);

  const draft = { title, description, category, techStack, tags };
  useQuestionDraft(hydrated ? draft : { title: '', description: '', category: '', techStack: '', tags: [] });
  const dirty = title !== '' || description !== '' || techStack !== '' || tags.length > 0 || category !== '';
  useUnsavedChangesWarning(dirty && result === null);

  if (user === null) return <Gate reason="login" />;
  if (user.emailVerified !== true) return <Gate reason="verify" />;

  const toggleTag = (tag: string) => {
    setTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= QUESTION_TAGS_MAX) return prev;
      return [...prev, tag];
    });
  };

  const onFiles = (list: FileList | null) => {
    if (!list) return;
    const picked = Array.from(list);
    const problems: string[] = [];
    const ok: File[] = [];
    for (const f of picked) {
      if (files.length + ok.length >= QUESTION_ATTACHMENTS_MAX) {
        problems.push(`Attach up to ${QUESTION_ATTACHMENTS_MAX} files.`);
        break;
      }
      const err = attachmentError(f);
      if (err) problems.push(`${f.name}: ${err}`);
      else ok.push(f);
    }
    setFiles((prev) => [...prev, ...ok].slice(0, QUESTION_ATTACHMENTS_MAX));
    setErrors((prev) => ({ ...prev, attachments: problems[0] as string | undefined }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const parsed = questionSubmissionSchema.safeParse({
      title,
      description,
      category: category === '' ? undefined : category,
      techStack: techStack === '' ? undefined : techStack,
      tags,
      attachments: files.map((f) => ({ name: f.name, size: f.size }) satisfies DraftAttachment),
    });
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? '') as keyof Errors;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const res = await submitQuestion(parsed.data, files);
      clearDraft();
      setResult(res);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const tagsFieldset = (
    <fieldset>
      <legend className="text-sm font-medium text-ink">
        Tags <span className="font-normal text-muted">(pick up to {QUESTION_TAGS_MAX})</span>
      </legend>
      {tags.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Selected tags">
          {tags.map((t) => (
            <li key={t} className="inline-flex items-center gap-1.5 rounded-lg bg-tint px-2.5 py-1 text-sm text-secondary">
              {t}
              <button
                type="button"
                onClick={() => toggleTag(t)}
                aria-label={`Remove tag: ${t}`}
                className="inline-flex h-5 w-5 items-center justify-center rounded text-secondary hover:text-black"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Available tags">
        {QUESTION_TAGS.filter((t) => !tags.includes(t)).map((t) => (
          <button
            key={t}
            type="button"
            disabled={tags.length >= QUESTION_TAGS_MAX}
            onClick={() => toggleTag(t)}
            className="rounded-lg border border-line bg-white px-2.5 py-1 text-sm text-secondary hover:bg-tint disabled:opacity-40"
          >
            {t}
          </button>
        ))}
      </div>
      {errors.tags && <p role="alert" className={errorText}>{errors.tags}</p>}
    </fieldset>
  );

  return (
    <PageShell>
      <section aria-labelledby="ask-form-heading" className="bg-white">
        <div className="mx-auto max-w-content px-6 py-16 md:py-24">
          {result ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-success" aria-hidden="true" />
              <h1 id="ask-form-heading" className="mx-auto mt-4 max-w-2xl font-serif text-[30px] leading-[1.2] text-ink md:text-[40px]">
                Your question has been queued for review
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-[20px] text-body">
                Question ID <span className="font-mono text-base text-ink">{result.id}</span>
                <span aria-hidden="true"> · </span>
                Status <span className="font-medium text-ink">{result.status}</span>
              </p>
              <div className="mt-8">
                <LinkButton href="/topics">Back to dashboard</LinkButton>
              </div>
            </div>
          ) : (
          <div>
          <p className="text-sm font-medium text-muted">Ask a Question</p>
          <h1 id="ask-form-heading" className="mt-3 max-w-2xl font-serif text-[30px] leading-[1.2] text-ink md:text-[40px]">
            Submit a question for review
          </h1>
          <p className="mt-4 max-w-2xl text-[20px] text-body">
            A moderator will review it before it becomes a Topic.
          </p>
          <form onSubmit={onSubmit} noValidate className="mt-10 max-w-2xl space-y-6">
            <div aria-live="polite">
              {submitError && <p className={errorText} role="alert">{submitError}</p>}
            </div>
            <div>
              <label htmlFor="q-title" className={label}>Title</label>
              <input
                id="q-title"
                type="text"
                value={title}
                maxLength={QUESTION_TITLE_MAX + 20}
                onChange={(e) => setTitle(e.target.value)}
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? 'q-title-error q-title-count' : 'q-title-count'}
                placeholder="e.g. How do I handle Redis failover?"
                className={input}
              />
              <p id="q-title-count" className={counter}>{title.length} / {QUESTION_TITLE_MAX}</p>
              {errors.title && <p id="q-title-error" role="alert" className={errorText}>{errors.title}</p>}
            </div>
            <div>
              <label htmlFor="q-description" className={label}>Problem Description</label>
              <textarea
                id="q-description"
                value={description}
                rows={6}
                onChange={(e) => setDescription(e.target.value)}
                aria-invalid={Boolean(errors.description)}
                aria-describedby={errors.description ? 'q-description-error q-description-count' : 'q-description-count'}
                placeholder="Describe the problem, what you tried, and what happened."
                className="w-full rounded-lg border border-line bg-white px-4 py-3 text-base text-ink placeholder:text-muted"
              />
              <p id="q-description-count" className={counter}>{description.length} / {QUESTION_DESCRIPTION_MAX}</p>
              {errors.description && <p id="q-description-error" role="alert" className={errorText}>{errors.description}</p>}
            </div>
            <div>
              <label htmlFor="q-category" className={label}>Category</label>
              <select
                id="q-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                aria-invalid={Boolean(errors.category)}
                aria-describedby={errors.category ? 'q-category-error' : undefined}
                className="h-12 w-full rounded-lg border border-line bg-white px-4 text-base text-ink"
              >
                <option value="">Select a category</option>
                {QUESTION_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {errors.category && <p id="q-category-error" role="alert" className={errorText}>{errors.category}</p>}
            </div>
            <div>
              <label htmlFor="q-techstack" className={label}>
                Programming Language / Tech Stack <span className="font-normal text-muted">(optional)</span>
              </label>
              <input
                id="q-techstack"
                type="text"
                value={techStack}
                onChange={(e) => setTechStack(e.target.value)}
                placeholder="e.g. TypeScript, Redis 7"
                className={input}
              />
            </div>
            {tagsFieldset}
            <div>
              <label htmlFor="q-files" className={label}>
                Attachments <span className="font-normal text-muted">(optional, up to {QUESTION_ATTACHMENTS_MAX})</span>
              </label>
              <input
                id="q-files"
                type="file"
                multiple
                accept=".txt,.log,.pdf,.png,.jpg,.zip"
                onChange={(e) => {
                  onFiles(e.target.files);
                  e.target.value = '';
                }}
                aria-describedby={errors.attachments ? 'q-files-error' : undefined}
                className="block w-full text-sm text-body file:mr-3 file:rounded-lg file:border file:border-line file:bg-white file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-ink hover:file:bg-tint"
              />
              {files.length > 0 && (
                <ul className="mt-3 space-y-2" aria-label="Attached files">
                  {files.map((f) => (
                    <li key={`${f.name}-${f.size}`} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 py-2 text-sm">
                      <span className="min-w-0 truncate text-ink">
                        {f.name} <span className="text-muted">({formatBytes(f.size)})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setFiles((prev) => prev.filter((x) => x !== f))}
                        aria-label={`Remove file: ${f.name}`}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-secondary hover:text-black"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {errors.attachments && <p id="q-files-error" role="alert" className={errorText}>{errors.attachments}</p>}
            </div>
            <Button type="submit" disabled={submitting} aria-busy={submitting}>
              {submitting ? 'Submitting…' : 'Submit question'}
            </Button>
          </form>
          </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}

export default AskQuestionPage;


