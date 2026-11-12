"use client";

import { X } from "lucide-react";
import { useEffect, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cx("rounded-md bg-white shadow-[0_2px_4px_rgba(0,0,0,0.15)]", className)}>{children}</section>;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "danger" | "ghost" };

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded px-5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:text-base",
        variant === "primary" && "bg-brand text-white hover:bg-brand-dark",
        variant === "outline" && "border border-brand text-brand hover:bg-brand-tint",
        variant === "danger" && "bg-danger text-white hover:bg-red-700",
        variant === "ghost" && "text-muted hover:bg-row hover:text-ink",
        className,
      )}
    />
  );
}

export function Avatar({ name, src, size = 40, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} width={size} height={size} className={cx("rounded-full object-cover", className)} style={{ width: size, height: size }} />
  ) : (
    <span
      aria-label={name}
      className={cx("inline-flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand-dark", className)}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </span>
  );
}

export function Modal({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-xl bg-white p-6 sm:max-w-lg sm:rounded-lg"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-muted hover:bg-row">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft";

export function Field({ label, error, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const id = useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-ink">{label}</label>
      <input id={id} {...props} className={inputClass} />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function SelectField({ label, options, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: string[] }) {
  const id = useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-ink">{label}</label>
      <select id={id} {...props} className={inputClass}>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return <p className="py-10 text-center text-sm text-muted">{label}</p>;
}

export function ErrorState({ message }: { message: string }) {
  return <p className="rounded bg-red-50 px-4 py-3 text-sm text-danger">{message}</p>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="py-10 text-center text-sm text-muted">{children}</p>;
}

/** Shared table styling from the design: grey header row and alternating grey rows. */
export function DataTable({ headers, children, className }: { headers: string[]; children: ReactNode; className?: string }) {
  return (
    <div className={cx("overflow-x-auto", className)}>
      <table className="w-full min-w-[560px] text-left text-sm text-muted sm:text-base">
        <thead>
          <tr className="bg-row">
            {headers.map((h, i) => (
              <th key={h || i} scope="col" className="px-5 py-3 font-normal">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr:nth-child(even)]:bg-row [&>tr]:border-b [&>tr]:border-row">{children}</tbody>
      </table>
    </div>
  );
}

/** Formats "18:45" as "6:45pm", as shown in the design. */
export function formatTime(t: string | null) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")}${h < 12 ? "am" : "pm"}`;
}
