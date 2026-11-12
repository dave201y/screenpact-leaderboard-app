import { useEffect, useState } from "react";
import { Bell, Check, LogOut, Moon, RefreshCw, Target } from "lucide-react";
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
  onLogout: () => void;
  apiError?: string | null;
  saving?: boolean;
};

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return <button type="button" className={`toggle ${checked ? "is-on" : ""}`} role="switch" aria-checked={checked} aria-label={label} onClick={onChange}><span /></button>;
}

export default function SettingsPanel({ dark, setDark, notifications, setNotifications, goal, setGoal, onReset, onLogout, apiError, saving }: Props) {
  const [resetDone, setResetDone] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [hoursDraft, setHoursDraft] = useState(() => String(Math.floor(goal / 60)));
  const [minutesDraft, setMinutesDraft] = useState(() => String(goal % 60).padStart(2, "0"));
  const [goalError, setGoalError] = useState("");

  useEffect(() => {
    setHoursDraft(String(Math.floor(goal / 60)));
    setMinutesDraft(String(goal % 60).padStart(2, "0"));
  }, [goal]);

  useEffect(() => {
    if (!resetDone) return;
    const id = window.setTimeout(() => setResetDone(false), 3500);
    return () => window.clearTimeout(id);
  }, [resetDone]);

  const reset = () => {
    onReset();
    setResetDone(true);
  };

  const commitGoal = () => {
    const hours = Number(hoursDraft);
    const minutes = Number(minutesDraft);
    const typedMinutes = hours * 60 + minutes;
    if (!hoursDraft || !minutesDraft || !Number.isInteger(hours) || !Number.isInteger(minutes) || minutes > 59 || typedMinutes < GOAL_MIN || typedMinutes > GOAL_MAX) {
      setGoalError(`Pick between ${formatMinutes(GOAL_MIN)} and ${formatMinutes(GOAL_MAX)}.`);
      return;
    }
    setGoalError("");
    const clamped = Math.min(GOAL_MAX, Math.max(GOAL_MIN, Math.round(typedMinutes / GOAL_STEP) * GOAL_STEP));
    setGoal(clamped);
    setHoursDraft(String(Math.floor(clamped / 60)));
    setMinutesDraft(String(clamped % 60).padStart(2, "0"));
  };

  return (
    <div className="screen">
      <ScreenHeader eyebrow="Preferences" title="Settings" subtitle="Tune ScreenPact to support your routine." />
      <Card className="settings-list">
        <div className="setting-row"><span className="row-icon blue"><Moon size={19} /></span><div className="setting-copy"><strong>Dark mode</strong><span>Easy on your eyes after sunset</span></div><Toggle checked={dark} onChange={() => setDark(!dark)} label="Dark mode" /></div>
        <div className="setting-row"><span className="row-icon coral"><Bell size={19} /></span><div className="setting-copy"><strong>Notifications</strong><span>Daily nudges and rank changes</span></div><Toggle checked={notifications} onChange={() => setNotifications(!notifications)} label="Notifications" /></div>
        <div className="setting-row goal-setting"><span className="row-icon teal"><Target size={19} /></span><div className="setting-copy" role="group" aria-labelledby="goal-title"><strong id="goal-title">Daily screen-time goal</strong><span>Set your daily timer</span><div className="goal-time-inputs"><label><input className="goal-input" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2} value={hoursDraft} aria-label="Goal hours" aria-describedby="goal-hint" onFocus={(event) => event.currentTarget.select()} onChange={(event) => setHoursDraft(event.target.value.replace(/\D/g, "").slice(0, 2))} onBlur={() => { if (hoursDraft) setHoursDraft(String(Number(hoursDraft))); commitGoal(); }} onKeyDown={(event) => { if (event.key === "Enter") commitGoal(); }} /><b>h</b></label><label><input className="goal-input" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2} value={minutesDraft} aria-label="Goal minutes" aria-describedby="goal-hint" onFocus={(event) => event.currentTarget.select()} onChange={(event) => setMinutesDraft(event.target.value.replace(/\D/g, "").slice(0, 2))} onBlur={() => { if (minutesDraft) setMinutesDraft(String(Number(minutesDraft)).padStart(2, "0")); commitGoal(); }} onKeyDown={(event) => { if (event.key === "Enter") commitGoal(); }} /><b>m</b></label></div><small id="goal-hint" className={`goal-hint${goalError ? " is-error" : ""}`} role={goalError ? "alert" : undefined}>{goalError || `${formatMinutes(goal)} per day · 15-minute steps`}</small></div></div>
      </Card>
      {saving && <div className="notice" role="status"><span>Saving settings...</span></div>}
      {apiError && <div className="notice notice-error" role="alert"><span>{apiError}</span></div>}
      {resetDone && <div className="notice" role="status"><Check size={17} /><span>Demo data reset. Your fresh start is ready.</span></div>}
      <Card><h2>Account</h2><p>Sign out of this ScreenPact account on this device.</p><Button variant="secondary" block icon={<LogOut size={15} />} onClick={onLogout}>Sign out</Button></Card>
      <Card className="danger-zone"><h2>Demo controls</h2><p>Reset sample stats, groups, and preferences on this device.</p>{resetConfirm ? <div className="inline-confirm"><p>Reset local demo data now?</p><div className="group-name-actions"><Button variant="danger" onClick={reset}>Reset data</Button><Button variant="secondary" onClick={() => setResetConfirm(false)}>Cancel</Button></div></div> : <Button variant="danger" block icon={<RefreshCw size={15} />} onClick={() => setResetConfirm(true)}>Reset local demo data</Button>}</Card>
      <p className="version">ScreenPact 1.0 · Made for more life off-screen</p>
    </div>
  );
}
