import { AlertCircle, LoaderCircle, FolderOpen } from 'lucide-react';
import { Button } from './button';

export function Feedback({ kind = 'empty', title, description, actionLabel, onAction }) {
  const Icon = kind === 'error' ? AlertCircle : kind === 'loading' ? LoaderCircle : FolderOpen;
  return (
    <div className="rounded-lg border border-border bg-card p-6 text-card-foreground">
      <div role={kind === 'error' ? 'alert' : 'status'} className="flex items-start gap-3">
        <Icon aria-hidden="true" className={`mt-0.5 h-5 w-5 shrink-0 ${kind === 'error' ? 'text-destructive' : 'text-muted-foreground'} ${kind === 'loading' ? 'motion-safe:animate-spin' : ''}`} />
        <div className="min-w-0">
          <p className="text-base font-semibold">{title}</p>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {onAction && actionLabel && (
        <Button type="button" variant="outline" onClick={onAction} className="mt-4">{actionLabel}</Button>
      )}
    </div>
  );
}
