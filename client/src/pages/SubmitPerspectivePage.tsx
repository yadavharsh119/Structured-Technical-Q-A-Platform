import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Info, LogIn, Plus, Trash2, Upload, X } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { Button, LinkButton } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { fetchTopicBySlug } from '../api/topics';
import {
  hasUserSubmittedPerspective,
  PERSPECTIVE_ADVANTAGES_MAX,
  PERSPECTIVE_EXPLANATION_MAX,
  PERSPECTIVE_ITEM_MAX,
  PERSPECTIVE_LIMITATIONS_MAX,
  PERSPECTIVE_REFERENCES_MAX,
  PERSPECTIVE_SNIPPETS_MAX,
  PERSPECTIVE_SOLUTION_MAX,
  PERSPECTIVE_TEMPLATES,
  submitPerspective,
} from '../api/perspectives';
import {
  clearPerspectiveDraft,
  loadPerspectiveDraft,
  usePerspectiveDraft,
} from '../hooks/usePerspectiveDraft';
import type { TopicDetail } from '../types/topic';
import { NotFoundPage } from './NotFoundPage';

const ATTACHMENT_MAX_FILES = 3;
const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
const ATTACHMENT_EXTENSIONS = ['.txt', '.log', '.pdf', '.png', '.jpg', '.zip'] as const;

const CODE_LANGUAGES = [
  'typescript',
  'javascript',
  'python',
  'go',
  'rust',
  'java',
  'sql',
  'bash',
  'c',
  'cpp',
  'json',
  'yaml',
  'other',
];

const inputClass =
  'h-11 w-full rounded-lg border border-line bg-white px-3.5 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none';
const textareaClass =
  'w-full rounded-lg border border-line bg-white p-3.5 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none';
const labelClass = 'block text-sm font-semibold text-ink mb-1';
const errorClass = 'mt-1 text-sm font-medium text-red-600';
const counterClass = 'mt-1 text-right text-xs text-muted';

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

interface Snippet {
  language: string;
  code: string;
}

interface Reference {
  label: string;
  url: string;
}

export function SubmitPerspectivePage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [topicLoading, setTopicLoading] = useState(true);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  // Form state
  const [solution, setSolution] = useState('');
  const [explanation, setExplanation] = useState('');
  const [advantages, setAdvantages] = useState<string[]>(['']);
  const [limitations, setLimitations] = useState<string[]>(['']);
  const [codeSnippets, setCodeSnippets] = useState<Snippet[]>([]);
  const [references, setReferences] = useState<Reference[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [anonymous, setAnonymous] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Draft autosaving
  const { lastSaved } = usePerspectiveDraft(slug, {
    solution,
    explanation,
    advantages,
    limitations,
    codeSnippets,
    references,
    anonymous,
  });

  // Load topic & check already submitted
  useEffect(() => {
    let canceled = false;
    setTopicLoading(true);

    fetchTopicBySlug(slug)
      .then(async (t) => {
        if (canceled) return;
        setTopic(t);
        if (t && user?.username) {
          const submitted = await hasUserSubmittedPerspective(slug, user.username);
          if (!canceled) setAlreadySubmitted(submitted);
        }
        setTopicLoading(false);
      })
      .catch(() => {
        if (!canceled) {
          setTopic(null);
          setTopicLoading(false);
        }
      });

    return () => {
      canceled = true;
    };
  }, [slug, user?.username]);

  // Load saved draft on mount
  useEffect(() => {
    const saved = loadPerspectiveDraft(slug);
    if (saved) {
      if (saved.solution) setSolution(saved.solution);
      if (saved.explanation) setExplanation(saved.explanation);
      if (saved.advantages && saved.advantages.length > 0) setAdvantages(saved.advantages);
      if (saved.limitations && saved.limitations.length > 0) setLimitations(saved.limitations);
      if (saved.codeSnippets) setCodeSnippets(saved.codeSnippets);
      if (saved.references) setReferences(saved.references);
      if (typeof saved.anonymous === 'boolean') setAnonymous(saved.anonymous);
    }
  }, [slug]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const tmpl = PERSPECTIVE_TEMPLATES.find((t) => t.id === templateId);
    if (tmpl) {
      setSolution(tmpl.solution);
      setExplanation(tmpl.explanation);
      setAdvantages([...tmpl.advantages]);
      setLimitations([...tmpl.limitations]);
    }
  };

  // Add/remove items helpers
  const updateAdvantage = (index: number, value: string) => {
    const next = [...advantages];
    next[index] = value;
    setAdvantages(next);
  };
  const addAdvantage = () => {
    if (advantages.length < PERSPECTIVE_ADVANTAGES_MAX) setAdvantages([...advantages, '']);
  };
  const removeAdvantage = (index: number) => {
    if (advantages.length > 1) setAdvantages(advantages.filter((_, i) => i !== index));
    else setAdvantages(['']);
  };

  const updateLimitation = (index: number, value: string) => {
    const next = [...limitations];
    next[index] = value;
    setLimitations(next);
  };
  const addLimitation = () => {
    if (limitations.length < PERSPECTIVE_LIMITATIONS_MAX) setLimitations([...limitations, '']);
  };
  const removeLimitation = (index: number) => {
    if (limitations.length > 1) setLimitations(limitations.filter((_, i) => i !== index));
    else setLimitations(['']);
  };

  const addSnippet = () => {
    if (codeSnippets.length < PERSPECTIVE_SNIPPETS_MAX) {
      setCodeSnippets([...codeSnippets, { language: 'typescript', code: '' }]);
    }
  };
  const updateSnippet = (index: number, patch: Partial<Snippet>) => {
    const next = [...codeSnippets];
    next[index] = { ...next[index], ...patch };
    setCodeSnippets(next);
  };
  const removeSnippet = (index: number) => {
    setCodeSnippets(codeSnippets.filter((_, i) => i !== index));
  };

  const addReference = () => {
    if (references.length < PERSPECTIVE_REFERENCES_MAX) {
      setReferences([...references, { label: '', url: '' }]);
    }
  };
  const updateReference = (index: number, patch: Partial<Reference>) => {
    const next = [...references];
    next[index] = { ...next[index], ...patch };
    setReferences(next);
  };
  const removeReference = (index: number) => {
    setReferences(references.filter((_, i) => i !== index));
  };

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const added = Array.from(newFiles);
    const valid: File[] = [];
    const errs: string[] = [];

    for (const f of added) {
      const dot = f.name.lastIndexOf('.');
      const ext = dot >= 0 ? f.name.slice(dot).toLowerCase() : '';
      if (!(ATTACHMENT_EXTENSIONS as readonly string[]).includes(ext as (typeof ATTACHMENT_EXTENSIONS)[number])) {
        errs.push(`${f.name}: Invalid extension. Allowed: ${ATTACHMENT_EXTENSIONS.join(', ')}`);
        continue;
      }
      if (f.size > ATTACHMENT_MAX_BYTES) {
        errs.push(`${f.name}: Exceeds 10 MB limit.`);
        continue;
      }
      valid.push(f);
    }

    if (errs.length > 0) {
      setErrors((prev) => ({ ...prev, attachments: errs.join(' ') }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.attachments;
        return next;
      });
    }

    setFiles((prev) => [...prev, ...valid].slice(0, ATTACHMENT_MAX_FILES));
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!solution.trim()) {
      errs.solution = 'Proposed solution is required.';
    } else if (solution.length > PERSPECTIVE_SOLUTION_MAX) {
      errs.solution = `Solution must be ${PERSPECTIVE_SOLUTION_MAX} characters or fewer.`;
    }

    if (!explanation.trim()) {
      errs.explanation = 'Explanation is required.';
    } else if (explanation.length > PERSPECTIVE_EXPLANATION_MAX) {
      errs.explanation = `Explanation must be ${PERSPECTIVE_EXPLANATION_MAX} characters or fewer.`;
    }

    const cleanAdv = advantages.map((a) => a.trim()).filter(Boolean);
    if (cleanAdv.length === 0) {
      errs.advantages = 'At least one advantage is required.';
    } else if (cleanAdv.some((a) => a.length > PERSPECTIVE_ITEM_MAX)) {
      errs.advantages = `Each advantage must be ${PERSPECTIVE_ITEM_MAX} characters or fewer.`;
    }

    const cleanLim = limitations.map((l) => l.trim()).filter(Boolean);
    if (cleanLim.length === 0) {
      errs.limitations = 'At least one limitation is required.';
    } else if (cleanLim.some((l) => l.length > PERSPECTIVE_ITEM_MAX)) {
      errs.limitations = `Each limitation must be ${PERSPECTIVE_ITEM_MAX} characters or fewer.`;
    }

    for (let i = 0; i < codeSnippets.length; i++) {
      const s = codeSnippets[i];
      if (!s.code.trim()) {
        errs[`code_${i}`] = 'Code snippet cannot be empty.';
      }
    }

    for (let i = 0; i < references.length; i++) {
      const r = references[i];
      if (!r.url.trim()) {
        errs[`ref_${i}`] = 'Reference URL is required.';
      } else {
        try {
          new URL(r.url);
        } catch {
          errs[`ref_${i}`] = 'Must be a valid URL (e.g. https://example.com).';
        }
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);

    const cleanAdv = advantages.map((a) => a.trim()).filter(Boolean);
    const cleanLim = limitations.map((l) => l.trim()).filter(Boolean);

    try {
      await submitPerspective(
        slug,
        {
          solution: solution.trim(),
          explanation: explanation.trim(),
          advantages: cleanAdv,
          limitations: cleanLim,
          codeSnippets: codeSnippets.map((s) => ({
            language: s.language,
            code: s.code.trim(),
          })),
          references: references.map((r) => ({
            label: r.label.trim() || r.url.trim(),
            url: r.url.trim(),
          })),
          anonymous,
        },
        user?.username,
      );

      clearPerspectiveDraft(slug);
      setIsSuccess(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit perspective.');
    } finally {
      setSubmitting(false);
    }
  };

  if (topicLoading) {
    return (
      <PageShell>
        <div className="mx-auto max-w-content px-6 py-16" role="status">
          <div className="animate-pulse space-y-6">
            <div className="h-4 w-28 rounded bg-tint" />
            <div className="h-10 w-2/3 rounded bg-tint" />
            <div className="h-64 w-full rounded-xl bg-tint/40" />
          </div>
          <span className="sr-only">Loading topic details...</span>
        </div>
      </PageShell>
    );
  }

  if (!topic) return <NotFoundPage message="Topic not found." />;

  const isGuest = user === null;
  const isUnverified = user !== null && !user.emailVerified;
  const isArchived = topic.status === 'archived';

  // Gate message handling
  if (isGuest || isUnverified || isArchived || alreadySubmitted) {
    let title = '';
    let message = '';
    let actionLink = '';
    let actionLabel = '';

    if (isGuest) {
      title = 'Log in to submit a Perspective';
      message = 'You must be logged in with a verified account to share a technical perspective.';
      actionLink = '/login';
      actionLabel = 'Log in';
    } else if (isUnverified) {
      title = 'Verify your email to submit a Perspective';
      message = 'Please verify your email address to unlock perspective submission.';
      actionLink = '/verify-email';
      actionLabel = 'Verify email';
    } else if (isArchived) {
      title = 'This topic is archived';
      message = 'Archived topics are preserved for reading and do not accept new perspectives.';
    } else if (alreadySubmitted) {
      title = 'Perspective already submitted';
      message =
        'You have already submitted a perspective to this topic. To ensure diversity of viewpoints, each user is limited to one perspective per topic.';
    }

    return (
      <PageShell>
        <section aria-labelledby="gate-heading" className="bg-white">
          <div className="mx-auto max-w-content px-6 py-16 md:py-24">
            <Link
              to={`/topics/${slug}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to topic
            </Link>

            <p className="mt-6 text-sm font-medium text-muted">Topic: {topic.title}</p>
            <h1
              id="gate-heading"
              className="mt-2 font-serif text-[30px] leading-[1.2] text-ink md:text-[40px]"
            >
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-[18px] text-body">{message}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              {actionLink && (
                <LinkButton href={actionLink}>
                  <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
                  {actionLabel}
                </LinkButton>
              )}
              <Button variant="outline" onClick={() => navigate(`/topics/${slug}`)}>
                Back to topic
              </Button>
            </div>
          </div>
        </section>
      </PageShell>
    );
  }

  // Success view
  if (isSuccess) {
    return (
      <PageShell>
        <section aria-labelledby="success-heading" className="bg-white">
          <div className="mx-auto max-w-content px-6 py-16 md:py-24">
            <div className="rounded-xl border border-line bg-tint/30 p-8 text-center md:p-12">
              <CheckCircle2 className="mx-auto h-12 w-12 text-success" aria-hidden="true" />
              <h1
                id="success-heading"
                className="mt-4 font-serif text-[28px] font-semibold text-ink md:text-[36px]"
              >
                Perspective Submitted
              </h1>
              <p className="mx-auto mt-3 max-w-lg text-base text-body">
                Your structured perspective for &ldquo;{topic.title}&rdquo; has been submitted and is
                now visible in the perspective list.
              </p>
              <div className="mt-8">
                <LinkButton href={`/topics/${slug}`}>
                  <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                  Back to {topic.title}
                </LinkButton>
              </div>
            </div>
          </div>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section aria-labelledby="submission-heading" className="bg-white pb-24">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              to={`/topics/${slug}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to topic
            </Link>
            {lastSaved && (
              <span className="text-xs text-muted" aria-live="polite">
                Draft saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          <p className="mt-6 text-sm font-medium text-muted">Topic: {topic.title}</p>
          <h1
            id="submission-heading"
            className="mt-2 font-serif text-[30px] leading-[1.2] text-ink md:text-[38px]"
          >
            Submit Perspective
          </h1>

          {/* Important note */}
          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-line bg-tint/50 p-4 text-sm text-body">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
            <span>
              <strong>Note:</strong> Perspectives cannot be edited after submission. Review your solution and trade-offs carefully before submitting.
            </span>
          </div>

          {/* Template Selection */}
          <div className="mt-8 rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <label htmlFor="template-select" className={labelClass}>
              Choose a starter template (optional)
            </label>
            <p className="text-xs text-muted mb-2">
              Select a blueprint to prepopulate structured fields for common answer types.
            </p>
            <select
              id="template-select"
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className={inputClass}
            >
              <option value="">None (start from scratch)</option>
              {PERSPECTIVE_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-8" noValidate>
            {submitError && (
              <div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
                {submitError}
              </div>
            )}

            {/* Proposed Solution */}
            <div>
              <label htmlFor="solution-input" className={labelClass}>
                Proposed Solution <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-muted mb-2">
                A concise summary of your solution or recommendation.
              </p>
              <textarea
                id="solution-input"
                rows={3}
                value={solution}
                maxLength={PERSPECTIVE_SOLUTION_MAX}
                onChange={(e) => setSolution(e.target.value)}
                placeholder="e.g. Implement cache-aside using Redis with TTL jitter to eliminate stampedes..."
                className={textareaClass}
                aria-describedby={errors.solution ? 'solution-error' : undefined}
                required
              />
              <div className="flex justify-between items-center">
                {errors.solution ? (
                  <p id="solution-error" className={errorClass}>
                    {errors.solution}
                  </p>
                ) : <span />}
                <p className={counterClass}>
                  {solution.length}/{PERSPECTIVE_SOLUTION_MAX}
                </p>
              </div>
            </div>

            {/* Explanation */}
            <div>
              <label htmlFor="explanation-input" className={labelClass}>
                Explanation <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-muted mb-2">
                Explain how the solution works, rationale, and key implementation mechanisms.
              </p>
              <textarea
                id="explanation-input"
                rows={6}
                value={explanation}
                maxLength={PERSPECTIVE_EXPLANATION_MAX}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Walk through the design, lifecycle, and operational factors..."
                className={textareaClass}
                aria-describedby={errors.explanation ? 'explanation-error' : undefined}
                required
              />
              <div className="flex justify-between items-center">
                {errors.explanation ? (
                  <p id="explanation-error" className={errorClass}>
                    {errors.explanation}
                  </p>
                ) : <span />}
                <p className={counterClass}>
                  {explanation.length}/{PERSPECTIVE_EXPLANATION_MAX}
                </p>
              </div>
            </div>

            {/* Advantages */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={labelClass}>
                  Advantages <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-muted">
                  {advantages.length}/{PERSPECTIVE_ADVANTAGES_MAX}
                </span>
              </div>
              <p className="text-xs text-muted mb-3">
                List 1 to 5 concrete strengths or scenarios where this approach shines.
              </p>
              <div className="space-y-2.5">
                {advantages.map((adv, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={adv}
                      maxLength={PERSPECTIVE_ITEM_MAX}
                      onChange={(e) => updateAdvantage(idx, e.target.value)}
                      placeholder={`Advantage ${idx + 1}`}
                      className={inputClass}
                      aria-label={`Advantage ${idx + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeAdvantage(idx)}
                      disabled={advantages.length === 1 && !adv}
                      className="rounded-lg border border-line px-3 text-muted hover:bg-tint hover:text-ink disabled:opacity-40"
                      aria-label={`Remove advantage ${idx + 1}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
              {errors.advantages && <p className={errorClass}>{errors.advantages}</p>}
              {advantages.length < PERSPECTIVE_ADVANTAGES_MAX && (
                <button
                  type="button"
                  onClick={addAdvantage}
                  className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-ink"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add another advantage
                </button>
              )}
            </div>

            {/* Limitations */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={labelClass}>
                  Limitations <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-muted">
                  {limitations.length}/{PERSPECTIVE_LIMITATIONS_MAX}
                </span>
              </div>
              <p className="text-xs text-muted mb-3">
                List 1 to 5 trade-offs, operational costs, or conditions where this approach falls short.
              </p>
              <div className="space-y-2.5">
                {limitations.map((lim, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={lim}
                      maxLength={PERSPECTIVE_ITEM_MAX}
                      onChange={(e) => updateLimitation(idx, e.target.value)}
                      placeholder={`Limitation ${idx + 1}`}
                      className={inputClass}
                      aria-label={`Limitation ${idx + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeLimitation(idx)}
                      disabled={limitations.length === 1 && !lim}
                      className="rounded-lg border border-line px-3 text-muted hover:bg-tint hover:text-ink disabled:opacity-40"
                      aria-label={`Remove limitation ${idx + 1}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
              {errors.limitations && <p className={errorClass}>{errors.limitations}</p>}
              {limitations.length < PERSPECTIVE_LIMITATIONS_MAX && (
                <button
                  type="button"
                  onClick={addLimitation}
                  className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-ink"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add another limitation
                </button>
              )}
            </div>

            {/* Code Snippets (Optional) */}
            <div className="rounded-xl border border-line bg-tint/20 p-5">
              <div className="flex items-center justify-between">
                <label className={labelClass}>Code Snippets (optional)</label>
                <span className="text-xs text-muted">
                  {codeSnippets.length}/{PERSPECTIVE_SNIPPETS_MAX}
                </span>
              </div>
              <p className="text-xs text-muted mb-3">
                Include relevant configuration, queries, or implementation examples.
              </p>

              <div className="space-y-4">
                {codeSnippets.map((snippet, idx) => (
                  <div key={idx} className="rounded-lg border border-line bg-white p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <select
                        value={snippet.language}
                        onChange={(e) => updateSnippet(idx, { language: e.target.value })}
                        className="h-9 rounded-lg border border-line bg-white px-3 text-xs font-medium text-ink"
                        aria-label={`Code snippet ${idx + 1} language`}
                      >
                        {CODE_LANGUAGES.map((lang) => (
                          <option key={lang} value={lang}>
                            {lang}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeSnippet(idx)}
                        className="rounded p-1 text-muted hover:bg-tint hover:text-ink"
                        aria-label={`Remove snippet ${idx + 1}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      value={snippet.code}
                      onChange={(e) => updateSnippet(idx, { code: e.target.value })}
                      placeholder="// Enter sample code or configuration here..."
                      className="w-full font-mono text-xs rounded border border-line p-2.5 text-ink focus:outline-none"
                      aria-label={`Code snippet ${idx + 1} code`}
                    />
                    {errors[`code_${idx}`] && (
                      <p className={errorClass}>{errors[`code_${idx}`]}</p>
                    )}
                  </div>
                ))}
              </div>

              {codeSnippets.length < PERSPECTIVE_SNIPPETS_MAX && (
                <button
                  type="button"
                  onClick={addSnippet}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-ink"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add a code snippet
                </button>
              )}
            </div>

            {/* Attachments (Optional) */}
            <div className="rounded-xl border border-line bg-tint/20 p-5">
              <div className="flex items-center justify-between">
                <label className={labelClass}>Attachments (optional)</label>
                <span className="text-xs text-muted">
                  {files.length}/{ATTACHMENT_MAX_FILES}
                </span>
              </div>
              <p className="text-xs text-muted mb-3">
                Max 3 files, up to 10 MB each. Allowed types: {ATTACHMENT_EXTENSIONS.join(' ')}
              </p>

              {files.length > 0 && (
                <ul className="mb-3 space-y-2">
                  {files.map((file, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between rounded-lg border border-line bg-white px-3.5 py-2 text-xs text-ink"
                    >
                      <span className="truncate max-w-xs">{file.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted">{formatBytes(file.size)}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="rounded p-1 text-muted hover:text-ink"
                          aria-label={`Remove file ${file.name}`}
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {files.length < ATTACHMENT_MAX_FILES && (
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-xs font-medium text-ink hover:bg-tint">
                  <Upload className="h-4 w-4 text-muted" aria-hidden="true" />
                  Upload files
                  <input
                    type="file"
                    multiple
                    className="sr-only"
                    onChange={(e) => handleFiles(e.target.files)}
                    accept={ATTACHMENT_EXTENSIONS.join(',')}
                  />
                </label>
              )}
              {errors.attachments && <p className={errorClass}>{errors.attachments}</p>}
            </div>

            {/* References (Optional) */}
            <div className="rounded-xl border border-line bg-tint/20 p-5">
              <div className="flex items-center justify-between">
                <label className={labelClass}>References (optional)</label>
                <span className="text-xs text-muted">
                  {references.length}/{PERSPECTIVE_REFERENCES_MAX}
                </span>
              </div>
              <p className="text-xs text-muted mb-3">
                Add up to 5 links to documentation, benchmarks, RFCs, or repository examples.
              </p>

              <div className="space-y-3">
                {references.map((ref, idx) => (
                  <div key={idx} className="rounded-lg border border-line bg-white p-3 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={ref.label}
                        onChange={(e) => updateReference(idx, { label: e.target.value })}
                        placeholder="Label (e.g. Official Documentation)"
                        className={inputClass}
                        aria-label={`Reference ${idx + 1} label`}
                      />
                      <button
                        type="button"
                        onClick={() => removeReference(idx)}
                        className="rounded-lg border border-line px-3 text-muted hover:bg-tint hover:text-ink"
                        aria-label={`Remove reference ${idx + 1}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                    <input
                      type="url"
                      value={ref.url}
                      onChange={(e) => updateReference(idx, { url: e.target.value })}
                      placeholder="https://example.com/spec"
                      className={inputClass}
                      aria-label={`Reference ${idx + 1} URL`}
                    />
                    {errors[`ref_${idx}`] && (
                      <p className={errorClass}>{errors[`ref_${idx}`]}</p>
                    )}
                  </div>
                ))}
              </div>

              {references.length < PERSPECTIVE_REFERENCES_MAX && (
                <button
                  type="button"
                  onClick={addReference}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-ink"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add a reference URL
                </button>
              )}
            </div>

            {/* Anonymous Toggle */}
            <div className="pt-2">
              <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium text-ink">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                  className="h-4 w-4 rounded accent-black"
                />
                Submit anonymously (hide your username from public view)
              </label>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
              <LinkButton href={`/topics/${slug}`} variant="outline">
                Cancel
              </LinkButton>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Submitting Perspective...' : 'Submit Perspective'}
              </Button>
            </div>
          </form>
        </div>
      </section>
    </PageShell>
  );
}

export default SubmitPerspectivePage;
