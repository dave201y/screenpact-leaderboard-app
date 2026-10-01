export const DEFAULT_GOAL = 150;
export const GOAL_MIN = 60;
export const GOAL_MAX = 360;
export const GOAL_STEP = 15;

export function validateGroupName(raw: string) {
  const name = raw.replace(/\s+/g, " ").trim();
  if (name.length === 0) return { ok: false as const, error: "Name can't be empty." };
  if (name.length > 40) return { ok: false as const, error: "Keep it under 40 characters." };
  for (let index = 0; index < name.length; index += 1) {
    const code = name.charCodeAt(index);
    if (code < 32 || code === 127) return { ok: false as const, error: "Name contains invalid characters." };
  }
  return { ok: true as const, name };
}

export function formatMinutes(total: number): string {
  const safe = Math.max(0, Math.round(total));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  return hours ? `${hours}h ${String(minutes).padStart(2, "0")}m` : `${minutes}m`;
}
