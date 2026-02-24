"use client";

import { CopyButton } from "./copy-button";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export function CodeBlock({ code, className }: CodeBlockProps) {
  return (
    <div
      className={cn(
        "relative rounded-lg border border-neutral-200 bg-neutral-50",
        className
      )}
    >
      <div className="absolute right-2 top-2">
        <CopyButton value={code} />
      </div>
      <pre className="overflow-x-auto p-4 text-sm">
        <code className="font-mono text-neutral-800">{code}</code>
      </pre>
    </div>
  );
}
