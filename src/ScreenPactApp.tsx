import { type FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Check, ChevronRight, Clock3, Copy, Eye, EyeOff, Flame, Link, Pencil, Pin, Plus, RefreshCw, Settings, Shield, Smartphone, Target, Trophy, User, Users, Wifi, WifiOff } from "lucide-react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { DEFAULT_GOAL, formatMinutes, validateGroupName } from "./lib";
import { Badge, Button, Card, Progress, ScreenHeader } from "./ui";
import SettingsPanel from "./SettingsPanel";
import "./screenpact.css";

type Screen = "leaderboard" | "stats" | "group" | "profile" | "settings";
type Tone = "teal" | "blue" | "amber" | "coral" | "green";
type Member = { name: string; minutes: number; app: string; trend: "down" | "up" | "same"; delta: number; tone: Tone; you: boolean; role?: "owner" | "member" };
type Group = { id: string; name: string; note: string; code: string; adminId: string; role?: "owner" | "member"; memberCount?: number; members?: Member[]; live?: boolean };
type GroupActionResult = { ok: boolean; group?: Group; error?: string };
type ApiMember = { name: string; initials: string; avatar: string; time: number; app: string; appIcon: string; delta: number; you: boolean };
type ApiProfile = { displayName: string; initials: string; avatar: string; memberSince: string; groupsCount: number; rank: number; avgDailyMinutes: number; achievements: Array<{ icon: string; label: string; value: string; color?: string }>; source?: "mock" | "supabase" };
type DataSource = "mock" | "supabase";

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
  "Locked in — one more sprint.",
];

function csrfHeaders(): Record<string, string> {
  const token = document.cookie.split("; ").find((cookie) => cookie.startsWith("screenpact.csrf="))?.split("=")[1];
  return token ? { "X-CSRF-Token": decodeURIComponent(token) } : {};
}

function describeError(error: unknown, fallback: string): string {
  if (error instanceof TypeError) return "Can’t reach ScreenPact. Check your connection and try again.";
  if (error instanceof SyntaxError) return "ScreenPact returned an unexpected response.";
  return error instanceof Error && error.message ? error.message : fallback;
}

function useOnlineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return online;
}

function DataBadge({ source }: { source: DataSource | null }) {
  return source === "supabase" ? <Badge tone="teal">Live</Badge> : <Badge tone="amber">Demo data</Badge>;
}

function Avatar({ member, size = "md", online = false }: { member: Pick<Member, "name" | "tone">; size?: "sm" | "md" | "xl"; online?: boolean }) {
  return <span className={`avatar avatar-${size} avatar-${member.tone}`}>{member.name.slice(0, 2).toUpperCase()}{online && <i />}</span>;
}

function Header({ navigate }: { navigate: (screen: Screen) => void }) {
  return <header className="topbar"><button className="brand" onClick={() => navigate("leaderboard")}><span className="logo"><Clock3 size={18} /></span><strong>ScreenPact</strong></button><div className="top-actions"><button className="icon-btn" onClick={() => navigate("profile")} aria-label="Open profile"><User size={18} /></button><button className="icon-btn" onClick={() => navigate("settings")} aria-label="Open settings"><Settings size={18} /></button></div></header>;
}

function toTone(avatar: string): Tone {
  return ["teal", "blue", "amber", "coral", "green"].includes(avatar) ? (avatar as Tone) : "blue";
}

function mapApiMembers(rows: ApiMember[]): Member[] {
  return rows.map((row) => ({
    name: row.name,
    minutes: row.time,
    app: row.app,
    trend: row.delta < 0 ? "down" : row.delta > 0 ? "up" : "same",
    delta: Math.abs(row.delta),
    tone: toTone(row.avatar),
    you: row.you,
  }));
}

function Leaderboard({ members, source, loading, error, onRetry, pinnedId, onPin, lockInPing, onLockIn, onGoStats }: { members: Member[]; source: DataSource | null; loading: boolean; error: string | null; onRetry: () => void; pinnedId: string; onPin: (id: string) => void; lockInPing: string | null; onLockIn: () => void; onGoStats: () => void }) {
  const winner = members[0];
  const [countdown, setCountdown] = useState("");
  useEffect(() => { const update = () => { const now = new Date(); const end = new Date(now); end.setHours(24, 0, 0, 0); const seconds = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000)); setCountdown(`${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`); }; update(); const timer = window.setInterval(update, 30000); return () => window.clearInterval(timer); }, []);
  const rank = members.findIndex((member) => member.you) + 1;
  if (loading) return <div className="screen"><div className="group-heading"><div><div className="eyebrow">Live data</div><h1>Today’s leaderboard</h1></div><div className="countdown"><Clock3 size={15} /><b>{countdown}</b></div></div><div className="lock-in-row"><Button variant="secondary" icon={<Target size={15} />} onClick={onLockIn}>Lock in</Button>{lockInPing && <div className="lockin-ping" role="status" aria-live="polite">{lockInPing}</div>}</div><Card><div className="auth-loading" role="status"><span className="auth-spinner" /> Loading today’s standings...</div></Card></div>;
  if (error) return <div className="screen"><div className="group-heading"><div><div className="eyebrow">Live data unavailable</div><h1>Today’s leaderboard</h1></div></div><div className="lock-in-row"><Button variant="secondary" icon={<Target size={15} />} onClick={onLockIn}>Lock in</Button>{lockInPing && <div className="lockin-ping" role="status" aria-live="polite">{lockInPing}</div>}</div><Card><div className="notice notice-error" role="alert"><Wifi size={17} /><span>{error}</span></div><Button variant="secondary" onClick={onRetry}>Retry</Button></Card></div>;
  if (!members.length) return <div className="screen"><div className="group-heading"><div><div className="eyebrow">No data yet</div><h1>Today’s leaderboard</h1></div><div className="countdown"><Clock3 size={15} /><b>{countdown}</b></div></div><Card><div className="empty-state"><Target size={20} /><h2>No usage synced yet</h2><p>Connect a device and sync today’s summary to populate the leaderboard.</p><Button onClick={onGoStats}>Go to My Stats</Button></div></Card></div>;
  return <div className="screen"><div className="group-heading"><div><div className="eyebrow">{source === "supabase" ? "Live data" : "Demo data"} · {members.length} members</div><h1>Today’s leaderboard</h1></div><div className="countdown"><Clock3 size={15} /><b>{countdown}</b></div></div><div className="group-context"><span>Lower screen time ranks higher</span><button onClick={() => onPin("leaderboard")}><Pin size={13} />{pinnedId === "leaderboard" ? "Pinned" : "Pin to home"}</button></div><div className="lock-in-row"><Button variant="secondary" icon={<Target size={15} />} onClick={onLockIn}>Lock in</Button>{lockInPing && <div className="lockin-ping" role="status" aria-live="polite">{lockInPing}</div>}</div><Card className="winner-card"><div className="winner-label"><Trophy size={16} /> {source === "supabase" ? "Today’s quiet champion" : "Sample quiet champion"}</div><div className="winner-content"><Avatar member={winner} size="xl" online={source === "supabase"} /><div><h2>{winner.you ? "You’re in the lead" : `${winner.name}’s in the lead`}</h2><p>Just {formatMinutes(winner.minutes)} today.</p></div></div><div className="winner-footer"><span>Keep it up, {winner.name}</span><Badge tone="amber"><Flame size={12} /> {source === "supabase" ? "Live ranking" : "Demo ranking"}</Badge></div></Card><div className="section-heading"><div><h2>Today’s standings</h2><p>{source === "supabase" ? "Synced from the ScreenPact API" : "Sample data from the demo API"}</p></div><DataBadge source={source} /></div><div className="leader-list">{members.map((member, index) => <div className={`leader-row ${member.you ? "is-you" : ""}`} key={`${member.name}-${index}`}><strong className="rank">{index + 1}</strong><Avatar member={member} /><div className="member-main"><div className="member-name">{member.name} {member.you && <Badge>You</Badge>}</div><div className="member-app">{member.app} · most used</div></div><div className="member-score"><strong>{formatMinutes(member.minutes)}</strong><span className={`trend trend-${member.trend}`}>{member.trend === "down" ? <ArrowDown size={12} /> : member.trend === "up" ? <ArrowUp size={12} /> : "-"}{member.delta}m</span></div></div>)}</div>{rank > 0 && <div className="encouragement"><Target size={20} /><p><strong>You’re currently #{rank}.</strong><br />A small offline break could move you up.</p></div>}</div>;
}

function parseMinutes(value: string): number { const hours = Number(value.match(/(\d+)h/)?.[1] || 0); const minutes = Number(value.match(/(\d+)m/)?.[1] || 0); return hours * 60 + minutes; }

type CollectorState = { isPaired?: boolean; hasPendingSync?: boolean; pendingSyncRetryAt?: number; hasUsageAccess?: boolean };
type ScreenTimePlugin = { getCollectorState: () => Promise<CollectorState>; retryPendingSync: () => Promise<{ pending?: boolean; date?: string }> };
const ScreenTime = registerPlugin<ScreenTimePlugin>("ScreenTime");

function SyncStatus() {
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [collector, setCollector] = useState<CollectorState | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const native = Capacitor.isNativePlatform();
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/devices", { credentials: "include" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(body.devices)) throw new Error(body.error || "Could not load sync status");
      if (Array.isArray(body.devices)) {
        const latest = body.devices.map((device: { lastSyncedAt?: string | null }) => device.lastSyncedAt).filter(Boolean).sort().at(-1) || null;
        setLastSyncedAt(latest);
      }
      if (native) setCollector(await ScreenTime.getCollectorState());
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Could not load sync status");
    } finally {
      setLoading(false);
    }
  }, [native]);
  useEffect(() => { void refresh(); }, [refresh]);
  const retry = async () => {
    setRetrying(true);
    setError(null);
    try {
      await ScreenTime.retryPendingSync();
      await refresh();
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : "Retry is not available yet");
    } finally {
      setRetrying(false);
    }
  };
  const pending = Boolean(collector?.hasPendingSync);
  const retryAt = collector?.pendingSyncRetryAt ? new Date(collector.pendingSyncRetryAt) : null;
  return <Card className="sync-status-card"><div className="section-heading"><div><h2>Sync status</h2><p>{loading ? "Checking connected devices..." : lastSyncedAt ? `Last upload ${new Date(lastSyncedAt).toLocaleString()}` : "No completed upload yet"}</p></div><Smartphone size={19} /></div>{pending ? <div className="notice notice-error" role="status"><RefreshCw size={17} /><span>Upload waiting to retry{retryAt && retryAt > new Date() ? ` after ${retryAt.toLocaleTimeString()}` : " now"}.</span></div> : <div className="notice" role="status"><Check size={17} /><span>{collector?.hasUsageAccess === false ? "Usage Access is off. Allow it on your phone before syncing." : collector?.isPaired ? "Device connected and ready." : lastSyncedAt ? "Your latest summary is on the server." : "Connect a device to start syncing."}</span></div>}{error && <div className="notice notice-error" role="alert"><Wifi size={17} /><span>{error}</span></div>}{pending && <Button variant="secondary" icon={<RefreshCw size={15} />} disabled={retrying} onClick={() => void retry()}>{retrying ? "Retrying..." : "Retry upload"}</Button>}{!pending && <Button variant="secondary" icon={<RefreshCw size={15} />} disabled={loading} onClick={() => void refresh()}>Refresh status</Button>}</Card>;
}

function Stats({ stats, goal, loading, error, onRetry }: { stats: { metrics: { today: string; weeklyAvg: string; groupRank: string; bestDay: string }; dayMins: number[]; apps: Array<{ name: string; mins: number; icon?: string; percent?: number }>; source: "mock" | "supabase" }; goal: number; loading: boolean; error: string | null; onRetry: () => void }) { if (loading) return <div className="screen"><Card><div className="auth-loading" role="status"><span className="auth-spinner" /> Loading your stats...</div></Card></div>; if (error) return <div className="screen"><Card><div className="notice notice-error" role="alert"><Wifi size={17} /><span>{error}</span></div><Button variant="secondary" onClick={onRetry}>Retry</Button></Card></div>; const today = parseMinutes(stats.metrics.today); const weeklyDays = stats.dayMins.length ? stats.dayMins : []; const best = weeklyDays.length ? Math.min(...weeklyDays) : today; const average = weeklyDays.length ? Math.round(weeklyDays.reduce((sum, day) => sum + day, 0) / weeklyDays.length) : today; const goalsMet = weeklyDays.length ? weeklyDays.filter((day) => day <= goal).length : today <= goal ? 1 : 0; const topApp = stats.source === "supabase" ? stats.apps.find((app) => app.mins > 0) : undefined; return <div className="screen"><ScreenHeader eyebrow="Your week" title="Small wins, adding up." subtitle={stats.source === "supabase" ? "Live usage from your ScreenPact account." : "Demo usage is shown until a device syncs real data."} /><SyncStatus />{topApp ? <Card className="top-app-card"><div className="section-heading"><div><h2>Most-used app today</h2><p>Based on your permitted usage summary.</p></div><Badge tone="teal">{topApp.percent || 0}%</Badge></div><div className="top-app-row"><span className="top-app-icon">{topApp.icon || "📱"}</span><div><strong>{topApp.name}</strong><span>{formatMinutes(topApp.mins)} today</span></div></div></Card> : <Card><div className="empty-state"><Smartphone size={20} /><h2>No real app usage yet</h2><p>Allow Usage Access on your phone and sync a summary to see your most-used app.</p></div></Card>}<Card className="hero-stat"><div className="stat-top"><div><span>Today’s screen time</span><strong>{stats.metrics.today}</strong></div><DataBadge source={stats.source} /></div><div className="goal-copy"><span>Daily goal</span><span>{formatMinutes(today)} of {formatMinutes(goal)}</span></div><Progress value={Math.min(100, Math.round((today / goal) * 100))} label="Daily goal progress" /><p>{formatMinutes(Math.max(0, goal - today))} left in your daily pact</p></Card><div className="stat-grid"><Card><span>Weekly average</span><strong>{stats.metrics.weeklyAvg || formatMinutes(average)}</strong><small>Across synced days</small></Card><Card><span>Group rank</span><strong>{stats.metrics.groupRank || "-"}</strong><small>Current rank</small></Card><Card><span>Best day</span><strong>{stats.metrics.bestDay || formatMinutes(best)}</strong><small>Lowest synced total</small></Card><Card><span>Goals met</span><strong>{goalsMet} of {weeklyDays.length || 1}</strong><small>Synced days</small></Card></div></div>; }

type DeviceSummaryRow = { id: string | number; name: string; platform: string; permissionStatus?: string; lastSyncedAt?: string | null };
function DeviceSummary() {
  const [devices, setDevices] = useState<DeviceSummaryRow[]>([]);
  const [pairingCode, setPairingCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = async () => { setLoading(true); setError(null); try { const response = await fetch("/api/devices", { credentials: "include" }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || "Could not load devices"); setDevices(Array.isArray(body.devices) ? body.devices : []); setPairingCode(body.pairingCode || null); } catch (deviceError) { setError(describeError(deviceError, "Could not load devices")); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const generate = async () => { setError(null); try { const response = await fetch("/api/devices/pairing-code", { method: "POST", credentials: "include", headers: csrfHeaders() }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || "Could not generate pairing code"); setPairingCode(body.pairingCode); } catch (deviceError) { setError(describeError(deviceError, "Could not generate pairing code")); } };
  return <Card className="device-list"><div className="section-heading"><div><h2>Connected devices</h2><p>Phones that upload usage summaries</p></div><Smartphone size={19} /></div>{loading ? <div className="auth-loading" role="status"><span className="auth-spinner" /> Loading devices...</div> : devices.length ? devices.map((device) => <div className="device-row" key={device.id}><span className="row-icon blue"><Smartphone size={19} /></span><div><strong>{device.name}</strong><span>{device.platform} · {device.permissionStatus || "Usage Access unknown"} · {device.lastSyncedAt ? `Synced ${new Date(device.lastSyncedAt).toLocaleString()}` : "Never synced"}</span></div></div>) : <div className="empty-state"><Smartphone size={20} /><h2>No device paired yet</h2><p>Generate a pairing code and enter it in the ScreenPact Android app.</p></div>}{error && <div className="notice notice-error" role="alert"><Wifi size={17} /><span>{error}</span></div>}{pairingCode && <div className="invite-code"><div><span>Pairing code · expires {new Date(pairingCode.expiresAt).toLocaleTimeString()}</span><strong>{pairingCode.code}</strong></div></div>}<Button variant="secondary" block icon={<Link size={15} />} onClick={() => void generate()}>Generate pairing code</Button></Card>;
}

function GroupSettings({ group, pinnedId, onSelect, onPin, onCreate, onJoin, onLeave, onRename }: { group: Group; pinnedId: string; onSelect: (id: string) => void; onPin: (id: string) => void; onCreate: (name: string) => Promise<GroupActionResult>; onJoin: (code: string) => Promise<GroupActionResult>; onLeave: () => Promise<GroupActionResult>; onRename: (groupId: string, rawName: string) => Promise<GroupActionResult> }) {
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState("");
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState("");
  const members = group.members || memberSets[group.id] || [];
  const memberTotal = (candidate: Group) => candidate.members?.length ?? memberSets[candidate.id]?.length ?? candidate.memberCount ?? 0;
  const leaveBlocked = Boolean(group.live && group.role === "owner");
  const dismiss = () => window.setTimeout(() => setNotice(null), 3500);
  const copy = async () => { try { await navigator.clipboard.writeText(group.code); setNotice({ type: "success", text: "Invite code copied." }); } catch { setNotice({ type: "error", text: "Copy was blocked. Select the code manually." }); } dismiss(); };
  const join = async () => { const normalizedCode = code.trim().toUpperCase(); if (!normalizedCode) return; setBusy(true); const result = await onJoin(normalizedCode); setBusy(false); if (!result.ok) setNotice({ type: "error", text: result.error || "Could not join group." }); else { if (result.group) onSelect(result.group.id); setNotice({ type: "success", text: `Joined ${result.group?.name || "the group"}.` }); } setCode(""); dismiss(); };
  const create = async () => { if (!createDraft.trim()) return; setBusy(true); const result = await onCreate(createDraft.trim()); setBusy(false); if (!result.ok) { setNotice({ type: "error", text: result.error || "Could not create group." }); return; } if (result.group) { onSelect(result.group.id); setNotice({ type: "success", text: `Created ${result.group.name}.` }); } setCreateDraft(""); setCreating(false); dismiss(); };
  const beginRename = (candidate: Group) => { setEditingId(candidate.id); setNameDraft(candidate.name); setNameError(""); };
  const cancelRename = () => { setEditingId(null); setNameDraft(""); setNameError(""); };
  const saveRename = async (candidate: Group) => { setBusy(true); const result = await onRename(candidate.id, nameDraft); setBusy(false); if (result.ok === false) { setNameError(result.error || "Could not rename group."); return; } cancelRename(); };
  const leave = async () => { setBusy(true); const result = await onLeave(); setBusy(false); setNotice(result.ok ? { type: "success", text: "You left the group." } : { type: "error", text: result.error || "Could not leave group." }); dismiss(); };
  const nameIsUnchanged = editingId !== null && groups.find((candidate) => candidate.id === editingId)?.name === nameDraft.trim().replace(/\s+/g, " ");
  return (<div className="screen"><ScreenHeader eyebrow={group.name} title="Group settings" subtitle="Manage your circle and invite a friend to join the pact." />{notice && <div className={`notice notice-${notice.type}`} role={notice.type === "error" ? "alert" : "status"}>{notice.type === "success" && <Check size={17} />}<span>{notice.text}</span></div>}<div className="section-heading"><div><h2>Your groups</h2><p>Switch or choose which group opens first</p></div></div><Card className="group-manager">{groups.map((candidate) => { const isEditing = editingId === candidate.id; const canRename = candidate.adminId === CURRENT_USER_ID; return <div className={`managed-group ${candidate.id === group.id ? "active" : ""}`} key={candidate.id}><div className="managed-main" role="button" tabIndex={isEditing ? -1 : 0} onClick={() => !isEditing && onSelect(candidate.id)} onKeyDown={(event) => { if (!isEditing && (event.key === "Enter" || event.key === " ")) onSelect(candidate.id); }}><span className="group-monogram">{candidate.name.split(" ").map((word) => word[0]).join("")}</span><span className="managed-copy">{isEditing ? <><input className="group-name-input" autoFocus maxLength={40} value={nameDraft} aria-label={`Rename ${candidate.name}`} onChange={(event) => { setNameDraft(event.target.value); setNameError(""); }} onKeyDown={(event) => { if (event.key === "Enter") void saveRename(candidate); if (event.key === "Escape") cancelRename(); }} /><small className="group-name-meta"><span>{nameDraft.length}/40</span>{nameError && <span className="group-name-error">{nameError}</span>}</small><span className="group-name-actions"><Button variant="primary" disabled={!nameDraft.trim() || nameIsUnchanged || busy} onClick={() => void saveRename(candidate)}>Save</Button><Button variant="secondary" disabled={busy} onClick={cancelRename}>Cancel</Button></span></> : <><strong>{candidate.name}</strong><small>{memberTotal(candidate)} members · {candidate.live ? "Synced to your account" : "This device only (demo)"}</small></>}</span></div>{canRename && !isEditing && <button className="rename-button" onClick={() => beginRename(candidate)} aria-label={`Rename ${candidate.name}`}><Pencil size={15} /></button>}<button className={`pin-button ${pinnedId === candidate.id ? "active" : ""}`} onClick={() => onPin(candidate.id)} aria-label={`Pin ${candidate.name}`}><Pin size={17} /></button></div>; })}</Card><div className="section-heading members-heading"><div><h2>Members</h2><p>{members.length} {members.length === 1 ? "person" : "people"}</p></div><Badge tone={group.live ? "teal" : "amber"}>{group.live ? "Live" : "Demo group"}</Badge></div>

    <Card className="members-card">
      <ul className="member-list">
        {members.map((member, index) => {
          const isAdmin = member.role ? member.role === "owner" : member.you && group.adminId === CURRENT_USER_ID;
          return (
            <li className={`member-item ${member.you ? "is-you" : ""}`} key={member.name}>
              <Avatar member={member} size="md" />
              <div className="member-info">
                <div className="member-title">
                  <strong>{member.name}</strong>
                  {member.you && <Badge>You</Badge>}
                </div>
                <div className="member-role">
                  {isAdmin ? <Badge tone="amber"><Shield size={11} /> Admin</Badge> : "Member"}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>

    <Card className="invite-card"><Link size={22} /><h2>Invite someone</h2><p>Your invite code is ready to share with {group.name}.</p><div className="invite-code"><div><span>Invite code</span><strong>{group.code}</strong></div><Button variant="secondary" icon={<Copy size={15} />} onClick={copy}>Copy</Button></div></Card><Card><h2>Join another group</h2><p className="card-subtitle">Enter an invite code.</p><div className="input-row"><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="e.g. BOOKCLUB" /><Button disabled={!code.trim() || busy} onClick={() => void join()}>{busy ? "Joining..." : "Join"}</Button></div></Card>{creating ? <Card><h2>Create a group</h2><div className="input-row"><input autoFocus value={createDraft} onChange={(event) => setCreateDraft(event.target.value)} maxLength={40} placeholder="Group name" /><Button disabled={!createDraft.trim() || busy} onClick={() => void create()}>{busy ? "Creating..." : "Create"}</Button></div><Button variant="secondary" onClick={() => { setCreating(false); setCreateDraft(""); }}>Cancel</Button></Card> : <Button variant="secondary" block icon={<Plus size={17} />} disabled={busy} onClick={() => setCreating(true)}>Create a new group</Button>}<Button variant="danger" block disabled={groups.length <= 1 || busy || leaveBlocked} onClick={() => void leave()}>{leaveBlocked ? "Owners can’t leave" : `Leave ${group.name}`}</Button>{(leaveBlocked || groups.length <= 1) && <p className="card-subtitle">{leaveBlocked ? "Owners can’t leave a live group yet." : "You need to keep at least one group."}</p>}</div>);
}

function Profile({ goal, navigate, profile, loading, error }: { goal: number; navigate: (screen: Screen) => void; profile: ApiProfile | null; loading: boolean; error: string | null }) { if (loading) return <div className="screen"><Card><div className="auth-loading" role="status"><span className="auth-spinner" /> Loading your profile...</div></Card></div>; if (error || !profile) return <div className="screen"><Card><div className="notice notice-error" role="alert"><Wifi size={17} /><span>{error || "Profile data is unavailable."}</span></div><Button variant="secondary" onClick={() => window.location.reload()}>Retry</Button></Card></div>; return <div className="screen"><ScreenHeader eyebrow="Your profile" title="Profile" /><Card className="profile-card"><Avatar member={{ name: profile.displayName, tone: toTone(profile.avatar) }} size="xl" /><div><h2>{profile.displayName}</h2><p>Joined {profile.memberSince} · {profile.groupsCount} group{profile.groupsCount === 1 ? "" : "s"}</p><Badge tone="teal"><Target size={12} /> {profile.rank ? `Rank #${profile.rank}` : "Unranked"}</Badge></div><Button variant="secondary" icon={<Settings size={15} />} onClick={() => navigate("settings")}>Edit settings</Button></Card><button className="goal-card" onClick={() => navigate("settings")}><span className="row-icon teal"><Target size={20} /></span><span className="setting-copy"><span>Daily screen-time goal</span><strong>{formatMinutes(goal)}</strong><small>{profile.avgDailyMinutes ? `Average: ${formatMinutes(profile.avgDailyMinutes)}` : "No data yet"}</small></span></button><div className="section-heading"><div><h2>Achievements</h2><p>Milestones from your account</p></div></div><Card className="device-list">{profile.achievements.length ? profile.achievements.map((achievement) => <div className="device-row" key={`${achievement.label}-${achievement.value}`}><span className="row-icon teal"><Trophy size={19} /></span><div><strong>{achievement.label}</strong><span>{achievement.value}</span></div></div>) : <div className="empty-state"><Trophy size={20} /><h2>No achievements yet</h2><p>Keep syncing to unlock milestones.</p></div>}</Card><DeviceSummary /><Card className="privacy-card"><button onClick={() => navigate("settings")}><span className="row-icon blue"><Settings size={19} /></span><div><strong>App settings &amp; sign out</strong><span>Notifications, theme, goal, and sign out are in Settings.</span></div><ChevronRight size={18} /></button></Card></div>; }

function BottomNav({ screen, navigate }: { screen: Screen; navigate: (screen: Screen) => void }) { return <nav className="bottom-nav"><button className={screen === "leaderboard" ? "active" : ""} onClick={() => navigate("leaderboard")}><Users size={19} /><span>Groups</span></button><button className={screen === "stats" ? "active" : ""} onClick={() => navigate("stats")}><Clock3 size={19} /><span>My Stats</span></button><button className={screen === "group" ? "active" : ""} onClick={() => navigate("group")}><Settings size={19} /><span>Group Settings</span></button></nav>; }

function AppShell() {
  const [screen, setScreen] = useState<Screen>("leaderboard");
  const [dark, setDark] = useState(() => localStorage.getItem("sp.darkMode") === "true");
  const [notifications, setNotifications] = useState(() => localStorage.getItem("sp.notifications") !== "false");
  const [goal, setGoal] = useState(() => Number(localStorage.getItem("sp.dailyGoalMinutes")) || DEFAULT_GOAL);
  const [activeId, setActiveId] = useState("study");
  const [pinnedId, setPinnedId] = useState(() => localStorage.getItem("sp.pinnedId") || "study");
  const [lockInPing, setLockInPing] = useState<string | null>(null);
  const [groupVersion, setGroupVersion] = useState(0);
  const [leaderboardMembers, setLeaderboardMembers] = useState<Member[]>([]);
  const [leaderboardSource, setLeaderboardSource] = useState<DataSource | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ metrics: { today: string; weeklyAvg: string; groupRank: string; bestDay: string }; dayMins: number[]; apps: Array<{ name: string; mins: number; icon?: string; percent?: number }>; source: "mock" | "supabase" } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [profile, setProfile] = useState<ApiProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const activeGroup = groups.find((group) => group.id === activeId) ?? groups[0];
  useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; localStorage.setItem("sp.darkMode", String(dark)); }, [dark]);
  useEffect(() => { localStorage.setItem("sp.notifications", String(notifications)); }, [notifications]);
  useEffect(() => { localStorage.setItem("sp.dailyGoalMinutes", String(goal)); }, [goal]);
  useEffect(() => { localStorage.setItem("sp.pinnedId", pinnedId); }, [pinnedId]);
  useEffect(() => { if (!lockInPing) return; const timer = window.setTimeout(() => setLockInPing(null), 1800); return () => window.clearTimeout(timer); }, [lockInPing]);
  const loadLeaderboard = async () => {
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    try {
      const response = await fetch("/api/leaderboard", { credentials: "include" });
      const body = await response.json();
      if (response.ok === false) throw new Error(body.error || "Could not load today’s leaderboard");
      if (!Array.isArray(body.members)) throw new Error("Leaderboard response was invalid");
      setLeaderboardSource(body.source === "supabase" ? "supabase" : "mock");
      setLeaderboardMembers(mapApiMembers(body.members));
    } catch (error) {
      setLeaderboardError(error instanceof Error ? error.message : "Could not load today’s leaderboard");
    } finally {
      setLeaderboardLoading(false);
    }
  };
  const loadStats = async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const response = await fetch("/api/my-stats", { credentials: "include" });
      const body = await response.json();
      if (response.ok === false) throw new Error(body.error || "Could not load your stats");
      if (!body.metrics || !Array.isArray(body.dayMins) || !Array.isArray(body.apps)) throw new Error("Stats response was invalid");
      setStats({ metrics: body.metrics, dayMins: body.dayMins, apps: body.apps, source: body.source === "supabase" ? "supabase" : "mock" });
    } catch (error) {
      setStatsError(error instanceof Error ? error.message : "Could not load your stats");
    } finally {
      setStatsLoading(false);
    }
  };
  const loadSettings = async () => {
    try {
      const response = await fetch("/api/settings", { credentials: "include" });
      const body = await response.json();
      if (response.ok === false) throw new Error(body.error || "Could not load settings");
      if (typeof body.darkMode !== "boolean" || typeof body.notifications !== "boolean" || !Number.isInteger(body.dailyGoalMinutes)) throw new Error("Settings response was invalid");
      setDark(body.darkMode);
      setNotifications(body.notifications);
      setGoal(body.dailyGoalMinutes);
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Could not load settings");
    }
  };
  const persistSettings = async (next: { darkMode?: boolean; notifications?: boolean; dailyGoalMinutes?: number }) => {
    const previous = { darkMode: dark, notifications, dailyGoalMinutes: goal };
    const updated = { ...previous, ...next };
    setDark(updated.darkMode);
    setNotifications(updated.notifications);
    setGoal(updated.dailyGoalMinutes);
    setSettingsSaving(true);
    setSettingsError(null);
    try {
      const response = await fetch("/api/settings", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json", ...csrfHeaders() }, body: JSON.stringify(updated) });
      const body = await response.json();
      if (response.ok === false) throw new Error(body.error || "Could not save settings");
    } catch (error) {
      setDark(previous.darkMode);
      setNotifications(previous.notifications);
      setGoal(previous.dailyGoalMinutes);
      setSettingsError(error instanceof Error ? error.message : "Could not save settings");
    } finally {
      setSettingsSaving(false);
    }
  };
  const loadProfile = async () => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const response = await fetch("/api/profile", { credentials: "include" });
      const body = await response.json();
      if (response.ok === false) throw new Error(body.error || "Could not load profile");
      if (typeof body.displayName !== "string" || !Array.isArray(body.achievements)) throw new Error("Profile response was invalid");
      setProfile(body);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Could not load profile");
    } finally {
      setProfileLoading(false);
    }
  };
  useEffect(() => { void loadSettings(); }, []);
  useEffect(() => { void loadProfile(); }, []);
  useEffect(() => { void loadLeaderboard(); void loadStats(); }, []);
  const persistGroups = () => localStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify(groups));
  const reset = () => { setDark(false); setNotifications(true); setGoal(DEFAULT_GOAL); setActiveId("study"); setPinnedId("study"); localStorage.removeItem("sp.customGroups"); localStorage.removeItem(GROUP_STORAGE_KEY); localStorage.removeItem("sp.darkMode"); localStorage.removeItem("sp.notifications"); localStorage.removeItem("sp.dailyGoalMinutes"); groups = [{ id: "study", name: "Study Squad", note: "Your focused friends", code: "STUDY42", adminId: CURRENT_USER_ID }, { id: "roomies", name: "Roomies", note: "Less scroll, more hangs", code: "ROOMIES", adminId: CURRENT_USER_ID }, { id: "book", name: "Book Club", note: "Read more together", code: "BOOKCLUB", adminId: CURRENT_USER_ID }]; setGroupVersion((version) => version + 1); };
  const toGroup = (value: { id: string; name: string; inviteCode: string; createdBy: string; role?: "owner" | "member"; memberCount?: number; members?: Array<{ name: string; initials: string; avatar: string; you: boolean; role?: "owner" | "member" }> }): Group => ({ id: value.id, name: value.name, note: `${value.memberCount || 1} member${value.memberCount === 1 ? "" : "s"}`, code: value.inviteCode, adminId: value.createdBy, role: value.role, memberCount: value.memberCount, live: true, members: value.members?.map((member) => ({ name: member.name, minutes: 0, app: "Not synced", trend: "same", delta: 0, tone: toTone(member.avatar), you: member.you, role: member.role })) });
  const loadGroups = useCallback(async () => { try { const response = await fetch("/api/groups", { credentials: "include" }); const body = await response.json(); if (!response.ok || body.source !== "supabase" || !Array.isArray(body.groups) || !body.groups.length) return; groups = body.groups.map(toGroup); setActiveId((current) => groups.some((group) => group.id === current) ? current : groups[0].id); setPinnedId((current) => groups.some((group) => group.id === current) ? current : groups[0].id); setGroupVersion((version) => version + 1); } catch { /* keep the local demo groups available offline */ } }, []);
  useEffect(() => { try { const savedGroups = JSON.parse(localStorage.getItem(GROUP_STORAGE_KEY) || "null") as Group[] | null; if (Array.isArray(savedGroups) && savedGroups.length) groups = savedGroups.map((group) => ({ ...group, adminId: group.adminId || CURRENT_USER_ID })); readCustomGroups().forEach(({ group, members }) => { if (!groups.some((candidate) => candidate.id === group.id)) { groups = [...groups, { ...group, adminId: group.adminId || CURRENT_USER_ID }]; memberSets[group.id] = members; } }); setGroupVersion((version) => version + 1); void loadGroups(); } catch { /* ignore invalid local demo data */ } }, [loadGroups]);
  const localCreateGroup = (name: string): Group => { const id = `custom-${Date.now()}`; const newGroup: Group = { id, name, note: "Your new screen-time pact", code: `PACT${Math.floor(1000 + Math.random() * 9000)}`, adminId: CURRENT_USER_ID, role: "owner", memberCount: 1 }; const members = [{ name: "You", minutes: 0, app: "None", trend: "same" as const, delta: 0, tone: "blue" as Tone, you: true }]; groups = [...groups, newGroup]; memberSets[id] = members; persistGroups(); localStorage.setItem("sp.customGroups", JSON.stringify([...readCustomGroups(), { group: newGroup, members }])); setGroupVersion((version) => version + 1); setActiveId(id); setPinnedId(id); return newGroup; };
  const createGroup = async (name: string): Promise<GroupActionResult> => { const validation = validateGroupName(name); if (!validation.ok) return validation; try { const response = await fetch("/api/groups", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", ...csrfHeaders() }, body: JSON.stringify({ name: validation.name }) }); const body = await response.json(); if (response.ok && body.source === "supabase") { const created = toGroup(body.group); groups = [...groups, created]; setGroupVersion((version) => version + 1); setActiveId(created.id); setPinnedId(created.id); return { ok: true, group: created }; } if (response.status !== 503) return { ok: false, error: body.error || "Could not create group" }; } catch { /* use local demo fallback */ } return { ok: true, group: localCreateGroup(validation.name) }; };
  const onJoinGroup = async (code: string): Promise<GroupActionResult> => { try { const response = await fetch("/api/groups/join", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", ...csrfHeaders() }, body: JSON.stringify({ inviteCode: code }) }); const body = await response.json(); if (response.ok && body.source === "supabase") { const joined = toGroup(body.group); groups = groups.some((candidate) => candidate.id === joined.id) ? groups : [...groups, joined]; setGroupVersion((version) => version + 1); return { ok: true, group: joined }; } if (response.status !== 503) return { ok: false, error: body.error || "Could not join group" }; } catch { /* use local demo fallback */ } const found = groups.find((candidate) => candidate.code === code); return found ? { ok: true, group: found } : { ok: false, error: "We couldn’t find that group." }; };
  const renameGroup = async (groupId: string, rawName: string): Promise<GroupActionResult> => { const validation = validateGroupName(rawName); if (!validation.ok) return validation; const group = groups.find((candidate) => candidate.id === groupId); if (!group) return { ok: false, error: "Group not found." }; try { const response = await fetch(`/api/groups/${groupId}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json", ...csrfHeaders() }, body: JSON.stringify({ name: validation.name }) }); const body = await response.json(); if (response.ok && body.source === "supabase") { const updated = toGroup(body.group); groups = groups.map((candidate) => candidate.id === groupId ? { ...candidate, ...updated } : candidate); setGroupVersion((version) => version + 1); return { ok: true, group: updated }; } if (response.status !== 503) return { ok: false, error: body.error || "Could not rename group" }; } catch { /* use local demo fallback */ } if (group.adminId !== CURRENT_USER_ID) return { ok: false, error: "Only the admin can rename this group." }; const updated = { ...group, name: validation.name }; groups = groups.map((candidate) => candidate.id === groupId ? updated : candidate); persistGroups(); setGroupVersion((version) => version + 1); return { ok: true, group: updated }; };
  const leaveGroup = async (): Promise<GroupActionResult> => { if (groups.length <= 1) return { ok: false, error: "You must keep at least one group." }; try { const response = await fetch(`/api/groups/${activeGroup.id}/membership`, { method: "DELETE", credentials: "include", headers: csrfHeaders() }); const body = await response.json(); if (response.ok && body.source === "supabase") { groups = groups.filter((candidate) => candidate.id !== activeGroup.id); setGroupVersion((version) => version + 1); const next = groups[0]; setActiveId(next.id); setPinnedId(next.id); return { ok: true, group: next }; } if (response.status !== 503) return { ok: false, error: body.error || "Could not leave group" }; } catch { /* use local demo fallback */ } const remaining = groups.filter((candidate) => candidate.id !== activeGroup.id); groups = remaining; delete memberSets[activeGroup.id]; persistGroups(); localStorage.setItem("sp.customGroups", JSON.stringify(readCustomGroups().filter((entry) => entry.group.id !== activeGroup.id))); setGroupVersion((version) => version + 1); setActiveId(remaining[0].id); setPinnedId(remaining[0].id); return { ok: true, group: remaining[0] }; };
  const handleLockIn = () => { const random = LOCK_IN_PHRASES[Math.floor(Math.random() * LOCK_IN_PHRASES.length)]; setLockInPing(random); };
  const logout = async () => { try { await fetch("/api/auth/logout", { method: "POST", credentials: "include", headers: csrfHeaders() }); } finally { window.location.reload(); } };
  const navigate = (next: Screen) => { setScreen(next); window.scrollTo({ top: 0 }); };
  const online = useOnlineStatus();
  return <div className="app"><div className="phone-shell"><Header navigate={navigate} />{!online && <div className="offline-banner" role="status"><WifiOff size={15} /> You’re offline. Changes can’t be saved.</div>}<main>{screen === "leaderboard" && <Leaderboard members={leaderboardMembers} source={leaderboardSource} loading={leaderboardLoading} error={leaderboardError} onRetry={loadLeaderboard} pinnedId={pinnedId} onPin={setPinnedId} lockInPing={lockInPing} onLockIn={handleLockIn} onGoStats={() => navigate("stats")} />}{screen === "stats" && <Stats stats={stats ?? { metrics: { today: "0m", weeklyAvg: "0m", groupRank: "-", bestDay: "0m" }, dayMins: [], apps: [], source: "mock" }} goal={goal} loading={statsLoading} error={statsError} onRetry={loadStats} />}{screen === "group" && <GroupSettings group={activeGroup} pinnedId={pinnedId} onSelect={setActiveId} onPin={setPinnedId} onCreate={createGroup} onJoin={onJoinGroup} onLeave={leaveGroup} onRename={renameGroup} />}{screen === "profile" && <Profile goal={goal} navigate={navigate} profile={profile} loading={profileLoading} error={profileError} />}{screen === "settings" && <SettingsPanel dark={dark} setDark={(value) => { void persistSettings({ darkMode: value }); }} notifications={notifications} setNotifications={(value) => { void persistSettings({ notifications: value }); }} goal={goal} setGoal={(value) => { void persistSettings({ dailyGoalMinutes: value }); }} onReset={reset} onLogout={() => { void logout(); }} apiError={settingsError} saving={settingsSaving} />}</main><BottomNav screen={screen} navigate={navigate} /></div></div>;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [recovery, setRecovery] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (recovery) {
      setChecked(true);
      return;
    }
    fetch("/api/auth/session", { credentials: "include" })
      .then((response) => response.json())
      .then((session) => setAuthenticated(Boolean(session.authenticated)))
      .catch(() => setAuthenticated(false))
      .finally(() => setChecked(true));
  }, [recovery]);

  const submitForgotPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Could not send the reset link");
      setMessage("Check your email for a password reset link.");
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Could not send the reset link");
    } finally {
      setLoading(false);
    }
  };

  const submitResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const params = new URLSearchParams(window.location.hash.slice(1));
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: params.get("access_token"), refreshToken: params.get("refresh_token"), password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Could not update your password");
      window.history.replaceState({}, document.title, window.location.pathname);
      setRecovery(false);
      setMode("login");
      setPassword("");
      setConfirmPassword("");
      setMessage("Your password was updated. Sign in with your new password.");
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Could not update your password");
    } finally {
      setLoading(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/signup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
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

  if (recovery) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-brand"><span className="auth-brand-mark" aria-hidden="true"><Clock3 size={19} /></span><span>ScreenPact</span></div>
          <div className="auth-heading"><p className="auth-kicker">Account recovery</p><h1>Create a new password</h1><p>Choose a new password for your ScreenPact account.</p></div>
          <form className="auth-form" onSubmit={submitResetPassword}>
            <div className="auth-field"><label htmlFor="reset-password">New password</label><input id="reset-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={6} required /></div>
            <div className="auth-field"><label htmlFor="reset-confirm-password">Confirm password</label><input id="reset-confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={6} required /></div>
            {error && <div className="auth-error" role="alert">{error}</div>}
            <button className="auth-submit" type="submit" disabled={loading}>{loading ? "Updating..." : "Update password"}</button>
          </form>
        </div>
      </div>
    );
  }

  if (mode === "forgot") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-brand"><span className="auth-brand-mark" aria-hidden="true"><Clock3 size={19} /></span><span>ScreenPact</span></div>
          <div className="auth-heading"><p className="auth-kicker">Account recovery</p><h1>Forgot your password?</h1><p>We’ll send a secure reset link to your email.</p></div>
          <form className="auth-form" onSubmit={submitForgotPassword}>
            <div className="auth-field"><label htmlFor="forgot-email">Email</label><input id="forgot-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required /></div>
            {error && <div className="auth-error" role="alert">{error}</div>}
            {message && <div className="auth-success" role="status">{message}</div>}
            <button className="auth-submit" type="submit" disabled={loading}>{loading ? "Sending..." : "Send reset link"}</button>
          </form>
          <div className="auth-switch"><button type="button" onClick={() => { setMode("login"); setError(""); setMessage(""); }}>Back to sign in</button></div>
        </div>
      </div>
    );
  }

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
          {message && <div className="auth-success" role="status">{message}</div>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading && <span className="auth-spinner" aria-hidden="true" />}
            {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        {mode === "login" && <button className="auth-link" type="button" onClick={() => { setMode("forgot"); setError(""); setMessage(""); }}>Forgot password?</button>}

        <div className="auth-switch">
          <span>{mode === "login" ? "New to ScreenPact?" : "Already have an account?"}</span>
          <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}>{mode === "login" ? "Create an account" : "Sign in"}</button>
        </div>
      </div>
      <p className="auth-footer">Less scrolling. More life.</p>
    </div>
  );
}

export default function ScreenPactApp() {
  return <AuthGate><AppShell /></AuthGate>;
}
