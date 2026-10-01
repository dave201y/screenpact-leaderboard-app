import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogIn, UserPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type AuthMode = "sign-in" | "create";

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("create");
  const [email, setEmail] = useState("dawit.gebremarim@mnsu.edu");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (data.authenticated) {
          navigate("/app");
        }
      } catch {
        // ignore and allow manual sign in
      }
    };

    checkSession();
  }, [navigate]);

  const submit = async () => {
    if (!email || !password) {
      toast({ title: "Missing fields", description: "Enter email and password." });
      return;
    }

    setLoading(true);
    try {
      const path = mode === "create" ? "/api/auth/signup" : "/api/auth/login";
      const res = await fetch(path, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Authentication failed" }));
        throw new Error(err.error || "Authentication failed");
      }

      toast({ title: mode === "create" ? "Account created" : "Signed in", description: "Welcome to ScreenPact." });
      navigate("/app");
    } catch (error) {
      toast({
        title: mode === "create" ? "Create account failed" : "Sign in failed",
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex justify-center px-4 py-6">
      <div className="w-full max-w-[420px] space-y-3">
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={() => navigate("/")}
            className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-accent transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="text-right">
            <h1 className="text-[20px] font-medium text-foreground">Account</h1>
            <p className="text-[12px] text-muted-foreground">Create an account or sign in</p>
          </div>
        </div>

        <div className="sp-card">
          <div className="flex gap-2 mb-3">
            <button
              className={`flex-1 rounded-lg px-3 py-2 text-sm border transition-colors ${mode === "create" ? "bg-foreground text-background border-foreground" : "bg-card text-foreground border-border"}`}
              onClick={() => setMode("create")}
            >
              Create account
            </button>
            <button
              className={`flex-1 rounded-lg px-3 py-2 text-sm border transition-colors ${mode === "sign-in" ? "bg-foreground text-background border-foreground" : "bg-card text-foreground border-border"}`}
              onClick={() => setMode("sign-in")}
            >
              Sign in
            </button>
          </div>

          <div className="text-sm text-muted-foreground mb-2.5">
            {mode === "create"
              ? "Create an account with your email so your data is saved under it."
              : "Use your email and password to return to your saved data."}
          </div>

          <div className="space-y-2.5">
            <input
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
              type="email"
              placeholder="Owner email"
              value={email}
              onChange={(e) => setEmail(e.target.value.trim())}
              autoComplete="email"
            />
            <input
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            <button className="sp-btn-primary" onClick={submit} disabled={loading}>
              <span className="inline-flex items-center gap-2">
                {mode === "create" ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                {loading ? "Please wait..." : mode === "create" ? "Create account" : "Sign in"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
