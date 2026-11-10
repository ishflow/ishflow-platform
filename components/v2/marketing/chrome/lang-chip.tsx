import { ChevronDown } from 'lucide-react';

export function V2LangChip({ label }: { label: string }) {
  return (
    <span className="lang-chip">
      {label}
      <ChevronDown size={12} strokeWidth={2} />
    </span>
  );
}
