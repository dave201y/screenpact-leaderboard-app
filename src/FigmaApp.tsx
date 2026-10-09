import { type FormEvent, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Check, ChevronRight, Clock3, Copy, Eye, EyeOff, Flame, Link, Pencil, Pin, Plus, Settings, Shield, Smartphone, Target, Trophy, User, Users, Wifi } from "lucide-react";
import { DEFAULT_GOAL, formatMinutes, validateGroupName } from "./lib";
import { Badge, Button, Card, Progress, ScreenHeader } from "./ui";
import SettingsPanel from "./SettingsPanel";
import "./figma.css";

type Screen = "leaderboard" | "stats" | "group" | "profile" | "settings";
type Tone = "teal" | "blue" | "amber" | "coral" | "green";
type Member = { name: string; minutes: number; app: string; trend: "down" | "up" | "same"; delta: number; tone: Tone; you: boolean };
type Group = { id: string; name: string; note: string; code: string; adminId: string };

const USER_NAME = "Jamie Stone";
const CURRENT_USER_ID = "jamie";
const GROUP_STORAGE_KEY = "screenpact.groups";
let groups: Group[] = [
  { id: "study", name: "Study Squad", note: "Your focused friends", code: "STUDY42", adminId: CURRENT_USER_ID },
  { id: "roomies", name: "Roomies", note: "Less scroll, more hangs", code: "ROOMIES", adminId: CURRENT_USER_ID },
  { id: "book", name: "Book Club", note: "Read more together", code: "BOOKCLUB", adminId: CURRENT_USER_ID },
];

const memberSets: Record<string, Member[]> = {
  study: [
    { name: "Maya", minutes: 72, app: "Messages", trend: "down", delta: 18, tone: "teal", you: false },
    { name: "Theo", minutes: 98, app: "YouTube", trend: "up", delta: 9, tone: "amber", you: false },
    { name: "You", minutes: 114, app: "Instagram", trend: "down", delta: 12, tone: "blue", you: true },
    { name: "Lena", minutes: 137, app: "TikTok", trend: "same", delta: 0, tone: "coral", you: false },
    { name: "Amir", minutes: 163, app: "Safari", trend: "up", delta: 21, tone: "green", you: false },
  ],
  roomies: [
    { name: "Noah", minutes: 58, app: "Spotify", trend: "down", delta: 24, tone: "blue", you: false },
    { name: "You", minutes: 114, app: "Instagram", trend: "down", delta: 12, tone: "blue", you: true },
    { name: "Priya", minutes: 126, app: "Messages", trend: "up", delta: 7, tone: "coral", you: false },
    { name: "Jules", minutes: 151, app: "YouTube", trend: "same", delta: 0, tone: "teal", you: false },
  ],
  book: [
    { name: "Elena", minutes: 47, app: "Books", trend: "down", delta: 31, tone: "teal", you: false },
    { name: "Marcus", minutes: 63, app: "Safari", trend: "down", delta: 15, tone: "blue", you: false },
    { name: "Nia", minutes: 89, app: "Messages", trend: "up", delta: 5, tone: "coral", you: false },
    { name: "You", minutes: 114, app: "Instagram", trend: "down", delta: 12, tone: "blue", you: true },
    { name: "Owen", minutes: 128, app: "Reddit", trend: "up", delta: 17, tone: "green", you: false },
    { name: "Imani", minutes: 142, app: "YouTube", trend: "same", delta: 0, tone: "amber", you: false },
    { name: "Rosa", minutes: 171, app: "TikTok", trend: "up", delta: 26, tone: "teal", you: false },
  ],
};

type StoredGroup = { group: Group; members: Member[] };

function readCustomGroups(): StoredGroup[] {
  try {
    const parsed = JSON.parse(localStorage.getItem("sp.customGroups") || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const WEEK = [118, 152, 96, 141, 124, 82, 114];
const LOCK_IN_PHRASES = [
  "Lock in — no doomscrolling.",
  "Lock in — focus mode on.",
  "Locked in — keep the streak alive.",
  "Lock in — one more sprint.",
];

function Avatar({ member, size = "md", online = false }: { member: Pick<Member, "name" | "tone">; size?: "sm" | "md" | "xl"; online?: boolean }) {
  return <span className={`avatar avatar-${size} avatar-${member.tone}`}>{member.name.slice(0, 2).toUpperCase()}{online && <i />}</span>;
}

function Header({ navigate }: { navigate: (screen: Screen) => void }) {
  return <header className="topbar"><button className="brand" onClick={() => navigate("leaderboard")}><span className="logo"><Clock3 size={18} /></span><strong>ScreenPact</strong></button><div className="top-actions"><button className="icon-btn" onClick={() => navigate("profile")} aria-label="Open profile"><User size={18} /></button><button className="icon-btn" onClick={() => navigate("settings")} aria-label="Open settings"><Settings size={18} /></button></div></header>;
}

function Leaderboard({ group, pinnedId, onSelect, onPin, lockInPing, onLockIn }: { group: Group; pinnedId: string; onSelect: (id: string) => void; onPin: (id: string) => void; lockInPing: string | null; onLockIn: () => void }) {
  const members = memberSets[group.id];
  const winner = members[0];
  const [countdown, setCountdown] = useState("");
  useEffect(() => { const update = () => { const now = new Date(); const end = new Date(now); end.setHours(24, 0, 0, 0); const seconds = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000)); setCountdown(`${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`); }; update(); const timer = window.setInterval(update, 30000); return () => window.clearInterval(timer); }, []);
  const rank = members.findIndex((member) => member.you) + 1;
  return <div className="screen"><div className="group-switcher-head"><div><div className="eyebrow">Your circles</div><h2>Choose a group</h2></div><Badge>{groups.length} groups</Badge></div><div className="group-switcher">{groups.map((candidate) => <button className={`group-chip ${candidate.id === group.id ? "active" : ""}`} key={candidate.id} onClick={() => onSelect(candidate.id)}><span className="group-monogram">{candidate.name.split(" ").map((word) => word[0]).join("")}</span><span><strong>{candidate.name}</strong><small>{memberSets[candidate.id].length} members</small></span>{pinnedId === candidate.id && <em><Pin size={11} /> Pinned</em>}</button>)}</div><div className="group-heading"><div><div className="eyebrow">Active group · {members.length} members</div><h1>{group.name}</h1></div><div className="countdown"><Clock3 size={15} /><b>{countdown}</b></div></div><div className="group-context"><span>{group.note}</span><button onClick={() => onPin(group.id)}><Pin size={13} />{pinnedId === group.id ? "Pinned" : "Pin to home"}</button></div><div className="lock-in-row"><Button variant="secondary" icon={<Target size={15} />} onClick={onLockIn}>Lock in</Button>{lockInPing && <div className="lockin-ping" role="status" aria-live="polite">{lockInPing}</div>}</div><Card className="winner-card"><div className="winner-label"><Trophy size={16} /> Today’s quiet champion</div><div className="winner-content"><Avatar member={winner} size="xl" online /><div><h2>{winner.you ? "You’re in the lead" : `${winner.name}’s in the lead`}</h2><p>Just {formatMinutes(winner.minutes)} today, leading {group.name}.</p></div></div><div className="winner-footer"><span>Keep it up, {winner.name}</span><Badge tone="amber"><Flame size={12} /> 3 day streak</Badge></div></Card><div className="section-heading"><div><h2>Today’s standings</h2><p>Lower screen time ranks higher</p></div><Badge tone="teal">Live</Badge></div><div className="leader-list">{members.map((member, index) => <div className={`leader-row ${member.you ? "is-you" : ""}`} key={member.name}><strong className="rank">{index + 1}</strong><Avatar member={member} /><div className="member-main"><div className="member-name">{member.name} {member.you && <Badge>You</Badge>}</div><div className="member-app">{member.app} · most used</div></div><div className="member-score"><strong>{formatMinutes(member.minutes)}</strong><span className={`trend trend-${member.trend}`}>{member.trend === "down" ? <ArrowDown size={12} /> : member.trend === "up" ? <ArrowUp size={12} /> : "-"}{member.delta}m</span></div></div>)}</div><div className="encouragement"><Target size={20} /><p><strong>You’re currently #{rank} in {group.name}.</strong><br />A small offline break could move you up.</p></div></div>;
}

function Stats({ group, goal }: { group: Group; goal: number }) { const average = Math.round(WEEK.reduce((sum, day) => sum + day, 0) / WEEK.length); const best = Math.min(...WEEK); const today = WEEK[WEEK.length - 1]; const rank = [...memberSets[group.id]].sort((a, b) => a.minutes - b.minutes).findIndex((member) => member.you) + 1; return <div className="screen"><ScreenHeader eyebrow="Your week" title="Small wins, adding up." subtitle="Your screen time is trending down today." /><Card className="hero-stat"><div className="stat-top"><div><span>Today’s screen time</span><strong>{formatMinutes(today)}</strong></div><Badge tone="teal"><ArrowDown size={13} /> 22m</Badge></div><div className="goal-copy"><span>Daily goal</span><span>{formatMinutes(today)} of {formatMinutes(goal)}</span></div><Progress value={Math.min(100, Math.round((today / goal) * 100))} label="Daily goal progress" /><p>{formatMinutes(Math.max(0, goal - today))} left in your daily pact</p></Card><div className="stat-grid"><Card><span>Weekly average</span><strong>{formatMinutes(average)}</strong><small>Across 7 days</small></Card><Card><span>Group rank</span><strong>#{rank}</strong><small>of {memberSets[group.id].length} members</small></Card><Card><span>Best day</span><strong>{formatMinutes(best)}</strong><small>This week</small></Card><Card><span>Goals met</span><strong>{WEEK.filter((day) => day <= goal).length} of 7</strong><small>This week</small></Card></div></div>; }

function GroupSettings({ group, pinnedId, onSelect, onPin, onCreate, onLeave, onRename }: { group: Group; pinnedId: string; onSelect: (id: string) => void; onPin: (id: string) => void; onCreate: () => void; onLeave: () => void; onRename: (groupId: string, rawName: string) => { ok: true } | { ok: false; error: string } }) {
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState("");
  const members = memberSets[group.id];
  const dismiss = () => window.setTimeout(() => setNotice(null), 3500);
  const copy = async () => { try { await navigator.clipboard.writeText(group.code); setNotice({ type: "success", text: "Invite code copied." }); } catch { setNotice({ type: "error", text: "Copy was blocked. Select the code manually." }); } dismiss(); };
  const join = () => { const found = groups.find((candidate) => candidate.code === code.trim().toUpperCase()); if (found) { onSelect(found.id); setNotice({ type: "success", text: `Joined ${found.name}.` }); } else { setNotice({ type: "error", text: "We couldn’t find that group." }); } setCode(""); dismiss(); };
  const beginRename = (candidate: Group) => { setEditingId(candidate.id); setNameDraft(candidate.name); setNameError(""); };
  const cancelRename = () => { setEditingId(null); setNameDraft(""); setNameError(""); };
  const saveRename = (candidate: Group) => { const result = onRename(candidate.id, nameDraft); if (result.ok === false) { setNameError(result.error); return; } cancelRename(); };
  const nameIsUnchanged = editingId !== null && groups.find((candidate) => candidate.id === editingId)?.name === nameDraft.trim().replace(/\s+/g, " ");
  return <div className="screen"><ScreenHeader eyebrow={group.name} title="Group settings" subtitle="Manage your circle and invite a friend to join the pact." /><div className="section-heading"><div><h2>Your groups</h2><p>Switch or choose which group opens first</p></div></div><Card className="group-manager">{groups.map((candidate) => { const isEditing = editingId === candidate.id; const canRename = candidate.adminId === CURRENT_USER_ID; return <div className={`managed-group ${candidate.id === group.id ? "active" : ""}`} key={candidate.id}><div className="managed-main" role="button" tabIndex={isEditing ? -1 : 0} onClick={() => !isEditing && onSelect(candidate.id)} onKeyDown={(event) => { if (!isEditing && (event.key === "Enter" || event.key === " ")) onSelect(candidate.id); }}><span className="group-monogram">{candidate.name.split(" ").map((word) => word[0]).join("")}</span><span className="managed-copy">{isEditing ? <><input className="group-name-input" autoFocus maxLength={40} value={nameDraft} aria-label={`Rename ${candidate.name}`} onChange={(event) => { setNameDraft(event.target.value); setNameError(""); }} onKeyDown={(event) => { if (event.key === "Enter") saveRename(candidate); if (event.key === "Escape") cancelRename(); }} /><small className="group-name-meta"><span>{nameDraft.length}/40</span>{nameError && <span className="group-name-error">{nameError}</span>}</small><span className="group-name-actions"><Button variant="primary" disabled={!nameDraft.trim() || nameIsUnchanged} onClick={() => saveRename(candidate)}>Save</Button><Button variant="secondary" onClick={cancelRename}>Cancel</Button></span></> : <><strong>{candidate.name}</strong><small>{memberSets[candidate.id].length} members · {candidate.note}</small></>}</span></div>{canRename && !isEditing && <button className="rename-button" onClick={() => beginRename(candidate)} aria-label={`Rename ${candidate.name}`}><Pencil size={15} /></button>}<button className={`pin-button ${pinnedId === candidate.id ? "active" : ""}`} onClick={() => onPin(candidate.id)} aria-label={`Pin ${candidate.name}`}><Pin size={17} /></button></div>; })}</Card><div className="section-heading members-heading"><div><h2>Members</h2><p>{members.length} people · 3 active now</p></div></div>{notice && <div className={`notice notice-${notice.type}`} role="status"><Check size={17} /><span>{notice.text}</span></div>}

    <Card className="members-card">
      <ul className="member-list">
        {members.map((member, index) => {
          const online = index < 3;
          const isAdmin = member.you;
          return (
            <li className={`member-item ${member.you ? "is-you" : ""}`} key={member.name}>
              <Avatar member={member} size="md" online={online} />
              <div className="member-info">
                <div className="member-title">
                  <strong>{member.you ? USER_NAME : member.name}</strong>
                  {member.you && <Badge>You</Badge>}
                </div>
                <div className="member-role">
                  {isAdmin ? <Badge tone="amber"><Shield size={11} /> Admin</Badge> : "Member"}
                </div>
              </div>
              <span className={`presence ${online ? "on" : "off"}`}>{online ? "Active now" : "Away"}</span>
            </li>
          );
        })}
      </ul>
    </Card>

    <Card className="invite-card"><Link size={22} /><h2>Invite someone</h2><p>Your invite code is ready to share with {group.name}.</p><div className="invite-code"><div><span>Invite code</span><strong>{group.code}</strong></div><Button variant="secondary" icon={<Copy size={15} />} onClick={copy}>Copy</Button></div></Card><Card><h2>Join another group</h2><p className="card-subtitle">Enter an invite code.</p><div className="input-row"><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="e.g. BOOKCLUB" /><Button disabled={!code.trim()} onClick={join}>Join</Button></div></Card><Button variant="secondary" block icon={<Plus size={17} />} onClick={onCreate}>Create a new group</Button><Button variant="danger" block disabled={groups.length <= 1} onClick={onLeave}>Leave {group.name}</Button></div>;
}

function Profile({ goal, navigate }: { goal: number; navigate: (screen: Screen) => void }) { return <div className="screen"><ScreenHeader eyebrow="Your profile" title={USER_NAME} /><Card className="profile-card"><Avatar member={{ name: "You", tone: "blue" }} size="xl" online /><div><h2>{USER_NAME}</h2><p>@jamiest · joined March 2025</p><Badge tone="teal"><Flame size={12} /> 6 day pact streak</Badge></div><Button variant="secondary" icon={<Settings size={15} />}>Edit</Button></Card><Card className="goal-card"><span className="row-icon teal"><Target size={20} /></span><div className="setting-copy"><span>Daily screen-time goal</span><strong>{formatMinutes(goal)}</strong></div><ChevronRight size={18} /></Card><div className="section-heading"><div><h2>Connected devices</h2><p>2 devices sharing screen time</p></div></div><Card className="device-list"><div className="device-row"><span className="row-icon blue"><Smartphone size={19} /></span><div><strong>Jamie’s iPhone</strong><span>Syncing now</span></div><Badge>This device</Badge></div><div className="device-row"><span className="row-icon amber"><Smartphone size={19} /></span><div><strong>MacBook Air</strong><span>Last seen 18 min ago</span></div><ChevronRight size={18} /></div></Card><Card className="privacy-card"><button><span className="row-icon teal"><Shield size={19} /></span><div><strong>Privacy & data</strong><span>Control what your group can see</span></div><ChevronRight size={18} /></button><button onClick={() => navigate("settings")}><span className="row-icon blue"><Settings size={19} /></span><div><strong>App settings</strong><span>Notifications, theme, and sync</span></div><ChevronRight size={18} /></button></Card></div>; }

function BottomNav({ screen, navigate }: { screen: Screen; navigate: (screen: Screen) => void }) { return <nav className="bottom-nav"><button className={screen === "leaderboard" ? "active" : ""} onClick={() => navigate("leaderboard")}><Users size={19} /><span>Groups</span></button><button className={screen === "stats" ? "active" : ""} onClick={() => navigate("stats")}><Clock3 size={19} /><span>My Stats</span></button><button className={screen === "group" ? "active" : ""} onClick={() => navigate("group")}><Settings size={19} /><span>Group Settings</span></button></nav>; }

function FigmaShell() {
  const [screen, setScreen] = useState<Screen>("leaderboard");
  const [dark, setDark] = useState(() => localStorage.getItem("sp.darkMode") === "true");
  const [notifications, setNotifications] = useState(() => localStorage.getItem("sp.notifications") !== "false");
  const [goal, setGoal] = useState(() => Number(localStorage.getItem("sp.dailyGoalMinutes")) || DEFAULT_GOAL);
  const [activeId, setActiveId] = useState("study");
  const [pinnedId, setPinnedId] = useState("study");
  const [lockInPing, setLockInPing] = useState<string | null>(null);
  const [groupVersion, setGroupVersion] = useState(0);
  const activeGroup = groups.find((group) => group.id === activeId) ?? groups[0];
  useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; localStorage.setItem("sp.darkMode", String(dark)); }, [dark]);
  useEffect(() => { localStorage.setItem("sp.notifications", String(notifications)); }, [notifications]);
  useEffect(() => { localStorage.setItem("sp.dailyGoalMinutes", String(goal)); }, [goal]);
  useEffect(() => { if (!lockInPing) return; const timer = window.setTimeout(() => setLockInPing(null), 1800); return () => window.clearTimeout(timer); }, [lockInPing]);
  useEffect(() => { try { const savedGroups = JSON.parse(localStorage.getItem(GROUP_STORAGE_KEY) || "null") as Group[] | null; if (Array.isArray(savedGroups) && savedGroups.length) groups = savedGroups.map((group) => ({ ...group, adminId: group.adminId || CURRENT_USER_ID })); readCustomGroups().forEach(({ group, members }) => { if (!groups.some((candidate) => candidate.id === group.id)) { groups = [...groups, { ...group, adminId: group.adminId || CURRENT_USER_ID }]; memberSets[group.id] = members; } }); setGroupVersion((version) => version + 1); } catch { /* ignore invalid local demo data */ } }, []);
  const persistGroups = () => localStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify(groups));
  const reset = () => { setDark(false); setNotifications(true); setGoal(DEFAULT_GOAL); setActiveId("study"); setPinnedId("study"); localStorage.removeItem("sp.customGroups"); localStorage.removeItem(GROUP_STORAGE_KEY); localStorage.removeItem("sp.darkMode"); localStorage.removeItem("sp.notifications"); localStorage.removeItem("sp.dailyGoalMinutes"); groups = [{ id: "study", name: "Study Squad", note: "Your focused friends", code: "STUDY42", adminId: CURRENT_USER_ID }, { id: "roomies", name: "Roomies", note: "Less scroll, more hangs", code: "ROOMIES", adminId: CURRENT_USER_ID }, { id: "book", name: "Book Club", note: "Read more together", code: "BOOKCLUB", adminId: CURRENT_USER_ID }]; setGroupVersion((version) => version + 1); };
  const renameGroup = (groupId: string, rawName: string) => { const result = validateGroupName(rawName); if (!result.ok) return result; const group = groups.find((candidate) => candidate.id === groupId); if (!group || group.adminId !== CURRENT_USER_ID) return { ok: false as const, error: "Only the admin can rename this group." }; groups = groups.map((candidate) => candidate.id === groupId ? { ...candidate, name: result.name } : candidate); persistGroups(); setGroupVersion((version) => version + 1); return { ok: true as const }; };
  const createGroup = () => { const id = `custom-${Date.now()}`; const newGroup: Group = { id, name: `New Group ${groups.length + 1}`, note: "Your new screen-time pact", code: `PACT${Math.floor(1000 + Math.random() * 9000)}`, adminId: CURRENT_USER_ID }; const members = [{ name: "You", minutes: 0, app: "None", trend: "same" as const, delta: 0, tone: "blue" as Tone, you: true }]; groups = [...groups, newGroup]; memberSets[id] = members; persistGroups(); localStorage.setItem("sp.customGroups", JSON.stringify([...readCustomGroups(), { group: newGroup, members }])); setGroupVersion((version) => version + 1); setActiveId(id); setPinnedId(id); setScreen("leaderboard"); };
  const leaveGroup = () => { if (groups.length <= 1) return; const remaining = groups.filter((candidate) => candidate.id !== activeGroup.id); groups = remaining; delete memberSets[activeGroup.id]; persistGroups(); localStorage.setItem("sp.customGroups", JSON.stringify(readCustomGroups().filter((entry) => entry.group.id !== activeGroup.id))); setGroupVersion((version) => version + 1); setActiveId(remaining[0].id); setPinnedId(remaining[0].id); };
  const handleLockIn = () => { const random = LOCK_IN_PHRASES[Math.floor(Math.random() * LOCK_IN_PHRASES.length)]; setLockInPing(random); };
  const navigate = (next: Screen) => { setScreen(next); window.scrollTo({ top: 0 }); };
  return <div className="app"><div className="phone-shell"><Header navigate={navigate} /><main>{screen === "leaderboard" && <Leaderboard group={activeGroup} pinnedId={pinnedId} onSelect={setActiveId} onPin={setPinnedId} lockInPing={lockInPing} onLockIn={handleLockIn} />}{screen === "stats" && <Stats group={activeGroup} goal={goal} />}{screen === "group" && <GroupSettings group={activeGroup} pinnedId={pinnedId} onSelect={setActiveId} onPin={setPinnedId} onCreate={createGroup} onLeave={leaveGroup} onRename={renameGroup} />}{screen === "profile" && <Profile goal={goal} navigate={navigate} />}{screen === "settings" && <SettingsPanel dark={dark} setDark={setDark} notifications={notifications} setNotifications={setNotifications} goal={goal} setGoal={setGoal} onReset={reset} />}</main><BottomNav screen={screen} navigate={navigate} /></div></div>;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include" })
      .then((response) => response.json())
      .then((session) => setAuthenticated(Boolean(session.authenticated)))
      .catch(() => setAuthenticated(false))
      .finally(() => setChecked(true));
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/signup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Authentication failed");
      setAuthenticated(true);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  if (!checked) return <div className="auth-page auth-page-loading"><div className="auth-loading" role="status"><span className="auth-spinner" /> Checking your session...</div></div>;
  if (authenticated) return <>{children}</>;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-mark" aria-hidden="true"><Clock3 size={19} /></span>
          <span>ScreenPact</span>
        </div>

        <div className="auth-heading">
          <p className="auth-kicker">Your screen-time pact</p>
          <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p>Sign in to keep your ScreenPact data connected.</p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <div className="auth-field">
            <label htmlFor="auth-email">Email</label>
            <input id="auth-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required />
          </div>
          <div className="auth-field">
            <label htmlFor="auth-password">Password</label>
            <div className="auth-password-wrap">
              <input id="auth-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="Enter your password" minLength={6} required />
              <button className="auth-password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <div className="auth-error" role="alert">{error}</div>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading && <span className="auth-spinner" aria-hidden="true" />}
            {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="auth-switch">
          <span>{mode === "login" ? "New to ScreenPact?" : "Already have an account?"}</span>
          <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}>{mode === "login" ? "Create an account" : "Sign in"}</button>
        </div>
      </div>
      <p className="auth-footer">Less scrolling. More life.</p>
    </div>
  );
}

export default function FigmaApp() {
  return <AuthGate><FigmaShell /></AuthGate>;
}
