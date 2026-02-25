"use client";

import { useState, useMemo, useCallback } from "react";
import { useAppContext } from "@/providers/context-provider";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { CodeBlock } from "@/components/shared/code-block";
import { CopyButton } from "@/components/shared/copy-button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Plus,
  Search,
  Tag,
  Variable,
  Eye,
  Pencil,
  Trash2,
  History,
  Copy,
  CheckCircle2,
  Globe,
  X,
  ArrowLeft,
  Loader2,
  Braces,
  Sparkles,
  Play,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TemplateVariable {
  name: string;
  type: "string" | "number" | "boolean" | "json";
  default?: string;
  required: boolean;
  description?: string;
}

interface PromptTemplate {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  content: string;
  variables: TemplateVariable[];
  model_hint: string | null;
  temperature: number | null;
  max_tokens: number | null;
  tags: string[];
  version: number;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface TemplateVersion {
  id: string;
  template_id: string;
  version: number;
  content: string;
  variables: TemplateVariable[];
  change_note: string | null;
  created_by: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function renderTemplate(content: string, variables: Record<string, string>): string {
  let rendered = content;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), value);
  }
  return rendered;
}

function extractVariablesFromContent(content: string): string[] {
  const matches = content.match(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g);
  if (!matches) return [];
  const names = matches.map((m) => m.replace(/\{\{\s*|\s*\}\}/g, ""));
  return [...new Set(names)];
}

function generateCurlSnippet(template: PromptTemplate): string {
  const vars = template.variables
    .map((v) => `    "${v.name}": "${v.default || `<${v.name}>`}"`)
    .join(",\n");
  return `curl -X POST /api/v1/organizations/{orgId}/templates/${template.id}/render \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
  "variables": {
${vars}
  }
}'`;
}

function generateSdkSnippet(template: PromptTemplate): string {
  const varObj = template.variables
    .map((v) => `  ${v.name}: "${v.default || `<${v.name}>`}",`)
    .join("\n");
  return `import OpenFive from "@openfive/sdk";

const client = new OpenFive({ apiKey: "YOUR_API_KEY" });

const result = await client.templates.render("${template.slug}", {
${varObj}
});

console.log(result.rendered);`;
}

// ---------------------------------------------------------------------------
// Variable Editor
// ---------------------------------------------------------------------------

function VariableEditor({
  variables,
  onChange,
}: {
  variables: TemplateVariable[];
  onChange: (vars: TemplateVariable[]) => void;
}) {
  function addVariable() {
    onChange([
      ...variables,
      { name: "", type: "string", required: true, description: "" },
    ]);
  }

  function removeVariable(index: number) {
    onChange(variables.filter((_, i) => i !== index));
  }

  function updateVariable(index: number, updates: Partial<TemplateVariable>) {
    onChange(
      variables.map((v, i) => (i === index ? { ...v, ...updates } : v))
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Variables
        </Label>
        <Button variant="outline" size="sm" onClick={addVariable}>
          <Plus className="mr-1 h-3 w-3" />
          Add Variable
        </Button>
      </div>
      {variables.length === 0 && (
        <p className="text-xs text-neutral-400 py-2">
          No variables defined. Use {"{{variable_name}}"} syntax in your template content, then define variables here.
        </p>
      )}
      {variables.map((v, idx) => (
        <div
          key={idx}
          className="space-y-2 rounded-lg border border-neutral-200 bg-neutral-50/50 p-3"
        >
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                value={v.name}
                onChange={(e) => updateVariable(idx, { name: e.target.value })}
                placeholder="variable_name"
                className="font-mono text-xs"
              />
            </div>
            <Select
              value={v.type}
              onValueChange={(val) => updateVariable(idx, { type: val as TemplateVariable["type"] })}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="string">String</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="boolean">Boolean</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5">
              <Switch
                checked={v.required}
                onCheckedChange={(checked) => updateVariable(idx, { required: checked })}
                size="sm"
              />
              <span className="text-[10px] text-neutral-500">Req</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-neutral-400 hover:text-red-500"
              onClick={() => removeVariable(idx)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <Input
              value={v.default || ""}
              onChange={(e) => updateVariable(idx, { default: e.target.value })}
              placeholder="Default value"
              className="text-xs"
            />
            <Input
              value={v.description || ""}
              onChange={(e) => updateVariable(idx, { description: e.target.value })}
              placeholder="Description"
              className="text-xs"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Template Content Editor (with {{variable}} highlighting)
// ---------------------------------------------------------------------------

function TemplateContentEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const detectedVars = useMemo(() => extractVariablesFromContent(value), [value]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Template Content
        </Label>
        {detectedVars.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {detectedVars.map((v) => (
              <span
                key={v}
                className="inline-flex items-center rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-mono text-purple-700"
              >
                {`{{${v}}}`}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={10}
          className="min-h-[200px] resize-y font-mono text-sm leading-relaxed"
          placeholder={`You are a helpful assistant that specializes in {{domain}}.

The user's name is {{user_name}} and they need help with:
{{task_description}}

Please respond in a {{tone}} tone.`}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tags Input
// ---------------------------------------------------------------------------

function TagsInput({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [inputVal, setInputVal] = useState("");

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const tag = inputVal.trim().toLowerCase();
      if (tag && !tags.includes(tag)) {
        onChange([...tags, tag]);
      }
      setInputVal("");
    }
    if (e.key === "Backspace" && !inputVal && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Tags</Label>
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2 py-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700"
          >
            {tag}
            <button
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              className="text-neutral-400 hover:text-neutral-600"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 border-0 bg-transparent text-xs outline-none placeholder:text-neutral-400 min-w-[80px]"
          placeholder={tags.length === 0 ? "Add tags (press Enter)" : ""}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Template Dialog
// ---------------------------------------------------------------------------

function CreateTemplateDialog({
  open,
  onOpenChange,
  onCreated,
  orgId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (t: PromptTemplate) => void;
  orgId: string;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [variables, setVariables] = useState<TemplateVariable[]>([]);
  const [modelHint, setModelHint] = useState("");
  const [temperature, setTemperature] = useState("");
  const [maxTokens, setMaxTokens] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function handleNameChange(val: string) {
    setName(val);
    if (!slugManual) {
      setSlug(slugify(val));
    }
  }

  function reset() {
    setName("");
    setSlug("");
    setSlugManual(false);
    setDescription("");
    setContent("");
    setVariables([]);
    setModelHint("");
    setTemperature("");
    setMaxTokens("");
    setTags([]);
    setSaving(false);
  }

  async function handleCreate() {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          description: description || undefined,
          content,
          variables,
          model_hint: modelHint || undefined,
          temperature: temperature ? parseFloat(temperature) : undefined,
          max_tokens: maxTokens ? parseInt(maxTokens) : undefined,
          tags,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Failed to create template");
      }
      const data = await res.json();
      onCreated(data);
      reset();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to create template:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Prompt Template</DialogTitle>
          <DialogDescription>
            Define a reusable prompt with variables that can be filled at runtime.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Name & Slug */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Customer Support Agent"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Slug</Label>
              <Input
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugManual(true);
                }}
                placeholder="customer-support-agent"
                className="font-mono text-xs"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of what this template does..."
              rows={2}
            />
          </div>

          {/* Template Content */}
          <TemplateContentEditor value={content} onChange={setContent} />

          {/* Variables */}
          <VariableEditor variables={variables} onChange={setVariables} />

          <Separator />

          {/* Model Settings */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Model Hint</Label>
              <Input
                value={modelHint}
                onChange={(e) => setModelHint(e.target.value)}
                placeholder="openai/gpt-4o"
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Temperature</Label>
              <Input
                type="number"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="0.7"
                min={0}
                max={2}
                step={0.1}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Max Tokens</Label>
              <Input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(e.target.value)}
                placeholder="1024"
                min={1}
              />
            </div>
          </div>

          {/* Tags */}
          <TagsInput tags={tags} onChange={setTags} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); reset(); }}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name || !slug || !content || saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Template"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Template Detail / Edit View
// ---------------------------------------------------------------------------

function TemplateDetailView({
  template,
  orgId,
  onBack,
  onUpdate,
  onDelete,
}: {
  template: PromptTemplate;
  orgId: string;
  onBack: () => void;
  onUpdate: (t: PromptTemplate) => void;
  onDelete: (id: string) => void;
}) {
  const [activeTab, setActiveTab] = useState("editor");

  // Editor state
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description || "");
  const [content, setContent] = useState(template.content);
  const [variables, setVariables] = useState<TemplateVariable[]>(template.variables);
  const [modelHint, setModelHint] = useState(template.model_hint || "");
  const [temperature, setTemperature] = useState(template.temperature?.toString() || "");
  const [maxTokens, setMaxTokens] = useState(template.max_tokens?.toString() || "");
  const [tags, setTags] = useState(template.tags);
  const [isPublished, setIsPublished] = useState(template.is_published);
  const [changeNote, setChangeNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Preview state
  const [previewVars, setPreviewVars] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    template.variables.forEach((v) => {
      initial[v.name] = v.default || "";
    });
    return initial;
  });

  // Version history state
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [versionsLoaded, setVersionsLoaded] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<TemplateVersion | null>(null);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const previewResult = useMemo(() => renderTemplate(content, previewVars), [content, previewVars]);

  const loadVersions = useCallback(async () => {
    if (versionsLoaded) return;
    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/templates/${template.id}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data);
        setVersionsLoaded(true);
      }
    } catch {
      // ignore
    }
  }, [orgId, template.id, versionsLoaded]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || undefined,
          content,
          variables,
          model_hint: modelHint || null,
          temperature: temperature ? parseFloat(temperature) : null,
          max_tokens: maxTokens ? parseInt(maxTokens) : null,
          tags,
          is_published: isPublished,
          change_note: changeNote || undefined,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(updated);
        setChangeNote("");
        setVersionsLoaded(false);
      }
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/templates/${template.id}`, {
        method: "DELETE",
      });
      if (res.ok || res.status === 204) {
        onDelete(template.id);
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-neutral-900">{template.name}</h2>
              {isPublished ? (
                <Badge variant="default" className="bg-emerald-600">
                  <Globe className="mr-1 h-3 w-3" />
                  Published
                </Badge>
              ) : (
                <Badge variant="outline" className="text-neutral-500">
                  Draft
                </Badge>
              )}
              <Badge variant="outline" className="font-mono text-xs">
                v{template.version}
              </Badge>
            </div>
            <p className="text-sm text-neutral-500 mt-0.5">
              <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">{template.slug}</code>
              {template.description && <span className="ml-2">{template.description}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => {
        setActiveTab(v);
        if (v === "versions") loadVersions();
      }}>
        <TabsList>
          <TabsTrigger value="editor">
            <Pencil className="mr-1 h-3.5 w-3.5" />
            Editor
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="mr-1 h-3.5 w-3.5" />
            Live Preview
          </TabsTrigger>
          <TabsTrigger value="versions">
            <History className="mr-1 h-3.5 w-3.5" />
            Versions
          </TabsTrigger>
          <TabsTrigger value="snippets">
            <Copy className="mr-1 h-3.5 w-3.5" />
            Snippets
          </TabsTrigger>
        </TabsList>

        {/* EDITOR TAB */}
        <TabsContent value="editor" className="space-y-5 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description..."
              />
            </div>
          </div>

          <TemplateContentEditor value={content} onChange={setContent} />

          <VariableEditor variables={variables} onChange={setVariables} />

          <Separator />

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Model Hint</Label>
              <Input
                value={modelHint}
                onChange={(e) => setModelHint(e.target.value)}
                placeholder="openai/gpt-4o"
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Temperature</Label>
              <Input
                type="number"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="0.7"
                min={0}
                max={2}
                step={0.1}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Max Tokens</Label>
              <Input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(e.target.value)}
                placeholder="1024"
                min={1}
              />
            </div>
          </div>

          <TagsInput tags={tags} onChange={setTags} />

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Switch
                checked={isPublished}
                onCheckedChange={setIsPublished}
              />
              <Label className="text-sm">
                {isPublished ? "Published" : "Draft"}
              </Label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Change Note (optional)</Label>
            <Input
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              placeholder="Describe what changed..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onBack}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !name || !content}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </TabsContent>

        {/* PREVIEW TAB */}
        <TabsContent value="preview" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Variable inputs */}
            <Card className="border-neutral-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Variable className="h-4 w-4" />
                  Variables
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {variables.length === 0 ? (
                  <p className="text-xs text-neutral-400 py-2">
                    No variables defined for this template.
                  </p>
                ) : (
                  variables.map((v) => (
                    <div key={v.name} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-mono">{`{{${v.name}}}`}</Label>
                        {v.required && (
                          <span className="rounded bg-red-50 px-1 py-0.5 text-[9px] text-red-600">
                            required
                          </span>
                        )}
                        <span className="text-[10px] text-neutral-400">{v.type}</span>
                      </div>
                      {v.description && (
                        <p className="text-[10px] text-neutral-400">{v.description}</p>
                      )}
                      <Input
                        value={previewVars[v.name] || ""}
                        onChange={(e) =>
                          setPreviewVars((p) => ({ ...p, [v.name]: e.target.value }))
                        }
                        placeholder={v.default || `Enter ${v.name}...`}
                        className="text-xs"
                      />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Rendered output */}
            <Card className="border-neutral-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4" />
                  Rendered Output
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative rounded-lg border border-neutral-200 bg-neutral-50">
                  <div className="absolute right-2 top-2">
                    <CopyButton value={previewResult} />
                  </div>
                  <pre className="overflow-x-auto whitespace-pre-wrap p-4 text-sm leading-relaxed text-neutral-800 font-mono">
                    {previewResult}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* VERSIONS TAB */}
        <TabsContent value="versions" className="mt-4">
          {versions.length === 0 ? (
            <EmptyState
              icon={<History className="h-8 w-8" />}
              title="No version history"
              description="Version history will appear here as you make changes to the template content or variables."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Version list */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  History
                </h4>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-1 pr-3">
                    {versions.map((ver) => (
                      <button
                        key={ver.id}
                        onClick={() => setSelectedVersion(ver)}
                        className={`w-full rounded-lg border p-3 text-left transition-colors ${
                          selectedVersion?.id === ver.id
                            ? "border-neutral-400 bg-neutral-50"
                            : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            v{ver.version}
                          </Badge>
                          <span className="text-[10px] text-neutral-400">
                            {new Date(ver.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {ver.change_note && (
                          <p className="mt-1 text-xs text-neutral-600 truncate">
                            {ver.change_note}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Version detail / diff */}
              <div className="lg:col-span-2">
                {selectedVersion ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-900">
                          Version {selectedVersion.version}
                        </h4>
                        {selectedVersion.change_note && (
                          <p className="text-xs text-neutral-500 mt-0.5">
                            {selectedVersion.change_note}
                          </p>
                        )}
                        <p className="text-[10px] text-neutral-400 mt-0.5">
                          {new Date(selectedVersion.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                        Content
                      </h5>
                      <CodeBlock code={selectedVersion.content} />
                    </div>
                    {selectedVersion.variables.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                          Variables
                        </h5>
                        <div className="rounded-lg border border-neutral-200">
                          {selectedVersion.variables.map((v) => (
                            <div
                              key={v.name}
                              className="flex items-center gap-3 border-b border-neutral-100 px-3 py-2 last:border-0"
                            >
                              <code className="text-xs font-mono font-semibold text-neutral-900">
                                {v.name}
                              </code>
                              <Badge variant="outline" className="text-[10px]">
                                {v.type}
                              </Badge>
                              {v.required && (
                                <span className="text-[10px] text-red-500">required</span>
                              )}
                              {v.description && (
                                <span className="text-xs text-neutral-400 truncate">
                                  {v.description}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                    Select a version to view details
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* SNIPPETS TAB */}
        <TabsContent value="snippets" className="mt-4 space-y-6">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              curl
            </h4>
            <CodeBlock code={generateCurlSnippet(template)} language="bash" />
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              TypeScript / SDK
            </h4>
            <CodeBlock code={generateSdkSnippet(template)} language="typescript" />
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete template"
        description={`Are you sure you want to delete "${template.name}"? This will also delete all version history. This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        destructive
        loading={deleting}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Template Card
// ---------------------------------------------------------------------------

function TemplateCard({
  template,
  onClick,
}: {
  template: PromptTemplate;
  onClick: () => void;
}) {
  return (
    <Card
      className="cursor-pointer border-neutral-200 transition-all hover:border-neutral-300 hover:shadow-sm"
      onClick={onClick}
    >
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-neutral-900 truncate">
                {template.name}
              </h3>
              {template.is_published ? (
                <Badge variant="default" className="bg-emerald-600 shrink-0">
                  <Globe className="mr-0.5 h-2.5 w-2.5" />
                  Live
                </Badge>
              ) : (
                <Badge variant="outline" className="text-neutral-400 shrink-0">
                  Draft
                </Badge>
              )}
            </div>
            <code className="text-[10px] text-neutral-400 font-mono">{template.slug}</code>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono shrink-0 ml-2">
            v{template.version}
          </Badge>
        </div>

        {template.description && (
          <p className="mt-2 text-xs text-neutral-500 line-clamp-2">{template.description}</p>
        )}

        <div className="mt-3 flex items-center gap-3">
          {template.variables.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] text-neutral-400">
              <Braces className="h-3 w-3" />
              {template.variables.length} var{template.variables.length !== 1 ? "s" : ""}
            </span>
          )}
          {template.model_hint && (
            <span className="inline-flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
              <Sparkles className="h-3 w-3" />
              {template.model_hint}
            </span>
          )}
        </div>

        {template.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {template.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600"
              >
                {tag}
              </span>
            ))}
            {template.tags.length > 4 && (
              <span className="text-[10px] text-neutral-400">
                +{template.tags.length - 4} more
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function TemplatesPage() {
  const { currentOrg } = useAppContext();
  const orgId = currentOrg?.id || "";

  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState("");

  // All unique tags across templates
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    templates.forEach((t) => t.tags.forEach((tag) => tagSet.add(tag)));
    return [...tagSet].sort();
  }, [templates]);

  // Filtered templates
  const filtered = useMemo(() => {
    let result = templates;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.slug.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
      );
    }
    if (filterTag) {
      result = result.filter((t) => t.tags.includes(filterTag));
    }
    return result;
  }, [templates, searchQuery, filterTag]);

  // Load templates
  const loadTemplates = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/templates`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [orgId]);

  // Load on mount if org is set
  if (!loaded && orgId) {
    loadTemplates();
  }

  // If a template is selected, show detail view
  if (selectedTemplate) {
    return (
      <div className="space-y-6">
        <TemplateDetailView
          template={selectedTemplate}
          orgId={orgId}
          onBack={() => setSelectedTemplate(null)}
          onUpdate={(updated) => {
            setSelectedTemplate(updated);
            setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          }}
          onDelete={(id) => {
            setTemplates((prev) => prev.filter((t) => t.id !== id));
            setSelectedTemplate(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prompt Templates"
        description="Create and manage reusable prompt templates with variable substitution, versioning, and team collaboration."
        action={
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Create template
          </Button>
        }
      />

      {/* Search & Filters */}
      {templates.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="pl-9"
            />
          </div>
          {allTags.length > 0 && (
            <Select value={filterTag} onValueChange={setFilterTag}>
              <SelectTrigger className="w-40">
                <div className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-neutral-400" />
                  <SelectValue placeholder="All tags" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All tags</SelectItem>
                {allTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Template Grid */}
      {templates.length === 0 && loaded ? (
        <EmptyState
          icon={<FileText className="h-10 w-10" />}
          title="No prompt templates yet"
          description="Create your first prompt template to build reusable, version-controlled prompts with variable substitution."
          actionLabel="Create template"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onClick={() => setSelectedTemplate(template)}
            />
          ))}
          {filtered.length === 0 && templates.length > 0 && (
            <div className="col-span-full py-12 text-center text-sm text-neutral-400">
              No templates match your search.
            </div>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <CreateTemplateDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={(t) => {
          setTemplates((prev) => [t, ...prev]);
        }}
        orgId={orgId}
      />
    </div>
  );
}
