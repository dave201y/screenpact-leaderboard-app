import { useState, type ReactNode } from "react";

type Screen = "leaderboard" | "stats" | "group" | "profile" | "settings";
type IconName =
  | "trophy" | "chart" | "users" | "settings" | "user" | "clock" | "flame"
  | "arrowUp" | "arrowDown" | "minus" | "link" | "copy" | "plus" | "leave"
  | "phone" | "shield" | "bell" | "moon" | "refresh" | "chevron" | "check"
  | "wifi" | "edit" | "target" | "alert" | "pin";

const paths: Record<IconName, ReactNode> = {
  trophy: <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4"/></>,
  chart: <><path d="M4 19V9M10 19V5M16 19v-7M22 19V3"/></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1 1.55V21h-4v-.08a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3v-4h.08a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3h4v.08a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.12.37.2.66.2 1H21v4h-1.4c0 .34-.08.63-.2 1Z"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  flame: <path d="M12 22c4 0 7-3 7-7 0-3-2-6-5-9 0 3-2 4-3 5 0-3-1-6-3-8 0 5-3 7-3 12 0 4 3 7 7 7Z"/>,
  arrowUp: <><path d="m6 15 6-6 6 6"/><path d="M12 9v10"/></>,
  arrowDown: <><path d="m6 9 6 6 6-6"/><path d="M12 5v10"/></>,
  minus: <path d="M5 12h14"/>,
  link: <><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1"/></>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  leave: <><path d="M10 17l5-5-5-5M15 12H3M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5"/></>,
  phone: <><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 18h4"/></>,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
  moon: <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 9A7 7 0 0 1 18 6l2 3M17.9 15A7 7 0 0 1 6 18l-2-3"/></>,
  chevron: <path d="m9 18 6-6-6-6"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  wifi: <><path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="20" r=".6" fill="currentColor"/></>,
  edit: <><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></>,
  target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></>,
  alert: <><path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5M12 17h.01"/></>,
  pin: <><path d="m15 4 5 5-3 1-4 4 1 3-2 2-7-7 2-2 3 1 4-4 1-3Z"/><path d="m5 19-2 2"/></>,
};

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Button({ children, onClick, variant = "primary", icon, className = "", type = "button" }: {
  children: ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: IconName; className?: string; type?: "button" | "submit";
}) {
  return <button type={type} onClick={onClick} className={`btn btn-${variant} ${className}`}>{icon && <Icon name={icon} size={18}/>}<span>{children}</span></button>;
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

const avatars: Record<string, { initials: string; tone: string }> = {
  Maya: { initials: "MK", tone: "teal" }, Theo: { initials: "TB", tone: "amber" },
  You: { initials: "JS", tone: "blue" }, Lena: { initials: "LP", tone: "coral" },
  Amir: { initials: "AN", tone: "green" },
  Noah: { initials: "NW", tone: "blue" }, Priya: { initials: "PS", tone: "coral" },
  Jules: { initials: "JR", tone: "teal" }, Elena: { initials: "ER", tone: "teal" },
  Marcus: { initials: "ML", tone: "blue" }, Nia: { initials: "NB", tone: "coral" },
  Owen: { initials: "OK", tone: "green" }, Imani: { initials: "IC", tone: "amber" },
  Rosa: { initials: "RV", tone: "teal" },
};

function Avatar({ name, size = "md", online = false }: { name: string; size?: "sm" | "md" | "lg" | "xl"; online?: boolean }) {
  const avatar = avatars[name] || { initials: name.slice(0, 2), tone: "blue" };
  return <div className={`avatar avatar-${size} avatar-${avatar.tone}`} aria-label={`${name}'s avatar`}><span>{avatar.initials}</span>{online && <i />}</div>;
}

function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "teal" | "amber" | "coral" | "blue" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function Progress({ value, tone = "teal" }: { value: number; tone?: "teal" | "amber" | "coral" }) {
  return <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><span className={`progress-fill fill-${tone}`} style={{ width: `${value}%` }}/></div>;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return <button className={`toggle ${checked ? "is-on" : ""}`} role="switch" aria-checked={checked} aria-label={label} onClick={onChange}><span /></button>;
}

function TopBar({ navigate }: { navigate: (screen: Screen) => void }) {
  return <header className="topbar">
    <button className="brand" onClick={() => navigate("leaderboard")} aria-label="ScreenPact home">
      <span className="logo"><Icon name="clock" size={18}/></span><strong>ScreenPact</strong>
    </button>
    <div className="top-actions">
      <button className="icon-btn" onClick={() => navigate("profile")} aria-label="Open profile"><Icon name="user" size={19}/></button>
      <button className="icon-btn" onClick={() => navigate("settings")} aria-label="Open settings"><Icon name="settings" size={19}/></button>
    </div>
  </header>;
}

function ScreenHeader({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return <div className="screen-header">{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>;
}

type Member = { rank: number; name: string; time: string; app: string; trend: "down" | "up" | "same"; delta: string };

const groupMembers: Record<string, Member[]> = {
  study: [
    { rank: 1, name: "Maya", time: "1h 12m", app: "Messages", trend: "down", delta: "18m" },
    { rank: 2, name: "Theo", time: "1h 38m", app: "YouTube", trend: "up", delta: "9m" },
    { rank: 3, name: "You", time: "1h 54m", app: "Instagram", trend: "down", delta: "12m" },
    { rank: 4, name: "Lena", time: "2h 17m", app: "TikTok", trend: "same", delta: "0m" },
    { rank: 5, name: "Amir", time: "2h 43m", app: "Safari", trend: "up", delta: "21m" },
  ],
  roomies: [
    { rank: 1, name: "Noah", time: "58m", app: "Spotify", trend: "down", delta: "24m" },
    { rank: 2, name: "You", time: "1h 54m", app: "Instagram", trend: "down", delta: "12m" },
    { rank: 3, name: "Priya", time: "2h 06m", app: "Messages", trend: "up", delta: "7m" },
    { rank: 4, name: "Jules", time: "2h 31m", app: "YouTube", trend: "same", delta: "0m" },
  ],
  book: [
    { rank: 1, name: "Elena", time: "47m", app: "Books", trend: "down", delta: "31m" },
    { rank: 2, name: "Marcus", time: "1h 03m", app: "Safari", trend: "down", delta: "15m" },
    { rank: 3, name: "Nia", time: "1h 29m", app: "Messages", trend: "up", delta: "5m" },
    { rank: 4, name: "You", time: "1h 54m", app: "Instagram", trend: "down", delta: "12m" },
    { rank: 5, name: "Owen", time: "2h 08m", app: "Reddit", trend: "up", delta: "17m" },
    { rank: 6, name: "Imani", time: "2h 22m", app: "YouTube", trend: "same", delta: "0m" },
    { rank: 7, name: "Rosa", time: "2h 51m", app: "TikTok", trend: "up", delta: "26m" },
  ],
};

const groups = [
  { id: "study", name: "Study Squad", members: 5, accent: "ocean", note: "Your focused friends" },
  { id: "roomies", name: "Roomies", members: 4, accent: "apricot", note: "Less scroll, more hangs" },
  { id: "book", name: "Book Club", members: 7, accent: "sage", note: "Read more together" },
];

function Leaderboard({ activeGroup, pinnedGroup, onSelectGroup, onPinGroup }: {
  activeGroup: string; pinnedGroup: string; onSelectGroup: (id: string) => void; onPinGroup: (id: string) => void;
}) {
  const active = groups.find(group => group.id === activeGroup) ?? groups[0];
  const members = groupMembers[active.id];
  const winner = members[0];
  const currentUser = members.find(member => member.name === "You");
  const orderedGroups = [...groups].sort(group => group.id === pinnedGroup ? -1 : 1);
  return <div className="screen">
    <div className="group-switcher-head">
      <div><div className="eyebrow">Your circles</div><h2>Choose a group</h2></div>
      <Badge tone="blue">{groups.length} groups</Badge>
    </div>
    <div className="group-switcher" aria-label="Your groups">
      {orderedGroups.map(group => <button key={group.id} className={`group-chip group-${group.accent} ${activeGroup === group.id ? "active" : ""}`} onClick={() => onSelectGroup(group.id)}>
        <span className="group-monogram">{group.name.split(" ").map(word => word[0]).join("")}</span>
        <span className="group-chip-copy"><strong>{group.name}</strong><small>{group.members} members</small></span>
        {pinnedGroup === group.id && <span className="pin-mark"><Icon name="pin" size={12}/> Pinned</span>}
      </button>)}
    </div>
    <div className="group-heading">
      <div><div className="eyebrow">Active group · {active.members} members</div><h1>{active.name}</h1></div>
      <div className="countdown"><Icon name="clock" size={16}/><span><b>8h 24m</b> left</span></div>
    </div>
    <div className="group-context">
      <span>{active.note}</span>
      <button className={pinnedGroup === active.id ? "is-pinned" : ""} onClick={() => onPinGroup(active.id)}><Icon name="pin" size={14}/>{pinnedGroup === active.id ? "Pinned to home" : "Pin to home"}</button>
    </div>
    <Card className="winner-card">
      <div className="winner-glow"/>
      <div className="winner-label"><Icon name="trophy" size={17}/><span>Today’s quiet champion</span></div>
      <div className="winner-content">
        <Avatar name={winner.name} size="xl" online/>
        <div className="winner-copy"><h2>{winner.name}’s in the lead</h2><p>Just {winner.time} today — leading {active.name}.</p></div>
      </div>
      <div className="winner-footer"><span>Keep it up, {winner.name}</span><Badge tone="amber"><Icon name="flame" size={13}/> 3 day streak</Badge></div>
    </Card>
    <div className="section-heading"><div><h2>Today’s standings</h2><p>Lower screen time ranks higher</p></div><Badge tone="teal">Live</Badge></div>
    <div className="leader-list">
      {members.map((member, index) => <div className={`leader-row ${member.name === "You" ? "is-you" : ""}`} key={member.name} style={{ animationDelay: `${index * 70}ms` }}>
        <div className={`rank rank-${member.rank}`}>{member.rank}</div>
        <Avatar name={member.name} size="md"/>
        <div className="member-main"><div className="member-name">{member.name}{member.name === "You" && <Badge tone="blue">You</Badge>}</div><div className="member-app">{member.app} · most used</div></div>
        <div className="member-score"><strong>{member.time}</strong><span className={`trend trend-${member.trend}`}><Icon name={member.trend === "down" ? "arrowDown" : member.trend === "up" ? "arrowUp" : "minus"} size={13}/>{member.delta}</span></div>
      </div>)}
    </div>
    <div className="encouragement"><span className="encourage-icon"><Icon name="target" size={19}/></span><p><strong>You’re currently #{currentUser?.rank ?? "—"} in {active.name}.</strong><br/>A small offline break could move you up.</p></div>
  </div>;
}

function Stats() {
  const bars = [42, 63, 50, 76, 56, 34, 46];
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return <div className="screen">
    <ScreenHeader eyebrow="Your week" title="Small wins, adding up." subtitle="You’re 16% below your weekly average today."/>
    <Card className="hero-stat">
      <div className="stat-top"><div><span>Today’s screen time</span><strong>1h 54m</strong></div><Badge tone="teal"><Icon name="arrowDown" size={14}/> 22m</Badge></div>
      <div className="goal-copy"><span>Daily goal</span><span>1h 54m of 2h 30m</span></div>
      <Progress value={76}/>
      <p>36 minutes left in your daily pact</p>
    </Card>
    <div className="stat-grid">
      <Card><Icon name="chart" size={19}/><span>Weekly average</span><strong>2h 16m</strong><small>−8% vs last week</small></Card>
      <Card><Icon name="trophy" size={19}/><span>Group rank</span><strong>#3</strong><small>of 5 members</small></Card>
      <Card><Icon name="flame" size={19}/><span>Best day</span><strong>1h 21m</strong><small>Saturday</small></Card>
      <Card><Icon name="target" size={19}/><span>Goals met</span><strong>4 of 7</strong><small>This week</small></Card>
    </div>
    <Card className="chart-card">
      <div className="section-heading"><div><h2>Weekly rhythm</h2><p>Daily screen time</p></div><span className="chart-goal">Goal 2h 30m</span></div>
      <div className="chart" aria-label="Weekly screen time bar chart">{bars.map((height, i) => <div className="bar-wrap" key={i}><div className={`bar ${i === 6 ? "today" : ""}`} style={{ height: `${height}%` }}><span>{i === 6 ? "1h54" : ""}</span></div><small>{days[i]}</small></div>)}</div>
    </Card>
    <Card className="apps-card">
      <div className="section-heading"><div><h2>Most-used apps</h2><p>Today</p></div></div>
      {[["Instagram", "38m", 68, "coral"], ["Messages", "26m", 47, "teal"], ["Safari", "21m", 38, "amber"]].map(([name, time, value, tone]) => <div className="app-row" key={name as string}><div className={`app-icon app-${tone}`}>{(name as string)[0]}</div><div className="app-data"><div><strong>{name}</strong><span>{time}</span></div><Progress value={value as number} tone={tone === "coral" ? "coral" : tone === "amber" ? "amber" : "teal"}/></div></div>)}
    </Card>
  </div>;
}

function GroupSettings({ activeGroup, pinnedGroup, onSelectGroup, onPinGroup }: {
  activeGroup: string; pinnedGroup: string; onSelectGroup: (id: string) => void; onPinGroup: (id: string) => void;
}) {
  const active = groups.find(group => group.id === activeGroup) ?? groups[0];
  const members = groupMembers[active.id];
  const [notice, setNotice] = useState<"none" | "success" | "error" | "loading">("none");
  const copy = () => { setNotice("success"); setTimeout(() => setNotice("none"), 2200); };
  const join = () => { setNotice("loading"); setTimeout(() => setNotice("error"), 900); };
  return <div className="screen">
    <ScreenHeader eyebrow={active.name} title="Group settings" subtitle="Manage your circle and invite a friend to join the pact."/>
    <div className="section-heading"><div><h2>Your groups</h2><p>Switch or choose which group opens first</p></div></div>
    <Card className="group-manager">
      {groups.map(group => <div className={`managed-group ${activeGroup === group.id ? "active" : ""}`} key={group.id}>
        <button className="managed-main" onClick={() => onSelectGroup(group.id)}>
          <span className={`group-monogram group-${group.accent}`}>{group.name.split(" ").map(word => word[0]).join("")}</span>
          <span><strong>{group.name}</strong><small>{group.members} members · {group.note}</small></span>
        </button>
        <button className={`pin-button ${pinnedGroup === group.id ? "active" : ""}`} onClick={() => onPinGroup(group.id)} aria-label={`Pin ${group.name} to home`}><Icon name="pin" size={17}/></button>
      </div>)}
    </Card>
    {notice === "success" && <div className="notice notice-success"><Icon name="check" size={18}/><span><strong>Invite copied</strong> Ready to share with a friend.</span></div>}
    {notice === "error" && <div className="notice notice-error"><Icon name="alert" size={18}/><span><strong>We couldn’t find that group.</strong> Check the code and try again.</span></div>}
    {notice === "loading" && <div className="notice"><span className="spinner"/><span><strong>Looking for your group…</strong> This will only take a moment.</span></div>}
    <div className="section-heading"><div><h2>Members</h2><p>5 people · 3 active now</p></div></div>
    <Card className="members-card">
      {members.map((member, index) => <div className="settings-member" key={member.name}><Avatar name={member.name} size="sm" online={index < 3}/><div><strong>{member.name === "You" ? "Jamie Stone" : member.name}</strong><span>{member.name === "You" ? "You · Admin" : index === 0 ? "Admin" : "Member"}</span></div>{index < 3 && <Badge tone="teal">Active</Badge>}</div>)}
    </Card>
    <Card className="invite-card">
      <div className="card-icon"><Icon name="link"/></div><h2>Invite someone</h2><p>Your link expires in 7 days. Anyone with it can join Study Squad.</p>
      <div className="invite-code"><div><span>Invite code</span><strong>STUDY-42</strong></div><Button variant="secondary" icon="copy" onClick={copy}>Copy</Button></div>
    </Card>
    <Card>
      <h2>Join another group</h2><p className="card-subtitle">Enter a six-character invite code.</p>
      <div className="input-row"><label><span className="sr-only">Invite code</span><input placeholder="e.g. FOCUS7" maxLength={8}/></label><Button onClick={join}>Join</Button></div>
    </Card>
    <Button variant="secondary" icon="plus" className="full">Create a new group</Button>
    <Button variant="danger" icon="leave" className="full">Leave {active.name}</Button>
    <StatesPreview/>
  </div>;
}

function StatesPreview() {
  const [open, setOpen] = useState(false);
  return <div className="state-preview">
    <button className="preview-toggle" onClick={() => setOpen(!open)}><span>Demo empty states</span><Icon name="chevron" size={17}/></button>
    {open && <div className="empty-state"><div className="empty-visual"><Icon name="users" size={25}/></div><h2>No groups yet</h2><p>Start a pact with a few friends and make screen time feel more intentional.</p><Button icon="plus">Create your first group</Button></div>}
  </div>;
}

function Profile({ navigate }: { navigate: (screen: Screen) => void }) {
  return <div className="screen">
    <ScreenHeader eyebrow="Your profile" title="Jamie Stone"/>
    <Card className="profile-card">
      <Avatar name="You" size="xl" online/><div><h2>Jamie Stone</h2><p>@jamiest · joined March 2025</p><Badge tone="teal"><Icon name="flame" size={13}/> 6 day pact streak</Badge></div>
      <Button variant="secondary" icon="edit">Edit</Button>
    </Card>
    <Card className="goal-card">
      <div className="row-icon teal"><Icon name="target"/></div><div className="setting-copy"><span>Daily screen-time goal</span><strong>2 hours 30 minutes</strong></div><Icon name="chevron" size={18}/>
    </Card>
    <div className="section-heading"><div><h2>Connected devices</h2><p>2 devices sharing screen time</p></div></div>
    <Card className="device-list">
      <div className="device-row"><div className="row-icon blue"><Icon name="phone"/></div><div><strong>Jamie’s iPhone</strong><span><i/> Syncing now</span></div><Badge tone="blue">This device</Badge></div>
      <div className="device-row"><div className="row-icon amber"><Icon name="phone"/></div><div><strong>MacBook Air</strong><span>Last seen 18 min ago</span></div><Icon name="chevron" size={18}/></div>
    </Card>
    <Card className="privacy-card">
      <button><div className="row-icon teal"><Icon name="shield"/></div><div><strong>Privacy & data</strong><span>Control what your group can see</span></div><Icon name="chevron" size={18}/></button>
      <button onClick={() => navigate("settings")}><div className="row-icon blue"><Icon name="settings"/></div><div><strong>App settings</strong><span>Notifications, theme, and sync</span></div><Icon name="chevron" size={18}/></button>
    </Card>
    <div className="empty-state compact"><div className="empty-visual"><Icon name="phone" size={22}/></div><h2>No other devices?</h2><p>Connect another device to see a fuller picture of your day.</p><Button variant="secondary" icon="plus">Connect device</Button></div>
  </div>;
}

function Settings({ dark, setDark }: { dark: boolean; setDark: (value: boolean) => void }) {
  const [notifications, setNotifications] = useState(true);
  const [reset, setReset] = useState(false);
  return <div className="screen">
    <ScreenHeader eyebrow="Preferences" title="Settings" subtitle="Tune ScreenPact to support your routine."/>
    <Card className="settings-list">
      <div className="setting-row"><div className="row-icon blue"><Icon name="moon"/></div><div className="setting-copy"><strong>Dark mode</strong><span>Easy on your eyes after sunset</span></div><Toggle checked={dark} onChange={() => setDark(!dark)} label="Toggle dark mode"/></div>
      <div className="setting-row"><div className="row-icon coral"><Icon name="bell"/></div><div className="setting-copy"><strong>Notifications</strong><span>Daily nudges and rank changes</span></div><Toggle checked={notifications} onChange={() => setNotifications(!notifications)} label="Toggle notifications"/></div>
      <button className="setting-row action-row"><div className="row-icon teal"><Icon name="target"/></div><div className="setting-copy"><strong>Daily goal</strong><span>2 hours 30 minutes</span></div><Icon name="chevron" size={18}/></button>
    </Card>
    <Card className="sync-card">
      <div className="sync-head"><div className="sync-icon"><Icon name="wifi"/></div><div><h2>Everything’s in sync</h2><p>Last synced today at 3:42 PM</p></div><Badge tone="teal">Connected</Badge></div>
      <Button variant="secondary" icon="refresh" className="full">Sync now</Button>
    </Card>
    {reset && <div className="notice notice-success"><Icon name="check" size={18}/><span><strong>Demo data reset.</strong> Your fresh start is ready.</span></div>}
    <Card className="danger-zone"><h2>Demo controls</h2><p>Reset sample stats, groups, and preferences on this device.</p><Button variant="danger" icon="refresh" onClick={() => setReset(true)}>Reset local demo data</Button></Card>
    <p className="version">ScreenPact 1.0 · Made for more life off-screen</p>
  </div>;
}

function BottomNav({ screen, navigate }: { screen: Screen; navigate: (screen: Screen) => void }) {
  const items: { screen: Screen; label: string; icon: IconName }[] = [
    { screen: "leaderboard", label: "Groups", icon: "users" },
    { screen: "stats", label: "My Stats", icon: "chart" },
    { screen: "group", label: "Group Settings", icon: "settings" },
  ];
  return <nav className="bottom-nav" aria-label="Primary navigation">{items.map(item => <button className={screen === item.screen ? "active" : ""} key={item.screen} onClick={() => navigate(item.screen)}><Icon name={item.icon}/><span>{item.label}</span></button>)}</nav>;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("leaderboard");
  const [dark, setDark] = useState(false);
  const [activeGroup, setActiveGroup] = useState("study");
  const [pinnedGroup, setPinnedGroup] = useState("study");
  const navigate = (next: Screen) => { setScreen(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const selectGroup = (id: string) => { setActiveGroup(id); };
  const pinGroup = (id: string) => { setPinnedGroup(id); setActiveGroup(id); };
  return <div className={dark ? "app dark" : "app"}>
    <div className="phone-shell">
      <TopBar navigate={navigate}/>
      <main>
        {screen === "leaderboard" && <Leaderboard activeGroup={activeGroup} pinnedGroup={pinnedGroup} onSelectGroup={selectGroup} onPinGroup={pinGroup}/>}
        {screen === "stats" && <Stats/>}
        {screen === "group" && <GroupSettings activeGroup={activeGroup} pinnedGroup={pinnedGroup} onSelectGroup={selectGroup} onPinGroup={pinGroup}/>}
        {screen === "profile" && <Profile navigate={navigate}/>}
        {screen === "settings" && <Settings dark={dark} setDark={setDark}/>}
      </main>
      <BottomNav screen={screen} navigate={navigate}/>
    </div>
  </div>;
}
