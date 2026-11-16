import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Info, LogIn, Plus, Trash2 } from 'lucide-react';
import {
  PERSPECTIVE_ADVANTAGES_MAX,
  PERSPECTIVE_EXPLANATION_MAX,
  PERSPECTIVE_ITEM_MAX,
  PERSPECTIVE_LIMITATIONS_MAX,
  PERSPECTIVE_REFERENCES_MAX,
  PERSPECTIVE_SNIPPETS_MAX,
  PERSPECTIVE_SOLUTION_MAX,
  perspectiveCreateSchema,
} from '@structured-qa/shared';
import { PageShell } from '../components/layout/PageShell';
import { AttachmentPicker } from '../components/attachments/AttachmentPicker';
import { Button, LinkButton } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { getTopic } from '../api/topics';
import { createPerspective, listPerspectives } from '../api/perspectives';
import { PERSPECTIVE_TEMPLATES } from '../data/perspectiveTemplates';
import {
  clearPerspectiveDraft,
  loadPerspectiveDraft,
  usePerspectiveDraft,
} from '../hooks/usePerspectiveDraft';
import type { Topic } from '../api/types';
import { NotFoundPage } from './NotFoundPage';

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

interface Snippet {
  language: string;
  code: string;
}

export function SubmitPerspectivePage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [topic, setTopic] = useState<Topic | null>(null);
  const [topicLoading, setTopicLoading] = useState(true);
  const [topicNotFound, setTopicNotFound] = useState(false);
  const [topicError, setTopicError] = useState<string | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const [proposedSolution, setProposedSolution] = useState('');
  const [explanation, setExplanation] = useState('');
  const [advantages, setAdvantages] = useState<string[]>(['']);
  const [limitations, setLimitations] = useState<string[]>(['']);
  const [codeSnippets, setCodeSnippets] = useState<Snippet[]>([]);
  const [references, setReferences] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attachmentIds, setAttachmentIds] = useState<string[]>([]);
  const [attachmentsUploading, setAttachmentsUploading] = useState(false);

  const { lastSaved } = usePerspectiveDraft(slug, {
    proposedSolution,
    explanation,
    advantages,
    limitations,
    codeSnippets,
    references,
  });

  useEffect(() => {
    let cancelled = false;
    setTopicLoading(true);
    setTopicNotFound(false);
    setTopicError(null);

    getTopic(slug).then((response) => {
      if (cancelled) return;
      if (!response.success) {
        if (response.error.code === 'TOPIC_NOT_FOUND') {
          setTopicNotFound(true);
        } else {
          setTopicError(response.error.message);
        }
        setTopicLoading(false);
        return;
      }

      if ('redirectTo' in response.data) {
        navigate(`/topics/${response.data.redirectTo.slug}/perspectives/new`, {
          replace: true,
        });
        setTopicLoading(false);
        return;
      }

      const loadedTopic = response.data.topic;
      if (loadedTopic.slug !== slug) {
        navigate(`/topics/${loadedTopic.slug}/perspectives/new`, { replace: true });
        setTopicLoading(false);
        return;
      }

      setTopic(loadedTopic);
      listPerspectives(slug, 'newest').then((listResponse) => {
        if (cancelled) return;
        if (listResponse.success && user) {
          setAlreadySubmitted(
            listResponse.data.perspectives.some((p) => p.authorUsername === user.username),
          );
        }
        setTopicLoading(false);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [slug, user, navigate]);

  useEffect(() => {
    const saved = loadPerspectiveDraft(slug);
    if (!saved) return;
    setProposedSolution(saved.proposedSolution);
    setExplanation(saved.explanation);
    if (saved.advantages.length > 0) setAdvantages(saved.advantages);
    if (saved.limitations.length > 0) setLimitations(saved.limitations);
    setCodeSnippets(saved.codeSnippets);
    setReferences(saved.references);
  }, [slug]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = PERSPECTIVE_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setProposedSolution(template.proposedSolution);
      setExplanation(template.explanation);
      setAdvantages([...template.advantages]);
      setLimitations([...template.limitations]);
    }
  };

  const updateAdvantage = (index: number, value: string) => {
    setAdvantages((prev) => prev.map((item, i) => (i === index ? value : item)));
  };
  const addAdvantage = () => {
    if (advantages.length < PERSPECTIVE_ADVANTAGES_MAX) {
      setAdvantages((prev) => [...prev, '']);
    }
  };
  const removeAdvantage = (index: number) => {
    setAdvantages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [''];
    });
  };

  const updateLimitation = (index: number, value: string) => {
    setLimitations((prev) => prev.map((item, i) => (i === index ? value : item)));
  };
  const addLimitation = () => {
    if (limitations.length < PERSPECTIVE_LIMITATIONS_MAX) {
      setLimitations((prev) => [...prev, '']);
    }
  };
  const removeLimitation = (index: number) => {
    setLimitations((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [''];
    });
  };

  const addSnippet = () => {
    if (codeSnippets.length < PERSPECTIVE_SNIPPETS_MAX) {
      setCodeSnippets((prev) => [...prev, { language: 'typescript', code: '' }]);
    }
  };
  const updateSnippet = (index: number, patch: Partial<Snippet>) => {
    setCodeSnippets((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  };
  const removeSnippet = (index: number) => {
    setCodeSnippets((prev) => prev.filter((_, i) => i !== index));
  };

  const addReference = () => {
    if (references.length < PERSPECTIVE_REFERENCES_MAX) {
      setReferences((prev) => [...prev, '']);
    }
  };
  const updateReference = (index: number, value: string) => {
    setReferences((prev) => prev.map((item, i) => (i === index ? value : item)));
  };
  const removeReference = (index: number) => {
    setReferences((prev) => prev.filter((_, i) => i !== index));
  };

  const errorFor = (prefix: string): string | undefined =>
    Object.entries(errors).find(
      ([key]) => key === prefix || key.startsWith(`${prefix}.`),
    )?.[1];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    const payload = {
      proposedSolution,
      explanation,
      advantages: advantages.map((a) => a.trim()).filter(Boolean),
      limitations: limitations.map((l) => l.trim()).filter(Boolean),
      codeSnippets,
      references,
      attachmentIds,
    };

    const parsed = perspectiveCreateSchema.safeParse(payload);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.map(String).join('.');
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    const response = await createPerspective(slug, parsed.data);
    setSubmitting(false);

    if (!response.success) {
      setSubmitError(response.error.message);
      return;
    }

    clearPerspectiveDraft(slug);
    navigate(`/topics/${slug}`, { state: { perspectiveSubmitted: true } });
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

  if (topicNotFound) return <NotFoundPage message="Topic not found." />;

  if (topicError) {
    return (
      <PageShell>
        <div className="mx-auto max-w-content px-6 py-16 md:py-24">
          <div
            role="alert"
            data-testid="perspective-topic-error"
            className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-800"
          >
            {topicError}
          </div>
        </div>
      </PageShell>
    );
  }

  if (!topic) return <NotFoundPage message="Topic not found." />;

  const isGuest = user === null;
  const isUnverified = user !== null && !user.emailVerified;
  const isArchived = topic.status === 'archived';

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
    } else {
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
              <LinkButton href={`/topics/${slug}`} variant="outline">
                Back to topic
              </LinkButton>
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
              data-testid="perspective-back-link"
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

          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-line bg-tint/50 p-4 text-sm text-body">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
            <span>
              <strong>Note:</strong> Perspectives cannot be edited after submission. Review your
              solution and trade-offs carefully before submitting.
            </span>
          </div>

          <div className="mt-8 rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <label htmlFor="template-select" className={labelClass}>
              Choose a starter template (optional)
            </label>
            <p className="mb-2 text-xs text-muted">
              Select a blueprint to prepopulate structured fields for common answer types.
            </p>
            <select
              id="template-select"
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              data-testid="perspective-template-select"
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
            {submitError ? (
              <div
                role="alert"
                data-testid="perspective-error"
                className="rounded-lg bg-red-50 p-4 text-sm text-red-700"
              >
                {submitError}
              </div>
            ) : Object.keys(errors).length > 0 ? (
              <div
                role="alert"
                data-testid="perspective-error"
                className="rounded-lg bg-red-50 p-4 text-sm text-red-700"
              >
                Please fix the highlighted fields and try again.
              </div>
            ) : null}

            <div>
              <label htmlFor="solution-input" className={labelClass}>
                Proposed Solution <span className="text-red-500">*</span>
              </label>
              <p className="mb-2 text-xs text-muted">
                A concise summary of your solution or recommendation.
              </p>
              <textarea
                id="solution-input"
                rows={3}
                value={proposedSolution}
                maxLength={PERSPECTIVE_SOLUTION_MAX}
                onChange={(e) => setProposedSolution(e.target.value)}
                placeholder="e.g. Implement cache-aside using Redis with TTL jitter to eliminate stampedes..."
                className={textareaClass}
                aria-describedby={errors.proposedSolution ? 'solution-error' : undefined}
                data-testid="perspective-solution-input"
                required
              />
              <div className="flex items-center justify-between">
                {errors.proposedSolution ? (
                  <p id="solution-error" className={errorClass}>
                    {errors.proposedSolution}
                  </p>
                ) : (
                  <span />
                )}
                <p className={counterClass}>
                  {proposedSolution.length}/{PERSPECTIVE_SOLUTION_MAX}
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="explanation-input" className={labelClass}>
                Explanation <span className="text-red-500">*</span>
              </label>
              <p className="mb-2 text-xs text-muted">
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
                data-testid="perspective-explanation-input"
                required
              />
              <div className="flex items-center justify-between">
                {errors.explanation ? (
                  <p id="explanation-error" className={errorClass}>
                    {errors.explanation}
                  </p>
                ) : (
                  <span />
                )}
                <p className={counterClass}>
                  {explanation.length}/{PERSPECTIVE_EXPLANATION_MAX}
                </p>
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className={labelClass}>
                  Advantages <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-muted">
                  {advantages.length}/{PERSPECTIVE_ADVANTAGES_MAX}
                </span>
              </div>
              <p className="mb-3 text-xs text-muted">
                List 1 to 5 concrete strengths or scenarios where this approach shines.
              </p>
              <div className="space-y-2.5">
                {advantages.map((advantage, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={advantage}
                      maxLength={PERSPECTIVE_ITEM_MAX}
                      onChange={(e) => updateAdvantage(index, e.target.value)}
                      placeholder={`Advantage ${index + 1}`}
                      className={inputClass}
                      aria-label={`Advantage ${index + 1}`}
                      data-testid="perspective-advantage-input"
                    />
                    <button
                      type="button"
                      onClick={() => removeAdvantage(index)}
                      disabled={advantages.length === 1 && !advantage}
                      className="rounded-lg border border-line px-3 text-muted hover:bg-tint hover:text-ink disabled:opacity-40"
                      aria-label={`Remove advantage ${index + 1}`}
                      data-testid="perspective-remove-advantage-button"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
              {errorFor('advantages') && <p className={errorClass}>{errorFor('advantages')}</p>}
              {advantages.length < PERSPECTIVE_ADVANTAGES_MAX && (
                <button
                  type="button"
                  onClick={addAdvantage}
                  data-testid="perspective-add-advantage-button"
                  className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-ink"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add another advantage
                </button>
              )}
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className={labelClass}>
                  Limitations <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-muted">
                  {limitations.length}/{PERSPECTIVE_LIMITATIONS_MAX}
                </span>
              </div>
              <p className="mb-3 text-xs text-muted">
                List 1 to 5 trade-offs, operational costs, or conditions where this approach falls
                short.
              </p>
              <div className="space-y-2.5">
                {limitations.map((limitation, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={limitation}
                      maxLength={PERSPECTIVE_ITEM_MAX}
                      onChange={(e) => updateLimitation(index, e.target.value)}
                      placeholder={`Limitation ${index + 1}`}
                      className={inputClass}
                      aria-label={`Limitation ${index + 1}`}
                      data-testid="perspective-limitation-input"
                    />
                    <button
                      type="button"
                      onClick={() => removeLimitation(index)}
                      disabled={limitations.length === 1 && !limitation}
                      className="rounded-lg border border-line px-3 text-muted hover:bg-tint hover:text-ink disabled:opacity-40"
                      aria-label={`Remove limitation ${index + 1}`}
                      data-testid="perspective-remove-limitation-button"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
              {errorFor('limitations') && (
                <p className={errorClass}>{errorFor('limitations')}</p>
              )}
              {limitations.length < PERSPECTIVE_LIMITATIONS_MAX && (
                <button
                  type="button"
                  onClick={addLimitation}
                  data-testid="perspective-add-limitation-button"
                  className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-ink"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add another limitation
                </button>
              )}
            </div>

            <div className="rounded-xl border border-line bg-tint/20 p-5">
              <div className="flex items-center justify-between">
                <label className={labelClass}>Code Snippets (optional)</label>
                <span className="text-xs text-muted">
                  {codeSnippets.length}/{PERSPECTIVE_SNIPPETS_MAX}
                </span>
              </div>
              <p className="mb-3 text-xs text-muted">
                Include relevant configuration, queries, or implementation examples.
              </p>

              <div className="space-y-4">
                {codeSnippets.map((snippet, index) => (
                  <div key={index} className="rounded-lg border border-line bg-white p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <select
                        value={snippet.language}
                        onChange={(e) => updateSnippet(index, { language: e.target.value })}
                        className="h-9 rounded-lg border border-line bg-white px-3 text-xs font-medium text-ink"
                        aria-label={`Code snippet ${index + 1} language`}
                        data-testid="perspective-snippet-language"
                      >
                        {CODE_LANGUAGES.map((lang) => (
                          <option key={lang} value={lang}>
                            {lang}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeSnippet(index)}
                        className="rounded p-1 text-muted hover:bg-tint hover:text-ink"
                        aria-label={`Remove snippet ${index + 1}`}
                        data-testid="perspective-remove-snippet-button"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      value={snippet.code}
                      maxLength={5000}
                      onChange={(e) => updateSnippet(index, { code: e.target.value })}
                      placeholder="// Enter sample code or configuration here..."
                      className="w-full rounded border border-line p-2.5 font-mono text-xs text-ink focus:outline-none"
                      aria-label={`Code snippet ${index + 1} code`}
                      data-testid="perspective-snippet-code"
                    />
                    {errors[`codeSnippets.${index}.code`] && (
                      <p className={errorClass}>{errors[`codeSnippets.${index}.code`]}</p>
                    )}
                  </div>
                ))}
              </div>

              {codeSnippets.length < PERSPECTIVE_SNIPPETS_MAX && (
                <button
                  type="button"
                  onClick={addSnippet}
                  data-testid="perspective-add-snippet-button"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-ink"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add a code snippet
                </button>
              )}
            </div>

            <div className="rounded-xl border border-line bg-tint/20 p-5">
              <div className="flex items-center justify-between">
                <label className={labelClass}>References (optional)</label>
                <span className="text-xs text-muted">
                  {references.length}/{PERSPECTIVE_REFERENCES_MAX}
                </span>
              </div>
              <p className="mb-3 text-xs text-muted">
                Add up to 5 links to documentation, benchmarks, RFCs, or repository examples.
              </p>

              <div className="space-y-3">
                {references.map((reference, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={reference}
                        maxLength={500}
                        onChange={(e) => updateReference(index, e.target.value)}
                        placeholder="https://example.com/spec"
                        className={inputClass}
                        aria-label={`Reference ${index + 1} URL`}
                        data-testid="perspective-reference-input"
                      />
                      <button
                        type="button"
                        onClick={() => removeReference(index)}
                        className="rounded-lg border border-line px-3 text-muted hover:bg-tint hover:text-ink"
                        aria-label={`Remove reference ${index + 1}`}
                        data-testid="perspective-remove-reference-button"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                    {errors[`references.${index}`] && (
                      <p className={errorClass}>{errors[`references.${index}`]}</p>
                    )}
                  </div>
                ))}
              </div>

              {references.length < PERSPECTIVE_REFERENCES_MAX && (
                <button
                  type="button"
                  onClick={addReference}
                  data-testid="perspective-add-reference-button"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-ink"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add a reference URL
                </button>
              )}
            </div>

            <div className="rounded-xl border border-line bg-tint/20 p-5">
              <AttachmentPicker
                onChange={(ids, uploading) => {
                  setAttachmentIds(ids);
                  setAttachmentsUploading(uploading);
                }}
              />
              {errorFor('attachmentIds') && (
                <p className={errorClass}>{errorFor('attachmentIds')}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
              <LinkButton href={`/topics/${slug}`} variant="outline" data-testid="perspective-cancel-link">
                Cancel
              </LinkButton>
              <Button
                type="submit"
                disabled={submitting || attachmentsUploading}
                data-testid="perspective-submit-button"
              >
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
