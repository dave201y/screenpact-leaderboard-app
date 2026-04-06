import { useState } from "react";
import { members, formatTime } from "@/lib/data";
import Avatar from "./Avatar";
import { toast } from "@/hooks/use-toast";

const Group = () => {
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText("SCR4829");
    setCopied(true);
    toast({ title: "Copied!", description: "Group code copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="sp-card">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">
          Your group code
        </div>
        <div className="bg-muted rounded-lg p-3 flex items-center justify-between mb-3">
          <div className="font-mono text-lg tracking-widest font-medium text-foreground">SCR·4829</div>
          <button onClick={handleCopy} className="text-xs text-muted-foreground bg-card border border-border rounded-lg px-2.5 py-1.5 cursor-pointer hover:bg-muted transition-colors">
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <div className="text-[13px] text-muted-foreground">Share this code with friends to join Study Squad</div>
      </div>

      <div className="sp-card">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">
          Members
        </div>
        {members.map((m) => (
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
          onClick={() => toast({ title: "Joining group", description: `Attempting to join: ${joinCode}` })}
        >
          Join group
        </button>
        <button
          className="sp-btn-secondary"
          onClick={() => toast({ title: "Create group", description: "Group creation coming soon!" })}
        >
          Create new group
        </button>
      </div>
    </div>
  );
};

export default Group;
