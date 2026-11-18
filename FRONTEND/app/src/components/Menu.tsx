import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface MenuItem {
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

/** A small "more" menu. Escape or a click elsewhere closes it; arrow keys move between items. */
export function Menu({ label, items }: { label: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    wrap.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function move(e: React.KeyboardEvent, step: 1 | -1) {
    e.preventDefault();
    const all = Array.from(wrap.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const i = all.indexOf(document.activeElement as HTMLElement);
    all[(i + step + all.length) % all.length]?.focus();
  }

  if (items.length === 0) return null;

  return (
    <div ref={wrap} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-line/60 hover:text-fg"
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>
      {open ? (
        <ul
          role="menu"
          aria-label={label}
          className="absolute right-0 z-20 mt-1 min-w-48 rounded-lg border border-line bg-card p-1 shadow-lg"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") move(e, 1);
            if (e.key === "ArrowUp") move(e, -1);
          }}
        >
          {items.map((item) => (
            <li key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={`flex min-h-11 w-full items-center rounded-md px-3 text-left text-sm hover:bg-line/50 ${
                  item.danger ? "text-danger" : ""
                }`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
