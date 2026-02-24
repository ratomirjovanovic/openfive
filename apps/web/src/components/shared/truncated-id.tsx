import { CopyButton } from "./copy-button";

interface TruncatedIdProps {
  id: string;
  length?: number;
}

export function TruncatedId({ id, length = 8 }: TruncatedIdProps) {
  const truncated = id.slice(0, length);
  return (
    <span className="inline-flex items-center gap-1">
      <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs text-neutral-600">
        {truncated}...
      </code>
      <CopyButton value={id} />
    </span>
  );
}
