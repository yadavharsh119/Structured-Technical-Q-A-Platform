"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import type {
  ActivityItem,
  InsightCardData,
  MetricCardData,
  UserProfile,
} from "@/lib/types";
import { formatMetric } from "@/lib/utils";

interface OverviewScreenProps {
  profile: UserProfile;
  metrics: MetricCardData[];
  activity: ActivityItem[];
  insights: InsightCardData[];
}

export function OverviewScreen({
  profile,
  metrics,
  activity,
  insights,
}: OverviewScreenProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="space-y-8">
        <PageHeader
          eyebrow="Overview"
          title={`Welcome back, ${profile.name.split(" ")[0]}.`}
          description="The product shell is in place with typed seams for future platform modules, identity, and intelligent system workflows."
          actions={
            <Button variant="secondary" onClick={() => setOpen(true)}>
              Create first model
            </Button>
          }
        />
        <section className="grid gap-5 xl:grid-cols-3">
          {metrics.map((metric) => (
            <Card key={metric.id} className="h-full">
              <p className="text-sm text-[var(--foreground-muted)]">{metric.label}</p>
              <p className="mt-4 text-4xl font-semibold tracking-tight text-white">
                {formatMetric(metric.value)}
              </p>
              <p className="mt-3 text-sm text-sky-100">{metric.delta}</p>
              <p className="mt-5 text-sm leading-7 text-[var(--foreground-muted)]">{metric.detail}</p>
            </Card>
          ))}
        </section>
        <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <Card className="space-y-5">
            <div>
              <p className="text-lg font-medium text-white">Recent activity</p>
              <p className="mt-2 text-sm text-[var(--foreground-muted)]">
                A concise activity lane helps operators inspect what changed without losing context.
              </p>
            </div>
            {activity.length ? (
              <div className="space-y-4">
                {activity.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{item.title}</p>
                        <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">{item.description}</p>
                      </div>
                      <span
                        className={
                          item.tone === "positive"
                            ? "mt-1 size-2 rounded-full bg-emerald-300"
                            : item.tone === "attention"
                              ? "mt-1 size-2 rounded-full bg-amber-300"
                              : "mt-1 size-2 rounded-full bg-slate-400"
                        }
                      />
                    </div>
                    <p className="mt-4 text-xs tracking-[0.18em] text-slate-400 uppercase">{item.timestamp}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No activity yet"
                description="Activity will appear here once operators begin shaping models and review flows."
                actionLabel="Refresh"
                action={() => undefined}
              />
            )}
          </Card>
          <div className="space-y-5">
            {insights.map((insight) => (
              <Card key={insight.id} variant="glass" className="h-full">
                <p className="text-xs font-semibold tracking-[0.22em] text-sky-200 uppercase">{insight.eyebrow}</p>
                <p className="mt-4 text-xl font-medium text-white">{insight.title}</p>
                <p className="mt-4 text-sm leading-7 text-[var(--foreground-muted)]">{insight.body}</p>
              </Card>
            ))}
          </div>
        </section>
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Model creation is the next module"
        description="This first milestone establishes the product shell and reusable UI foundation. The modal is here to prove the interaction pattern."
      >
        <p className="text-sm leading-6 text-[var(--foreground-muted)]">
          The future human-modeling workspace can attach here as a dedicated feature area with its own routes, forms, and
          data hooks.
        </p>
      </Modal>
    </>
  );
}
