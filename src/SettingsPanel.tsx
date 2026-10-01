import { useEffect, useState } from "react";
import { Bell, Check, Moon, RefreshCw, Target } from "lucide-react";
import { Button, Card, ScreenHeader } from "./ui";
import { GOAL_MAX, GOAL_MIN, GOAL_STEP, formatMinutes } from "./lib";

type Props = {
  dark: boolean;
  setDark: (value: boolean) => void;
  notifications: boolean;
  setNotifications: (value: boolean) => void;
  goal: number;
  setGoal: (minutes: number) => void;
  onReset: () => void;
};

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return <button type="button" className={`toggle ${checked ? "is-on" : ""}`} role="switch" aria-checked={checked} aria-label={label} onClick={onChange}><span /></button>;
}

export default function SettingsPanel({ dark, setDark, notifications, setNotifications, goal, setGoal, onReset }: Props) {
  const [resetDone, setResetDone] = useState(false);
  const [goalDraft, setGoalDraft] = useState(() => formatMinutes(goal));

  useEffect(() => {
    setGoalDraft(formatMinutes(goal));
  }, [goal]);

  useEffect(() => {
    if (!resetDone) return;
    const id = window.setTimeout(() => setResetDone(false), 3500);
    return () => window.clearTimeout(id);
  }, [resetDone]);

  const reset = () => {
    onReset();
    setNotifications(true);
    setResetDone(true);
  };

  const commitGoal = () => {
    const match = goalDraft.trim().match(/^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?$/i);
    const typedMinutes = match && (match[1] || match[2]) ? Number(match[1] || 0) * 60 + Number(match[2] || 0) : Number(goalDraft.trim());
    if (!Number.isFinite(typedMinutes)) {
      setGoalDraft(formatMinutes(goal));
      return;
    }
    const clamped = Math.min(GOAL_MAX, Math.max(GOAL_MIN, Math.round(typedMinutes / GOAL_STEP) * GOAL_STEP));
    setGoal(clamped);
    setGoalDraft(formatMinutes(clamped));
  };

  return (
    <div className="screen">
      <ScreenHeader eyebrow="Preferences" title="Settings" subtitle="Tune ScreenPact to support your routine." />
      <Card className="settings-list">
        <div className="setting-row"><span className="row-icon blue"><Moon size={19} /></span><div className="setting-copy"><strong>Dark mode</strong><span>Easy on your eyes after sunset</span></div><Toggle checked={dark} onChange={() => setDark(!dark)} label="Dark mode" /></div>
        <div className="setting-row"><span className="row-icon coral"><Bell size={19} /></span><div className="setting-copy"><strong>Notifications</strong><span>Daily nudges and rank changes</span></div><Toggle checked={notifications} onChange={() => setNotifications(!notifications)} label="Notifications" /></div>
        <div className="setting-row goal-setting"><span className="row-icon teal"><Target size={19} /></span><div className="setting-copy"><strong>Daily screen-time goal</strong><span>Enter hours and minutes, for example 2h 15m</span><input className="goal-input" type="text" inputMode="text" value={goalDraft} aria-label="Daily screen-time goal" onChange={(event) => setGoalDraft(event.target.value)} onBlur={commitGoal} onKeyDown={(event) => { if (event.key === "Enter") commitGoal(); }} /></div></div>
      </Card>
      {resetDone && <div className="notice" role="status"><Check size={17} /><span>Demo data reset. Your fresh start is ready.</span></div>}
      <Card className="danger-zone"><h2>Demo controls</h2><p>Reset sample stats, groups, and preferences on this device.</p><Button variant="danger" block icon={<RefreshCw size={15} />} onClick={reset}>Reset local demo data</Button></Card>
      <p className="version">ScreenPact 1.0 · Made for more life off-screen</p>
    </div>
  );
}
