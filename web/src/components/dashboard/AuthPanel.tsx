// ─── Auth Panel ───
// Sign In / Sign Up / API Key authentication

import { useState, useCallback } from "react";
import { MailCheck } from "lucide-react";
import { AgentsIDLogo } from "@/components/blocks/logo";
import type { AuthTab } from "./types";
import { apiFetch, setStoredApiKey, getStoredApiKey } from "./utils";

interface AuthConfig {
  readonly supabase_url?: string;
  readonly supabase_anon_key?: string;
  readonly posthog_key?: string;
}

interface AuthPanelProps {
  readonly authConfig: AuthConfig | null;
  readonly onAuthenticated: (apiKey: string) => void;
}

function AuthPanel({ authConfig, onAuthenticated }: AuthPanelProps) {
  const [activeTab, setActiveTab] = useState<AuthTab>("signin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");

  // Sign In fields
  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");

  // Sign Up fields
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupProject, setSignupProject] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);

  // API Key field
  const [apiKeyInput, setApiKeyInput] = useState("");

  const switchTab = useCallback((tab: AuthTab) => {
    setActiveTab(tab);
    setError("");
  }, []);

  const handleSignIn = useCallback(async () => {
    if (!signinEmail || !signinPassword) {
      setError("Email and password required");
      return;
    }
    if (!authConfig?.supabase_url || !authConfig?.supabase_anon_key) {
      setError("Authentication is not configured. Try the API Key tab.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        authConfig.supabase_url,
        authConfig.supabase_anon_key,
      );
      const { data, error: authError } =
        await supabase.auth.signInWithPassword({
          email: signinEmail,
          password: signinPassword,
        });

      if (authError) {
        setError(authError.message);
        return;
      }

      const token = data.session?.access_token;
      if (!token) {
        setError("Sign in failed. No session returned.");
        return;
      }

      // PostHog identification (if consented)
      if (
        window.posthog?.has_opted_in_capturing?.() &&
        window.posthog.identify
      ) {
        window.posthog.identify(signinEmail, { email: signinEmail });
        window.posthog.capture?.("user_signed_in");
      }

      // Try saved API key first — it persists across sign-out/sign-in
      const savedKey = getStoredApiKey();
      if (savedKey) {
        try {
          await apiFetch("/agents/?limit=1", savedKey);
          onAuthenticated(savedKey);
          return;
        } catch {
          // Key is invalid — fall through to create/fetch project
        }
      }

      // No valid saved key — create or return existing project
      const res = await fetch("/api/v1/projects/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          name: signinEmail.split("@")[0] + "'s Project",
        }),
      });
      const proj = await res.json();
      if (proj.api_key) {
        setStoredApiKey(proj.api_key);
        onAuthenticated(proj.api_key);
      } else {
        setError(proj.detail || "Failed to load project. Try the API Key tab.");
        switchTab("apikey");
      }
    } catch {
      setError(
        "Sign in succeeded but project creation failed. Try the API Key tab.",
      );
      switchTab("apikey");
    } finally {
      setLoading(false);
    }
  }, [signinEmail, signinPassword, authConfig, onAuthenticated, switchTab]);

  const handleSignUp = useCallback(async () => {
    if (!signupEmail || !signupPassword) {
      setError("Email and password required");
      return;
    }
    if (signupPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (!tosAccepted) {
      setError("Please agree to the Terms of Service and Privacy Policy");
      return;
    }
    if (!authConfig?.supabase_url || !authConfig?.supabase_anon_key) {
      setError("Authentication is not configured. Try the API Key tab.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        authConfig.supabase_url,
        authConfig.supabase_anon_key,
      );
      const { data, error: authError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      if (!data.session) {
        setConfirmationEmail(signupEmail);
        setShowConfirmation(true);
        setError("");
        return;
      }

      // PostHog identification (if consented)
      if (
        window.posthog?.has_opted_in_capturing?.() &&
        window.posthog.identify
      ) {
        window.posthog.identify(signupEmail, { email: signupEmail });
        window.posthog.capture?.("user_signed_up");
      }

      // Auto-create a project
      const projectName = signupProject.trim() || "My Project";
      const res = await fetch("/api/v1/projects/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + data.session.access_token,
        },
        body: JSON.stringify({ name: projectName }),
      });
      const proj = await res.json();
      if (proj.api_key) {
        setStoredApiKey(proj.api_key);
        window.posthog?.capture?.("project_created");
        onAuthenticated(proj.api_key);
      } else {
        setError(proj.detail || "Failed to create project");
      }
    } catch {
      setError(
        "Account created but project creation failed. Sign in and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    signupEmail,
    signupPassword,
    signupProject,
    tosAccepted,
    authConfig,
    onAuthenticated,
    switchTab,
  ]);

  const handleApiKeyLogin = useCallback(async () => {
    const key = apiKeyInput.trim();
    if (!key) {
      setError("Please enter your project key");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await apiFetch("/agents/?limit=1", key);
      setStoredApiKey(key);
      onAuthenticated(key);
    } catch {
      setError("Invalid project key. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [apiKeyInput, onAuthenticated]);

  const handleResendConfirmation = useCallback(async () => {
    if (!authConfig?.supabase_url || !authConfig?.supabase_anon_key) {
      setResendMessage("Authentication is not configured.");
      return;
    }

    setResendLoading(true);
    setResendMessage("");

    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        authConfig.supabase_url,
        authConfig.supabase_anon_key,
      );
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: confirmationEmail,
      });

      if (resendError) {
        setResendMessage(resendError.message);
      } else {
        setResendMessage("Confirmation email resent. Check your inbox.");
      }
    } catch {
      setResendMessage("Failed to resend email. Please try again.");
    } finally {
      setResendLoading(false);
    }
  }, [authConfig, confirmationEmail]);

  const handleBackToSignIn = useCallback(() => {
    setShowConfirmation(false);
    setShowForgotPassword(false);
    setResendMessage("");
    setForgotMessage("");
    switchTab("signin");
  }, [switchTab]);

  const handleForgotPassword = useCallback(async () => {
    if (!forgotEmail) {
      setForgotMessage("Please enter your email address.");
      return;
    }
    if (!authConfig?.supabase_url || !authConfig?.supabase_anon_key) {
      setForgotMessage("Password reset is not available.");
      return;
    }

    setForgotLoading(true);
    setForgotMessage("");

    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        authConfig.supabase_url,
        authConfig.supabase_anon_key,
      );
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        forgotEmail,
        { redirectTo: window.location.origin + "/dashboard" },
      );

      if (resetError) {
        setForgotMessage(resetError.message);
      } else {
        setForgotMessage("Reset link sent! Check your email.");
      }
    } catch {
      setForgotMessage("Failed to send reset email. Try again.");
    } finally {
      setForgotLoading(false);
    }
  }, [forgotEmail, authConfig]);

  const tabClass = (tab: AuthTab) =>
    `flex-1 py-2 border-b-2 bg-transparent text-sm font-semibold cursor-pointer transition-colors ${
      activeTab === tab
        ? "border-primary text-foreground"
        : "border-transparent text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Floating particles background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className="absolute w-[3px] h-[3px] rounded-full bg-primary opacity-20 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDuration: `${3 + Math.random() * 5}s`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-12 w-[420px] max-w-[90%] shadow-lg relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Logo */}
        <div className="text-center mb-9">
          <AgentsIDLogo className="w-10 h-10 mx-auto mb-4 drop-shadow-md" />
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
            AgentsID
          </h2>
          <p className="text-muted-foreground text-sm mt-1.5">
            Command center for AI agent identity
          </p>
        </div>

        {/* Email Confirmation */}
        {showConfirmation && (
          <div className="space-y-5 text-center">
            <div className="flex justify-center">
              <MailCheck className="w-12 h-12 text-emerald-500" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Check your email</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                We sent a confirmation link to{" "}
                <span className="font-medium text-foreground">{confirmationEmail}</span>.
                Click it to activate your account, then come back and sign in.
              </p>
            </div>

            {resendMessage && (
              <div className={`text-xs p-2.5 rounded-lg border ${
                resendMessage.includes("resent")
                  ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
                  : "text-destructive bg-destructive/10 border-destructive/20"
              }`}>
                {resendMessage}
              </div>
            )}

            <button
              onClick={handleResendConfirmation}
              disabled={resendLoading}
              className="w-full py-3 rounded-lg border border-border bg-background text-sm font-semibold text-foreground hover:bg-muted transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {resendLoading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                  Resending...
                </>
              ) : (
                "Resend email"
              )}
            </button>

            <button
              onClick={handleBackToSignIn}
              className="text-sm text-primary hover:underline cursor-pointer bg-transparent border-none"
            >
              Back to sign in
            </button>
          </div>
        )}

        {/* Error */}
        {!showConfirmation && error && (
          <div className="text-destructive text-xs mb-4 p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg">
            {error}
          </div>
        )}

        {/* Tabs */}
        {!showConfirmation && !showForgotPassword && (
          <div className="flex gap-0 mb-4 border-b border-border">
            <button className={tabClass("signin")} onClick={() => switchTab("signin")}>
              Sign In
            </button>
            <button className={tabClass("signup")} onClick={() => switchTab("signup")}>
              Sign Up
            </button>
            <button className={tabClass("apikey")} onClick={() => switchTab("apikey")}>
              API Key
            </button>
          </div>
        )}

        {/* Sign In */}
        {!showConfirmation && !showForgotPassword && activeTab === "signin" && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={signinEmail}
                onChange={(e) => setSigninEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm font-mono text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={signinPassword}
                onChange={(e) => setSigninPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm font-mono text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                placeholder="min 8 characters"
              />
            </div>
            <button
              onClick={handleSignIn}
              disabled={loading}
              className="w-full py-3 rounded-lg bg-gradient-to-br from-primary to-amber-600 text-white font-semibold text-sm shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
            <button
              onClick={() => {
                setShowForgotPassword(true);
                setForgotEmail(signinEmail);
                setForgotMessage("");
              }}
              className="w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors bg-transparent border-none cursor-pointer mt-1"
            >
              Forgot your password?
            </button>
          </div>
        )}

        {/* Forgot Password */}
        {!showConfirmation && showForgotPassword && (
          <div className="space-y-5">
            <div className="text-center mb-2">
              <MailCheck className="size-10 text-primary mx-auto mb-3" />
              <h3 className="text-base font-semibold text-foreground">Reset your password</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your email and we'll send a reset link.
              </p>
            </div>
            {forgotMessage && (
              <div className={`text-xs p-2.5 rounded-lg border ${
                forgotMessage.includes("sent")
                  ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
                  : "text-destructive bg-destructive/10 border-destructive/20"
              }`}>
                {forgotMessage}
              </div>
            )}
            <div>
              <label className="block text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleForgotPassword()}
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm font-mono text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                placeholder="you@example.com"
              />
            </div>
            <button
              onClick={handleForgotPassword}
              disabled={forgotLoading}
              className="w-full py-3 rounded-lg bg-gradient-to-br from-primary to-amber-600 text-white font-semibold text-sm shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {forgotLoading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </button>
            <button
              onClick={handleBackToSignIn}
              className="w-full text-center text-sm text-primary hover:underline cursor-pointer bg-transparent border-none"
            >
              Back to sign in
            </button>
          </div>
        )}

        {/* Sign Up */}
        {!showConfirmation && activeTab === "signup" && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm font-mono text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm font-mono text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                placeholder="min 8 characters"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">
                Project Name
              </label>
              <input
                type="text"
                value={signupProject}
                onChange={(e) => setSignupProject(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                placeholder="My AI App"
              />
            </div>
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={tosAccepted}
                onChange={(e) => setTosAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 shrink-0 accent-primary"
              />
              <label className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                I agree to the{" "}
                <a
                  href="/terms"
                  target="_blank"
                  className="text-primary underline"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="/privacy"
                  target="_blank"
                  className="text-primary underline"
                >
                  Privacy Policy
                </a>
              </label>
            </div>
            <button
              onClick={handleSignUp}
              disabled={loading}
              className="w-full py-3 rounded-lg bg-gradient-to-br from-primary to-amber-600 text-white font-semibold text-sm shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </div>
        )}

        {/* API Key */}
        {!showConfirmation && activeTab === "apikey" && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">
                Project Key
              </label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApiKeyLogin()}
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm font-mono text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                placeholder="aid_proj_..."
                autoComplete="off"
              />
            </div>
            <button
              onClick={handleApiKeyLogin}
              disabled={loading}
              className="w-full py-3 rounded-lg bg-gradient-to-br from-primary to-amber-600 text-white font-semibold text-sm shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// PostHog type augmentation
declare global {
  interface Window {
    posthog?: {
      identify?: (id: string, props?: Record<string, unknown>) => void;
      capture?: (event: string, props?: Record<string, unknown>) => void;
      has_opted_in_capturing?: () => boolean;
      opt_in_capturing?: () => void;
      opt_out_capturing?: () => void;
      init?: (
        key: string,
        config: Record<string, unknown>,
      ) => void;
    };
  }
}

export { AuthPanel };
