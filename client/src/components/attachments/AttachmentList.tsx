import { Paperclip } from 'lucide-react';
import type { AttachmentDto } from '@structured-qa/shared';
import { attachmentDownloadUrl } from '../../api/attachments';
import { formatFileSize } from '../../lib/fileSize';

interface Props {
  attachments: AttachmentDto[];
  className?: string;
}

export function AttachmentList({ attachments, className = '' }: Props) {
  if (attachments.length === 0) return null;

  return (
    <div className={className}>
      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
        <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
        Attachments
      </h4>
      <ul className="mt-2 space-y-1.5" aria-label="Attachments">
        {attachments.map((attachment) => (
          <li
            key={attachment.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm"
            data-testid="attachment-link-item"
          >
            <span className="min-w-0 break-all text-body">{attachment.name}</span>
            <span className="flex shrink-0 items-center gap-3 text-xs text-muted">
              <span>{formatFileSize(attachment.size)}</span>
              <a
                href={attachmentDownloadUrl(attachment.id)}
                download
                className="font-medium text-ink underline hover:text-secondary"
                data-testid="attachment-download-link"
              >
                Download
              </a>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
