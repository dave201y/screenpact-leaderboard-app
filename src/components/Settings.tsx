import { useState } from "react";
import { Bell, Moon, Shield, Clock, Smartphone, LogOut, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const toggleDark = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div className="space-y-3">
      <div className="sp-card">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Preferences
        </div>
        <ToggleRow
          icon={Bell}
          label="Notifications"
          sub="Daily summaries & nudges"
          enabled={notifications}
          onToggle={() => setNotifications(!notifications)}
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
        <LinkRow
          icon={Clock}
          label="Screen time goal"
          sub="Currently set to 3h/day"
          onClick={() => toast({ title: "Goal settings", description: "Goal editing coming soon!" })}
        />
        <LinkRow
          icon={Smartphone}
          label="Connected devices"
          sub="1 device connected"
          onClick={() => toast({ title: "Devices", description: "Device management coming soon!" })}
        />
        <LinkRow
          icon={Shield}
          label="Privacy"
          sub="Manage data sharing"
          onClick={() => toast({ title: "Privacy", description: "Privacy settings coming soon!" })}
        />
      </div>

      <div className="sp-card">
        <div
          className="flex items-center gap-3 py-2 cursor-pointer"
          onClick={() => toast({ title: "Signed out", description: "You've been signed out" })}
        >
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
