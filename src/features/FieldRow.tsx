export function Field({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="field-grid grid gap-x-3 py-2 text-xs border-b border-edge last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground break-all">
        {value === '' ? '未确认' : value}
        {hint ? <span className="ml-1.5 text-muted-foreground">({hint})</span> : null}
      </span>
    </div>
  );
}
