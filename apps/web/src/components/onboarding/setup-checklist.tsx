"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ArrowRight, X } from "lucide-react";
import { useOnboarding } from "@/hooks/use-onboarding";

export function SetupChecklist() {
  const { steps, completedCount, progress, showChecklist, dismiss } =
    useOnboarding();

  if (!showChecklist) return null;

  return (
    <Card className="border-neutral-200 shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-neutral-900">
              Get started with OpenFive
            </CardTitle>
            <p className="mt-0.5 text-sm text-neutral-500">
              Complete these steps to set up your LLM gateway.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={dismiss}
            className="h-8 w-8 p-0 text-neutral-400 hover:text-neutral-600"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 rounded-full bg-neutral-100">
            <div
              className="h-2 rounded-full bg-neutral-900 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-medium text-neutral-500">
            {completedCount}/{steps.length}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {steps.map((step) => (
            <Link
              key={step.id}
              href={step.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-neutral-50"
            >
              {step.completed ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-neutral-300" />
              )}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    step.completed
                      ? "text-neutral-400 line-through"
                      : "text-neutral-900"
                  }`}
                >
                  {step.title}
                </p>
                {!step.completed && (
                  <p className="text-xs text-neutral-500">{step.description}</p>
                )}
              </div>
              {!step.completed && (
                <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400" />
              )}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
