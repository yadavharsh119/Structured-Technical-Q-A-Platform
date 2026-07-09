"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Divider } from "@/components/ui/divider";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { SettingsSection, UserProfile } from "@/lib/types";

interface SettingsScreenProps {
  profile: UserProfile;
  sections: SettingsSection[];
}

type FormValues = Record<string, string>;

export function SettingsScreen({ profile, sections }: SettingsScreenProps) {
  const [values, setValues] = useState<FormValues>(() =>
    Object.fromEntries(
      sections.flatMap((section) =>
        section.fields.map((field) => [field.id, field.value]),
      ),
    ),
  );
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const handleChange = (fieldId: string, value: string) => {
    setSaved(false);
    setValues((current) => ({
      ...current,
      [fieldId]: value,
    }));
  };

  const handleSave = () => {
    startTransition(() => {
      window.setTimeout(() => {
        setSaved(true);
      }, 750);
    });
  };

  return (
    <>
      <div className="space-y-8">
        <PageHeader
          eyebrow="Settings"
          title="Account and workspace defaults"
          description="Simple, consistent form patterns for identity and product preferences make the platform easier to scale."
          actions={
            <>
              <Button variant="ghost" onClick={() => setModalOpen(true)}>
                Reset preview
              </Button>
              <Button variant="secondary" onClick={handleSave} loading={isPending}>
                Save changes
              </Button>
            </>
          }
        />
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            {sections.map((section) => (
              <Card key={section.id}>
                <div className="flex flex-col gap-2">
                  <p className="text-lg font-medium text-white">{section.title}</p>
                  <p className="text-sm leading-6 text-[var(--foreground-muted)]">{section.description}</p>
                </div>
                <Divider className="my-6" />
                <div className="grid gap-5 sm:grid-cols-2">
                  {section.fields.map((field) => (
                    <Input
                      key={field.id}
                      id={field.id}
                      label={field.label}
                      value={values[field.id] ?? ""}
                      onChange={(event) => handleChange(field.id, event.target.value)}
                      hint={field.hint}
                      type={field.type ?? "text"}
                      placeholder={field.placeholder}
                    />
                  ))}
                </div>
              </Card>
            ))}
          </div>
          <div className="space-y-5">
            <Card variant="glass">
              <p className="text-sm font-medium text-white">Operator snapshot</p>
              <p className="mt-4 text-2xl font-semibold tracking-tight text-white">{profile.name}</p>
              <p className="mt-2 text-sm text-[var(--foreground-muted)]">{profile.email}</p>
              <div className="mt-6 space-y-3 text-sm text-[var(--foreground-muted)]">
                <p>Role: {profile.role}</p>
                <p>Team: {profile.team}</p>
                <p>Timezone: {profile.timezone}</p>
              </div>
            </Card>
            <Card>
              <p className="text-sm font-medium text-white">Status</p>
              <p className="mt-3 text-sm leading-6 text-[var(--foreground-muted)]">
                This save flow is intentionally mocked but shaped like a future async settings update action.
              </p>
              {saved ? (
                <p className="mt-4 rounded-2xl border border-emerald-300/18 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                  Changes saved in the frontend preview state.
                </p>
              ) : (
                <p className="mt-4 rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-[var(--foreground-muted)]">
                  No unsynced backend writes yet. Values stay local until the service layer is attached.
                </p>
              )}
            </Card>
          </div>
        </div>
      </div>
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Reset preview state"
        description="This resets only the local form state in the frontend preview."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              setValues(
                Object.fromEntries(
                  sections.flatMap((section) =>
                    section.fields.map((field) => [field.id, field.value]),
                  ),
                ),
              );
              setSaved(false);
              setModalOpen(false);
            }}
          >
            Reset values
          </Button>
        </div>
      </Modal>
    </>
  );
}
