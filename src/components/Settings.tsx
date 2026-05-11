import { useEffect, useState } from "react";
import { Bell, Moon, Shield, Clock, Smartphone, LogOut, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const MIN_GOAL_MINUTES = 30;
const MAX_GOAL_MINUTES = 960;
const GOAL_STEP_MINUTES = 15;
const DEFAULT_GOAL_MINUTES = 180;

function clampGoalMinutes(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_GOAL_MINUTES;
  const rounded = Math.round(value / GOAL_STEP_MINUTES) * GOAL_STEP_MINUTES;
  return Math.min(MAX_GOAL_MINUTES, Math.max(MIN_GOAL_MINUTES, rounded));
}

function formatGoalMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}h ${remainder}m`;
}

interface ToggleRowProps {
  icon: React.ElementType;
  label: string;
  sub: string;
  enabled: boolean;
  onToggle: () => void;
}

const ToggleRow = ({ icon: Icon, label, sub, enabled, onToggle }: ToggleRowProps) => (
  <div className="flex items-center gap-3 py-3 border-b border-border last:border-b-0">
    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
      <Icon className="w-4 h-4 text-muted-foreground" />
    </div>
    <div className="flex-1">
      <div className="text-sm text-foreground">{label}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </div>
    <button
      onClick={onToggle}
      className={`w-11 h-6 rounded-full transition-colors relative ${enabled ? "bg-primary" : "bg-border"}`}
    >
      <div className={`w-5 h-5 bg-card rounded-full absolute top-0.5 transition-transform ${enabled ? "translate-x-[22px]" : "translate-x-0.5"}`} />
    </button>
  </div>
);

interface LinkRowProps {
  icon: React.ElementType;
  label: string;
  sub: string;
  onClick?: () => void;
}

const LinkRow = ({ icon: Icon, label, sub, onClick }: LinkRowProps) => (
  <div
    className="flex items-center gap-3 py-3 border-b border-border last:border-b-0 cursor-pointer hover:bg-muted/50 rounded-lg transition-colors"
    onClick={onClick}
  >
    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
      <Icon className="w-4 h-4 text-muted-foreground" />
    </div>
    <div className="flex-1">
      <div className="text-sm text-foreground">{label}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </div>
    <ChevronRight className="w-4 h-4 text-muted-foreground" />
  </div>
);

const Settings = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(DEFAULT_GOAL_MINUTES);
  const [goalDraftMinutes, setGoalDraftMinutes] = useState(DEFAULT_GOAL_MINUTES);
  const [goalEditorOpen, setGoalEditorOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const savedDarkMode = window.localStorage.getItem("sp.darkMode");
    const savedNotifications = window.localStorage.getItem("sp.notifications");
    const savedGoal = window.localStorage.getItem("sp.dailyGoalMinutes");

    if (savedDarkMode !== null) setDarkMode(savedDarkMode === "true");
    if (savedNotifications !== null) setNotifications(savedNotifications === "true");
    if (savedGoal !== null) {
      const goal = Number.parseInt(savedGoal, 10);
      if (Number.isInteger(goal)) {
        const nextGoal = clampGoalMinutes(goal);
        setDailyGoalMinutes(nextGoal);
        setGoalDraftMinutes(nextGoal);
      }
    }
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const sessionRes = await fetch("/api/auth/session", { credentials: "include" });
        if (!sessionRes.ok) return;
        const session = await sessionRes.json();
        setIsAuthorized(Boolean(session.authenticated));
        if (!session.authenticated) return;

        const res = await fetch("/api/settings", { credentials: "include" });
        if (!res.ok) return;

        const data = await res.json();
        setNotifications(Boolean(data.notifications));
        setDarkMode(Boolean(data.darkMode));
        const nextGoal = clampGoalMinutes(Number(data.dailyGoalMinutes) || DEFAULT_GOAL_MINUTES);
        setDailyGoalMinutes(nextGoal);
        setGoalDraftMinutes(nextGoal);
      } catch {
        // keep local defaults when API is unavailable
      }
    };

    loadSettings();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => { window.localStorage.setItem("sp.darkMode", String(darkMode)); }, [darkMode]);
  useEffect(() => { window.localStorage.setItem("sp.notifications", String(notifications)); }, [notifications]);
  useEffect(() => { window.localStorage.setItem("sp.dailyGoalMinutes", String(dailyGoalMinutes)); }, [dailyGoalMinutes]);

  const commitGoalMinutes = async (nextGoal: number) => {
    const previousGoal = dailyGoalMinutes;
    const normalizedGoal = clampGoalMinutes(nextGoal);

    if (!isAuthorized) {
      setDailyGoalMinutes(normalizedGoal);
      setGoalDraftMinutes(normalizedGoal);
      toast({ title: "Goal updated", description: `Daily goal set to ${formatGoalMinutes(normalizedGoal)} on this device.` });
      return;
    }

    setDailyGoalMinutes(normalizedGoal);
    setGoalDraftMinutes(normalizedGoal);
    const ok = await saveSettings({ notifications, darkMode, dailyGoalMinutes: normalizedGoal });
    if (!ok) {
      setDailyGoalMinutes(previousGoal);
      setGoalDraftMinutes(previousGoal);
      toast({ title: "Goal not saved", description: "Keeping your previous screen time goal." });
      return;
    }

    toast({ title: "Goal updated", description: `Daily goal set to ${formatGoalMinutes(normalizedGoal)}` });
  };

  const saveSettings = async (next: {
    notifications: boolean;
    darkMode: boolean;
    dailyGoalMinutes: number;
  }) => {
    if (!isAuthorized) { 
      setNotifications(next.notifications);
      setDarkMode(next.darkMode);
      setDailyGoalMinutes(next.dailyGoalMinutes);
      toast({ title: "Saved locally", description: "Account sync is paused for now, so settings stay on this device." });
      return true;
    } 

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to save settings" }));
        throw new Error(err.error || "Failed to save settings");
      }

      const saved = await res.json();
      setNotifications(Boolean(saved.notifications));
      setDarkMode(Boolean(saved.darkMode));
      const nextGoal = clampGoalMinutes(Number(saved.dailyGoalMinutes) || DEFAULT_GOAL_MINUTES);
      setDailyGoalMinutes(nextGoal);
      setGoalDraftMinutes(nextGoal);
      return true;
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Could not save settings",
      });
      return false;
    }
  };

  const toggleNotifications = async () => {
    const next = !notifications;
    setNotifications(next);
    await saveSettings({ notifications: next, darkMode, dailyGoalMinutes });
  };

  const toggleDark = async () => {
    const next = !darkMode;
    setDarkMode(next);
    await saveSettings({ notifications, darkMode: next, dailyGoalMinutes });
  };

  const openPrivacy = () => navigate("/privacy");

  const signOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      setIsAuthorized(false);
      toast({ title: "Signed out", description: "You have been signed out." });
      navigate("/");
    } catch {
      toast({ title: "Sign out failed", description: "Please try again." });
    }
  };

  return (
    <div className="space-y-3">
      {!isAuthorized && (
        <div className="sp-card">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Account access
          </div>
          <div className="text-sm text-muted-foreground mb-2.5">
            Create an account so your settings and data save under your email instead of only on this device.
          </div>
          <button className="sp-btn-secondary" onClick={() => navigate("/auth")}>
            Create account / Sign in
          </button>
        </div>
      )}

      <div className="sp-card">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Preferences
        </div>
        <ToggleRow
          icon={Bell}
          label="Notifications"
          sub="Daily summaries & nudges"
          enabled={notifications}
          onToggle={toggleNotifications}
        />
        <ToggleRow
          icon={Moon}
          label="Dark mode"
          sub="Reduce eye strain"
          enabled={darkMode}
          onToggle={toggleDark}
        />
      </div>

      <div className="sp-card">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Account
        </div>
        <button
          className="w-full text-left flex items-center gap-3 py-3 border-b border-border last:border-b-0"
          onClick={() => setGoalEditorOpen((open) => !open)}
        >
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
            <Clock className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="text-sm text-foreground">Screen time goal</div>
            <div className="text-[11px] text-muted-foreground">Currently {formatGoalMinutes(dailyGoalMinutes)} / day</div>
          </div>
          <ChevronRight
            className={`w-4 h-4 text-muted-foreground transition-transform ${goalEditorOpen ? "rotate-90" : "rotate-0"}`}
          />
        </button>
        {goalEditorOpen && (
          <div className="pt-3 pb-1 space-y-3 border-b border-border last:border-b-0">
            <div className="flex items-center justify-between gap-2">
              <button
                className="px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground hover:bg-muted transition-colors"
                onClick={() => setGoalDraftMinutes((current) => clampGoalMinutes(current - GOAL_STEP_MINUTES))}
              >
                -15m
              </button>
              <input
                type="number"
                min={MIN_GOAL_MINUTES}
                max={MAX_GOAL_MINUTES}
                step={GOAL_STEP_MINUTES}
                value={goalDraftMinutes}
                onChange={(e) => setGoalDraftMinutes(clampGoalMinutes(Number(e.target.value)))}
                className="w-24 rounded-lg border border-border bg-card px-3 py-2 text-center text-sm text-foreground"
                aria-label="Screen time goal in minutes"
              />
              <button
                className="px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground hover:bg-muted transition-colors"
                onClick={() => setGoalDraftMinutes((current) => clampGoalMinutes(current + GOAL_STEP_MINUTES))}
              >
                +15m
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{formatGoalMinutes(MIN_GOAL_MINUTES)} minimum</span>
              <span>{formatGoalMinutes(MAX_GOAL_MINUTES)} maximum</span>
            </div>
            <button
              className="sp-btn-secondary w-full"
              onClick={() => commitGoalMinutes(goalDraftMinutes)}
              disabled={goalDraftMinutes === dailyGoalMinutes}
            >
              Save screen time goal
            </button>
            <div className="text-[11px] text-muted-foreground text-center">
              Current saved goal: {formatGoalMinutes(dailyGoalMinutes)} / day
            </div>
          </div>
        )}
        <LinkRow
          icon={Smartphone}
          label="Connected devices"
          sub="Link, remove, and pair devices"
          onClick={() => navigate("/devices")}
        />
        <LinkRow
          icon={Shield}
          label="Privacy"
          sub="Manage data sharing"
          onClick={openPrivacy}
        />
      </div>

      <div className="sp-card">
        <div className="flex items-center gap-3 py-2 cursor-pointer" onClick={signOut}>
          <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
            <LogOut className="w-4 h-4 text-destructive" />
          </div>
          <div className="text-sm text-destructive">Sign out</div>
        </div>
      </div>

      <div className="text-center text-[11px] text-muted-foreground py-2">
        ScreenPact v1.0.0
      </div>
    </div>
  );
};

export default Settings;