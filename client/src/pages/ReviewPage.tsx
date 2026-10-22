export function ReviewPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900" data-testid="review-placeholder">
          Review queue
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          The moderation review queue is not built yet. This placeholder confirms your session and
          role-based access.
        </p>
      </div>
    </div>
  );
}
