import { useEffect, useState } from "react";
import { ArrowLeft, Smartphone, Link as LinkIcon, RefreshCw, Unlink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Capacitor, registerPlugin } from "@capacitor/core";

type ConnectedDevice = {
  id: string | number;
  name: string;
  platform: string;
  permissionStatus?: "unknown" | "requested" | "granted" | "denied" | "restricted";
  permissionUpdatedAt?: string | null;
  createdAt?: string | null;
  lastSyncedAt?: string | null;
};

type PairingCode = {
  code: string;
  expiresAt: string;
};

type ScreenTimePlugin = {
  checkUsageAccess(): Promise<{ granted: boolean }>;
  openUsageAccessSettings(): Promise<{ opened: boolean }>;
  consumePairingCode(options: {
    code: string;
    name?: string;
    platform?: string;
  }): Promise<{ deviceId: string; paired: boolean }>;
  updatePermissionStatus(options: {
    status: "unknown" | "requested" | "granted" | "denied" | "restricted";
  }): Promise<{ ok: boolean; status: string }>;
  syncTodayUsage(): Promise<{ ok: boolean; synced: boolean; date?: string; stored?: unknown }>;
};

const ScreenTime = registerPlugin<ScreenTimePlugin>("ScreenTime");

function detectDevicePlatform() {
  const ua = window.navigator.userAgent.toLowerCase();
  if (ua.includes("android")) return "android";
  if (ua.includes("iphone") || ua.includes("ipad")) return "ios";
  if (ua.includes("mac")) return "mac";
  if (ua.includes("win")) return "windows";
  if (ua.includes("linux")) return "linux";
  return "web";
}

function formatSyncStatus(lastSyncedAt?: string | null) {
  if (!lastSyncedAt) {
    return { label: "Not synced yet", tone: "text-muted-foreground" };
  }

  const parsed = new Date(lastSyncedAt);
  if (Number.isNaN(parsed.getTime())) {
    return { label: "Not synced yet", tone: "text-muted-foreground" };
  }

  const ageMinutes = Math.floor((Date.now() - parsed.getTime()) / 60000);
  if (ageMinutes <= 60) {
    return { label: "Synced recently", tone: "text-sp-green" };
  }

  return { label: `Last sync ${parsed.toLocaleString()}`, tone: "text-muted-foreground" };
}

function formatPermissionStatus(status?: string, updatedAt?: string | null) {
  const value = status || "unknown";
  if (value === "granted") {
    return { label: "Access granted", tone: "text-sp-green" };
  }
  if (value === "requested") {
    return { label: "Awaiting permission in phone settings", tone: "text-sp-blue" };
  }
  if (value === "denied") {
    return { label: "Access denied", tone: "text-sp-red" };
  }
  if (value === "restricted") {
    return { label: "Access restricted by OS", tone: "text-sp-coral" };
  }

  if (updatedAt) {
    const parsed = new Date(updatedAt);
    if (!Number.isNaN(parsed.getTime())) {
      return { label: `Unknown (updated ${parsed.toLocaleString()})`, tone: "text-muted-foreground" };
    }
  }

  return { label: "Not requested yet", tone: "text-muted-foreground" };
}

const Devices = () => {
  const navigate = useNavigate();
  const nativeCollectorAvailable = Capacitor.isNativePlatform();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [devices, setDevices] = useState<ConnectedDevice[]>([]);
  const [pairingCode, setPairingCode] = useState<PairingCode | null>(null);
  const [collectorPairCode, setCollectorPairCode] = useState("");

  const loadDevices = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/devices", { credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Could not load devices" }));
        throw new Error(body.error || "Could not load devices");
      }

      const data = await res.json();
      setDevices(Array.isArray(data.devices) ? data.devices : []);
      setPairingCode(data.pairingCode || null);
    } catch (error) {
      toast({
        title: "Devices unavailable",
        description: error instanceof Error ? error.message : "Could not load connected devices.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const addCurrentDevice = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/devices", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "This browser",
          platform: detectDevicePlatform(),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Failed to link device" }));
        throw new Error(body.error || "Failed to link device");
      }

      await loadDevices();
      toast({ title: "Device linked", description: "This browser is now connected." });
    } catch (error) {
      toast({
        title: "Link failed",
        description: error instanceof Error ? error.message : "Could not link this device.",
      });
    } finally {
      setBusy(false);
    }
  };

  const removeDevice = async (deviceId: string | number) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/devices/${deviceId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Failed to remove device" }));
        throw new Error(body.error || "Failed to remove device");
      }

      await loadDevices();
      toast({ title: "Device removed", description: "Device access was revoked." });
    } catch (error) {
      toast({
        title: "Remove failed",
        description: error instanceof Error ? error.message : "Could not remove device.",
      });
    } finally {
      setBusy(false);
    }
  };

  const generatePairingCode = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/devices/pairing-code", {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Failed to generate code" }));
        throw new Error(body.error || "Failed to generate code");
      }

      const data = await res.json();
      setPairingCode(data.pairingCode || null);
      toast({ title: "Pairing code ready", description: "Use this code on another device to connect it." });
    } catch (error) {
      toast({
        title: "Code failed",
        description: error instanceof Error ? error.message : "Could not create pairing code.",
      });
    } finally {
      setBusy(false);
    }
  };

  const pairNativeCollector = async () => {
    if (!nativeCollectorAvailable) return;
    const code = (collectorPairCode || pairingCode?.code || "").trim();
    if (!code) {
      toast({ title: "Pairing code required", description: "Generate or enter a pairing code first." });
      return;
    }

    setBusy(true);
    try {
      await ScreenTime.consumePairingCode({ code, name: "Android device", platform: "android" });
      await loadDevices();
      toast({ title: "Native collector paired", description: "This phone is now linked with device token auth." });
    } catch (error) {
      toast({
        title: "Pairing failed",
        description: error instanceof Error ? error.message : "Could not pair native collector.",
      });
    } finally {
      setBusy(false);
    }
  };

  const requestUsageAccess = async () => {
    if (!nativeCollectorAvailable) return;
    setBusy(true);
    try {
      await ScreenTime.updatePermissionStatus({ status: "requested" });
      await ScreenTime.openUsageAccessSettings();
      await loadDevices();
      toast({ title: "Permission requested", description: "Grant usage access in Android settings, then come back." });
    } catch (error) {
      toast({
        title: "Request failed",
        description: error instanceof Error ? error.message : "Could not request usage access.",
      });
    } finally {
      setBusy(false);
    }
  };

  const runNativeSyncNow = async () => {
    if (!nativeCollectorAvailable) return;
    setBusy(true);
    try {
      const access = await ScreenTime.checkUsageAccess();
      if (!access.granted) {
        await ScreenTime.updatePermissionStatus({ status: "denied" });
        toast({ title: "Access not granted", description: "Please grant usage access in Android settings first." });
        return;
      }

      await ScreenTime.updatePermissionStatus({ status: "granted" });
      await ScreenTime.syncTodayUsage();
      await loadDevices();
      toast({ title: "Sync complete", description: "Phone usage summary synced successfully." });
    } catch (error) {
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Could not sync usage from this phone.",
      });
    } finally {
      setBusy(false);
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
            <h1 className="text-[20px] font-medium text-foreground">Connected devices</h1>
            <p className="text-[12px] text-muted-foreground">Manage links and pairing codes</p>
          </div>
        </div>

        <div className="sp-card space-y-2">
          <div className="text-sm text-muted-foreground">
            Link your device, pair this phone with the code, grant usage access, then run sync.
          </div>
          <button className="sp-btn-secondary" onClick={addCurrentDevice} disabled={busy}>
            <span className="inline-flex items-center gap-2">
              <LinkIcon className="w-4 h-4" /> Link this browser
            </span>
          </button>
          <button className="sp-btn-secondary" onClick={generatePairingCode} disabled={busy}>
            <span className="inline-flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Generate pairing code
            </span>
          </button>
        </div>

        {pairingCode && (
          <div className="sp-card">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Pairing code</div>
            <div className="text-xl font-mono tracking-widest text-foreground">{pairingCode.code}</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              Expires at {new Date(pairingCode.expiresAt).toLocaleTimeString()}
            </div>
          </div>
        )}

        <div className="sp-card space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone collector</div>
          {!nativeCollectorAvailable && (
            <div className="text-sm text-muted-foreground">
              These controls appear only inside the installed mobile app. Web can still generate pairing codes.
            </div>
          )}

          {nativeCollectorAvailable && (
            <>
              <div className="text-sm text-muted-foreground">
                Pair this phone, open usage settings, then sync.
              </div>

              <input
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                value={collectorPairCode}
                onChange={(e) => setCollectorPairCode(e.target.value.toUpperCase())}
                placeholder={pairingCode?.code ? `Pairing code (e.g. ${pairingCode.code})` : "Pairing code"}
              />
              <button className="sp-btn-secondary" onClick={pairNativeCollector} disabled={busy}>
                Pair this phone
              </button>
              <button className="sp-btn-secondary" onClick={requestUsageAccess} disabled={busy}>
                Open usage access settings
              </button>
              <button className="sp-btn-secondary" onClick={runNativeSyncNow} disabled={busy}>
                Sync now from phone
              </button>
            </>
          )}
        </div>

        <div className="sp-card">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Linked devices</div>

          {loading && <div className="text-sm text-muted-foreground">Loading devices...</div>}

          {!loading && devices.length === 0 && (
            <div className="text-sm text-muted-foreground">No devices linked yet.</div>
          )}

          {!loading && devices.length > 0 && (
            <div className="space-y-2">
              {devices.map((device) => {
                const syncStatus = formatSyncStatus(device.lastSyncedAt);
                const permissionStatus = formatPermissionStatus(device.permissionStatus, device.permissionUpdatedAt);
                return (
                  <div key={String(device.id)} className="rounded-lg border border-border p-3 bg-card">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm text-foreground truncate inline-flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-muted-foreground" />
                          {device.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground">Platform: {device.platform}</div>
                        <div className={`text-[11px] ${permissionStatus.tone}`}>{permissionStatus.label}</div>
                        <div className={`text-[11px] ${syncStatus.tone}`}>{syncStatus.label}</div>
                      </div>
                      <button
                        className="px-2.5 py-1.5 rounded-lg border border-border bg-card text-xs text-foreground hover:bg-muted transition-colors"
                        onClick={() => removeDevice(device.id)}
                        disabled={busy}
                      >
                        <span className="inline-flex items-center gap-1">
                          <Unlink className="w-3.5 h-3.5" /> Remove
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Devices;
