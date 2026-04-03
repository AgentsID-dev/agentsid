// ─── Register Agent Modal ───
// Modal form for registering a new agent with name, permissions, and TTL

import { useState, useCallback, useRef } from "react";
import { Plus, X, Copy, Check } from "lucide-react";
import { apiFetch } from "./utils";

const PRESET_PERMISSIONS = ["search_*", "read_*", "save_*", "edit_*", "delete_*"] as const;

const TTL_OPTIONS = [
  { label: "1 hour", value: 3600 },
  { label: "6 hours", value: 21600 },
  { label: "24 hours", value: 86400 },
  { label: "7 days", value: 604800 },
  { label: "30 days", value: 2592000 },
] as const;

interface RegisterAgentModalProps {
  readonly open: boolean;
  readonly apiKey: string;
  readonly onClose: () => void;
  readonly onSuccess: () => void;
}

interface FormState {
  readonly name: string;
  readonly onBehalfOf: string;
  readonly permissions: readonly string[];
  readonly ttl: number;
  readonly permissionInput: string;
}

const INITIAL_FORM: FormState = {
  name: "",
  onBehalfOf: "",
  permissions: [],
  ttl: 86400,
  permissionInput: "",
};

function RegisterAgentModal({ open, apiKey, onClose, onSuccess }: RegisterAgentModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ agentId: string; token: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const permInputRef = useRef<HTMLInputElement>(null);

  const resetAndClose = useCallback(() => {
    setForm(INITIAL_FORM);
    setError("");
    setSuccess(null);
    setCopied(false);
    onClose();
  }, [onClose]);

  const handleSuccessClose = useCallback(() => {
    onSuccess();
    resetAndClose();
  }, [onSuccess, resetAndClose]);

  const addPermission = useCallback((perm: string) => {
    const trimmed = perm.trim();
    if (!trimmed || form.permissions.includes(trimmed)) return;
    setForm({ ...form, permissions: [...form.permissions, trimmed], permissionInput: "" });
  }, [form]);

  const removePermission = useCallback((perm: string) => {
    setForm({ ...form, permissions: form.permissions.filter((p) => p !== perm) });
  }, [form]);

  const handlePermissionKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addPermission(form.permissionInput);
    }
  }, [addPermission, form.permissionInput]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) { setError("Agent name is required."); return; }
    if (!form.onBehalfOf.trim()) { setError("On behalf of is required."); return; }

    setSubmitting(true);
    try {
      const body = {
        name: form.name.trim(),
        on_behalf_of: form.onBehalfOf.trim(),
        permissions: form.permissions,
        ttl_seconds: form.ttl,
      };
      const result = await apiFetch<{ agent_id: string; token: string }>(
        "/agents/", apiKey, { method: "POST", body: JSON.stringify(body) },
      );
      setSuccess({ agentId: result.agent_id, token: result.token });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register agent.");
    } finally {
      setSubmitting(false);
    }
  }, [form, apiKey]);

  const handleCopyToken = useCallback(async () => {
    if (!success) return;
    try {
      await navigator.clipboard.writeText(success.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Failed to copy token to clipboard.");
    }
  }, [success]);

  if (!open) return null;

  // ─── Success State ───
  if (success) {
    return (
      <ModalShell onBackdropClick={resetAndClose}>
        <ModalHeader title="Register Agent" onClose={resetAndClose} />
        <div className="p-6">
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 text-green-500 mb-3">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">Agent Registered</h3>
            <p className="text-xs text-muted-foreground mt-1 font-mono">{success.agentId}</p>
          </div>
          <div className="mb-3">
            <div className="text-xs font-medium text-foreground mb-1">Agent Token</div>
            <div className="flex items-center gap-2 bg-background border border-border rounded-lg p-3">
              <code className="flex-1 text-xs font-mono text-foreground break-all select-all">{success.token}</code>
              <button type="button" onClick={handleCopyToken} className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Copy token">
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-600 text-xs mb-6">
            This token is shown only once. Copy it now and store it securely.
          </div>
          <button type="button" onClick={handleSuccessClose} className="w-full px-4 py-2.5 bg-gradient-to-br from-primary to-amber-600 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity">
            Done
          </button>
        </div>
      </ModalShell>
    );
  }

  // ─── Form State ───
  return (
    <ModalShell onBackdropClick={resetAndClose}>
      <ModalHeader title="Register Agent" onClose={resetAndClose} />
      <div className="p-6">
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 text-sm">{error}</div>
          )}
          {/* Agent Name */}
          <label className="block mb-4">
            <span className="text-sm font-medium text-foreground">Agent Name <span className="text-red-500">*</span></span>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full bg-background border border-border rounded-lg px-3.5 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" placeholder="e.g. search-assistant" autoFocus />
          </label>
          {/* On Behalf Of */}
          <label className="block mb-4">
            <span className="text-sm font-medium text-foreground">On Behalf Of <span className="text-red-500">*</span></span>
            <input type="text" value={form.onBehalfOf} onChange={(e) => setForm({ ...form, onBehalfOf: e.target.value })} className="mt-1 w-full bg-background border border-border rounded-lg px-3.5 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" placeholder="e.g. user@example.com" />
          </label>
          {/* Permissions */}
          <div className="mb-4">
            <span className="text-sm font-medium text-foreground block mb-1">Permissions</span>
            {form.permissions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.permissions.map((perm) => (
                  <span key={perm} className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-mono">
                    {perm}
                    <button type="button" onClick={() => removePermission(perm)} className="ml-0.5 p-0 bg-transparent border-none text-primary/60 hover:text-primary cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input ref={permInputRef} type="text" value={form.permissionInput} onChange={(e) => setForm({ ...form, permissionInput: e.target.value })} onKeyDown={handlePermissionKeyDown} className="flex-1 bg-background border border-border rounded-lg px-3.5 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-mono" placeholder="Type and press Enter..." />
              <button type="button" onClick={() => addPermission(form.permissionInput)} className="px-3 py-2 bg-card border border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {PRESET_PERMISSIONS.filter((p) => !form.permissions.includes(p)).map((preset) => (
                <button key={preset} type="button" onClick={() => addPermission(preset)} className="px-2.5 py-1 bg-background border border-border rounded-full text-[11px] font-mono text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors cursor-pointer">
                  + {preset}
                </button>
              ))}
            </div>
          </div>
          {/* TTL */}
          <label className="block mb-6">
            <span className="text-sm font-medium text-foreground">Token TTL</span>
            <select value={form.ttl} onChange={(e) => setForm({ ...form, ttl: Number(e.target.value) })} className="mt-1 w-full bg-background border border-border rounded-lg px-3.5 py-2 text-sm text-foreground outline-none focus:border-primary cursor-pointer appearance-none">
              {TTL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          {/* Submit */}
          <button type="submit" disabled={submitting} className="w-full px-4 py-2.5 bg-gradient-to-br from-primary to-amber-600 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? "Registering..." : "Register Agent"}
          </button>
        </form>
      </div>
    </ModalShell>
  );
}

// ─── Shared Modal Pieces ───

function ModalShell({ children, onBackdropClick }: { readonly children: React.ReactNode; readonly onBackdropClick: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-start overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget) onBackdropClick(); }}>
      <div className="max-w-lg w-full mx-4 mt-20 mb-10 bg-card rounded-2xl shadow-xl border border-border">
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }: { readonly title: string; readonly onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

export { RegisterAgentModal };
export type { RegisterAgentModalProps };
