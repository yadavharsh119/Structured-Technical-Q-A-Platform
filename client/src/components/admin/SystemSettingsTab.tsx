import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '../ui/Button';
import { SuccessBanner } from './SuccessBanner';
import { DEFAULT_SYSTEM_SETTINGS, type SystemSettings } from '../../data/mockAdmin';

const labelClass = 'mb-1 block text-xs font-semibold text-ink';
const fieldClass =
  'w-full rounded-lg border border-line bg-white p-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-black';

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  value: string | number;
  type?: 'number' | 'text';
  onChange: (value: string) => void;
}

function Field({ id, label, hint, value, type = 'number', onChange }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        min={type === 'number' ? 0 : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={fieldClass}
      />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function SystemSettingsTab() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  const [banner, setBanner] = useState<string | null>(null);

  const update = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setBanner('System settings saved.');
  };

  return (
    <div className="space-y-6">
      {banner && <SuccessBanner message={banner} onDismiss={() => setBanner(null)} />}

      <form
        onSubmit={handleSave}
        className="rounded-xl border border-line bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      >
        <div className="flex items-center gap-2 border-b border-line pb-3">
          <Settings className="h-5 w-5 text-ink" aria-hidden="true" />
          <h2 className="font-serif text-lg font-semibold text-ink">System Settings</h2>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            id="max-file-size"
            label="Max file upload size (MB)"
            value={settings.maxFileSizeMb}
            onChange={(v) => update('maxFileSizeMb', Number(v))}
          />
          <Field
            id="max-attachments"
            label="Max attachments per question"
            value={settings.maxAttachments}
            onChange={(v) => update('maxAttachments', Number(v))}
          />
          <div className="sm:col-span-2">
            <Field
              id="allowed-file-types"
              label="Allowed file types"
              type="text"
              hint="Comma separated list of extensions."
              value={settings.allowedFileTypes}
              onChange={(v) => update('allowedFileTypes', v)}
            />
          </div>
          <Field
            id="session-timeout"
            label="Session timeout (minutes)"
            value={settings.sessionTimeoutMinutes}
            onChange={(v) => update('sessionTimeoutMinutes', Number(v))}
          />
          <Field
            id="min-password-length"
            label="Minimum password length"
            value={settings.minPasswordLength}
            onChange={(v) => update('minPasswordLength', Number(v))}
          />
          <Field
            id="spam-threshold"
            label="Spam threshold"
            hint="Reports needed before content is auto-flagged for review."
            value={settings.spamThreshold}
            onChange={(v) => update('spamThreshold', Number(v))}
          />
        </div>

        <div className="mt-6 flex justify-end border-t border-line pt-4">
          <Button type="submit" className="py-2 text-xs">
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
