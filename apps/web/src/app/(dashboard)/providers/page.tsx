"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plug, Plus } from "lucide-react";

export default function ProvidersPage() {
  const [showConnect, setShowConnect] = useState(false);
  const [providerType, setProviderType] = useState("openrouter");

  const defaultBaseUrls: Record<string, string> = {
    openrouter: "https://openrouter.ai/api/v1",
    ollama: "http://localhost:11434/v1",
    openai_compatible: "",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Providers"
        description="Connect and manage your LLM provider backends."
        action={
          <Button onClick={() => setShowConnect(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Connect provider
          </Button>
        }
      />

      <EmptyState
        icon={<Plug className="h-10 w-10" />}
        title="No providers connected"
        description="Connect OpenRouter, Ollama, or any OpenAI-compatible provider to start routing requests."
        actionLabel="Connect provider"
        onAction={() => setShowConnect(true)}
      />

      <Dialog open={showConnect} onOpenChange={setShowConnect}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Connect a provider</DialogTitle>
            <DialogDescription>
              Add an LLM provider to route requests through the gateway.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Provider type</Label>
              <Select value={providerType} onValueChange={(v) => setProviderType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openrouter">OpenRouter</SelectItem>
                  <SelectItem value="ollama">Ollama (Local)</SelectItem>
                  <SelectItem value="openai_compatible">OpenAI-compatible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Display name</Label>
              <Input placeholder="My OpenRouter" />
            </div>
            <div className="space-y-2">
              <Label>Base URL</Label>
              <Input
                placeholder="https://..."
                defaultValue={defaultBaseUrls[providerType]}
              />
            </div>
            {providerType !== "ollama" && (
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input type="password" placeholder="sk-or-..." />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConnect(false)}>
              Cancel
            </Button>
            <Button>Test & Connect</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
