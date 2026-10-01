import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Download, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type PrivacyRequest = {
  id: number | string;
  type: "export" | "delete";
  status: "pending" | "processing" | "completed" | "rejected";
  note?: string;
  createdAt: string;
  resolvedAt?: string | null;
};

type PrivacyPayload = {
  summary: {
    email: string;
    memberSince: string;
    syncedDays: number;
    lastSyncDate: string | null;
  };
  dataCollected: string[];
  requests: PrivacyRequest[];
};

type PrivacyMode = "account" | "local";

const LOCAL_REQUESTS_KEY = "sp.privacyRequests";

function readLocalRequests(): PrivacyRequest[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_REQUESTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => typeof entry?.id !== "undefined");
  } catch {
    return [];
  }
}

function writeLocalRequests(requests: PrivacyRequest[]) {
  window.localStorage.setItem(LOCAL_REQUESTS_KEY, JSON.stringify(requests));
}

function getLocalPayload(): PrivacyPayload {
  const storageKeys = Object.keys(window.localStorage).filter((key) => key.startsWith("sp."));
  const requests = readLocalRequests().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  return {
    summary: {
      email: "Local device mode",
      memberSince: "Not signed in",
      syncedDays: 0,
      lastSyncDate: null,
    },
    dataCollected: [
      "device settings (dark mode, notifications, goal)",
      "group memberships and selected leaderboard",
      `stored app keys (${storageKeys.length})`,
    ],
    requests,
  };
}

function exportLocalSnapshot() {
  const snapshot = {
    exportedAt: new Date().toISOString(),
    source: "local-device",
    keys: Object.keys(window.localStorage)
      .filter((key) => key.startsWith("sp."))
      .reduce<Record<string, string | null>>((acc, key) => {
        acc[key] = window.localStorage.getItem(key);
        return acc;
      }, {}),
  };

  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `screenpact-local-export-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function clearLocalAppData() {
  const keys = Object.keys(window.localStorage).filter((key) => key.startsWith("sp."));
  keys.forEach((key) => window.localStorage.removeItem(key));
}

const Privacy = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<PrivacyMode>("local");
  const [payload, setPayload] = useState<PrivacyPayload | null>(null);

  const loadPrivacy = async () => {
    setLoading(true);
    try {
      const sessionRes = await fetch("/api/auth/session", { credentials: "include" });
      if (!sessionRes.ok) throw new Error("Could not verify session");
      const session = await sessionRes.json();

      if (!session.authenticated) {
        setMode("local");
        setPayload(getLocalPayload());
        return;
      }

      setMode("account");
      const res = await fetch("/api/privacy", { credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Could not load privacy data" }));
        throw new Error(body.error || "Could not load privacy data");
      }

      const data = await res.json();
      setPayload(data);
    } catch (error) {
      toast({
        title: "Privacy load failed",
        description: error instanceof Error ? error.message : "Unable to load privacy details",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrivacy();
  }, []);

  const createRequest = async (type: "export" | "delete") => {
    if (mode === "local") {
      const createdAt = new Date().toISOString();
      const nextRequest: PrivacyRequest = {
        id: `local-${Date.now()}`,
        type,
        status: "completed",
        note: type === "export" ? "Exported local app data" : "Deleted local app data",
        createdAt,
        resolvedAt: createdAt,
      };

      const current = readLocalRequests();
      writeLocalRequests([nextRequest, ...current].slice(0, 20));

      if (type === "export") {
        exportLocalSnapshot();
        toast({ title: "Local data exported", description: "A JSON snapshot was downloaded to your device." });
      } else {
        const confirmed = window.confirm("Delete all local ScreenPact data on this device?");
        if (!confirmed) return;
        clearLocalAppData();
        toast({ title: "Local data cleared", description: "Device-only app data was removed." });
      }

      setPayload(getLocalPayload());
      return;
    }

    try {
      const res = await fetch("/api/privacy/request", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, note: "Requested from web settings" }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(body.error || "Request failed");
      }

      toast({
        title: type === "export" ? "Export request submitted" : "Delete request submitted",
        description: "We queued your privacy request.",
      });

      await loadPrivacy();
    } catch (error) {
      toast({
        title: "Request failed",
        description: error instanceof Error ? error.message : "Please try again",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex justify-center px-4 py-6">
      <div className="w-full max-w-[420px] space-y-3">
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={() => navigate("/app")}
            className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-accent transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="text-right">
            <h1 className="text-[20px] font-medium text-foreground">Privacy</h1>
            <p className="text-[12px] text-muted-foreground">Manage your data and requests</p>
          </div>
        </div>

        {loading && <div className="sp-card text-sm text-muted-foreground">Loading privacy details...</div>}

        {!loading && payload && (
          <>
            <div className="sp-card">
              <div className="flex items-center gap-2 text-foreground font-medium mb-1">
                <Shield className="w-4 h-4" />
                {mode === "account" ? "Account privacy mode" : "Local privacy mode"}
              </div>
              <div className="text-sm text-muted-foreground">
                {mode === "account"
                  ? "Requests are sent to your account and handled by the backend."
                  : "You are not signed in. Actions here apply only to this device."}
              </div>
            </div>

            <div className="sp-card">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Actions</div>
              <button className="sp-btn-secondary mb-2" onClick={() => createRequest("export")}>
                <span className="inline-flex items-center gap-2">
                  <Download className="w-4 h-4" /> {mode === "account" ? "Request data export" : "Export local data"}
                </span>
              </button>
              <button className="sp-btn-secondary" onClick={() => createRequest("delete")}>
                <span className="inline-flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /> {mode === "account" ? "Request account deletion" : "Delete local app data"}
                </span>
              </button>
            </div>

            <div className="sp-card">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Recent requests</div>
              {payload.requests.length === 0 && (
                <div className="text-sm text-muted-foreground">No privacy requests yet.</div>
              )}
              {payload.requests.slice(0, 8).map((req) => (
                <div key={req.id} className="py-2 border-b border-border last:border-b-0">
                  <div className="text-sm text-foreground">
                    {req.type === "export" ? "Data export" : "Account deletion"} - {req.status}
                  </div>
                  <div className="text-[11px] text-muted-foreground">Created {new Date(req.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Privacy;
