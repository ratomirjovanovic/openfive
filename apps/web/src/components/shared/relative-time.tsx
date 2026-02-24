"use client";

import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

interface RelativeTimeProps {
  date: string | Date;
}

export function RelativeTime({ date }: RelativeTimeProps) {
  const [relative, setRelative] = useState("");
  const dateObj = typeof date === "string" ? new Date(date) : date;

  useEffect(() => {
    setRelative(getRelativeTime(dateObj));
    const interval = setInterval(() => {
      setRelative(getRelativeTime(dateObj));
    }, 60000);
    return () => clearInterval(interval);
  }, [dateObj]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <time
          dateTime={dateObj.toISOString()}
          className="text-sm text-neutral-500"
        >
          {relative}
        </time>
      </TooltipTrigger>
      <TooltipContent>
        {dateObj.toLocaleString()}
      </TooltipContent>
    </Tooltip>
  );
}
