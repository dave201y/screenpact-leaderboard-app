import type { ReactNode } from "react";

export type Tone = "teal" | "blue" | "amber" | "coral" | "green";

export function Badge({ children, tone = "blue" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function Button({ children, icon, variant = "primary", block = false, disabled = false, onClick }: { children: ReactNode; icon?: ReactNode; variant?: "primary" | "secondary" | "danger"; block?: boolean; disabled?: boolean; onClick?: () => void }) {
  return <button type="button" className={`btn btn-${variant}${block ? " btn-block" : ""}`} disabled={disabled} onClick={onClick}>{icon}<span>{children}</span></button>;
}

export function Progress({ value, tone = "teal", label }: { value: number; tone?: Tone; label: string }) {
  return <div className="progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><span className={`progress-fill fill-${tone}`} style={{ width: `${value}%` }} /></div>;
}

export function ScreenHeader({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return <div className="screen-header">{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>;
}
