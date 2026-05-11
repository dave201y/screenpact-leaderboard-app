import { useState } from "react";
import { GroupData, formatTime } from "@/lib/data";
import Avatar from "./Avatar";
import { toast } from "@/hooks/use-toast";

interface GroupProps {
  joinedGroups: GroupData[];
  activeGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
  onJoinGroup: (code: string) => { ok: boolean; message: string };
  onCreateGroup: () => GroupData;
}

const formatCode = (code: string) => {
  if (code.length <= 3) return code;
  return `${code.slice(0, 3)}·${code.slice(3)}`;
};

const Group = ({ joinedGroups, activeGroupId, onSelectGroup, onJoinGroup, onCreateGroup }: GroupProps) => {
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const activeGroup = joinedGroups.find((g) => g.id === activeGroupId) ?? joinedGroups[0];
  const inviteCode = activeGroup?.code ?? "---0000";
  const inviteLink = `${window.location.origin}/?invite=${inviteCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast({ title: "Copied!", description: "Invite link copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!navigator.share) {
      handleCopy();
      return;
    }

    try {
      await navigator.share({
        title: "Join my ScreenPact group",
        text: `Join my group with code ${inviteCode}`,
        url: inviteLink,
      });
    } catch {
      // Ignore user cancel and no-op errors.
    }
  };

  return (
    <div className="space-y-3">
      <div className="sp-card">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">
          Joined groups
        </div>
        {joinedGroups.map((group) => {
          const isActive = group.id === activeGroup?.id;
          return (
            <div key={group.id} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
              <div>
                <div className="text-sm font-medium text-foreground">{group.name}</div>
                <div className="text-xs text-muted-foreground">{formatCode(group.code)} · {group.members.length} members</div>
              </div>
              <button
                onClick={() => onSelectGroup(group.id)}
                className={`text-xs border rounded-lg px-2.5 py-1.5 transition-colors ${isActive ? "bg-card text-foreground border-border" : "text-muted-foreground bg-muted border-border hover:bg-card"}`}
              >
                {isActive ? "Selected" : "Select"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="sp-card">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">
          Your group code
        </div>
        <div className="bg-muted rounded-lg p-3 flex items-center justify-between mb-3">
          <div className="font-mono text-lg tracking-widest font-medium text-foreground">{formatCode(inviteCode)}</div>
          <button onClick={handleCopy} className="text-xs text-muted-foreground bg-card border border-border rounded-lg px-2.5 py-1.5 cursor-pointer hover:bg-muted transition-colors">
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <button
          onClick={handleShare}
          className="sp-btn-secondary mb-2"
        >
          Share invite link
        </button>
        <div className="text-[13px] text-muted-foreground">Share this code with friends to join {activeGroup?.name ?? "your group"}</div>
      </div>

      <div className="sp-card">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">
          Members in {activeGroup?.name ?? "selected group"}
        </div>
        {activeGroup?.members.map((m) => (
          <div key={m.name} className="flex items-center gap-2.5 py-2 border-b border-border last:border-b-0">
            <Avatar initials={m.initials} color={m.avatar} size="sm" />
            <div className="flex-1 text-sm text-foreground">
              {m.name}
              {m.you && <span className="sp-you-tag">you</span>}
            </div>
            <div className="text-[13px] text-muted-foreground">{formatTime(m.time)} today</div>
          </div>
        ))}
      </div>

      <div className="sp-card">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">
          Join another group
        </div>
        <input
          className="sp-input mb-2.5"
          type="text"
          placeholder="XXX·0000"
          maxLength={8}
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
        />
        <button
          className="sp-btn-primary mb-2"
          onClick={() => {
            const normalizedCode = joinCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
            if (!normalizedCode) {
              toast({ title: "Group code required", description: "Enter a valid invite code first." });
              return;
            }

            const result = onJoinGroup(normalizedCode);
            toast({ title: result.ok ? "Joined group" : "Join failed", description: result.message });
            if (result.ok) setJoinCode("");
          }}
        >
          Join group
        </button>
        <button
          className="sp-btn-secondary"
          onClick={() => {
            const createdGroup = onCreateGroup();
            toast({ title: "Group created", description: `${createdGroup.name} is ready with code ${createdGroup.code}.` });
          }}
        >
          Create new group
        </button>
      </div>
    </div>
  );
};

export default Group;
