import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { useId } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Element to focus when it opens (defaults to the first button or field). */
  initialFocus?: RefObject<HTMLElement | null>;
}

/** Accessible dialog: Escape or the backdrop closes it, focus moves in and returns afterwards. */
export function Modal({ title, onClose, children, initialFocus }: ModalProps) {
  const titleId = useId();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    (initialFocus?.current ?? box.current?.querySelector<HTMLElement>("button, input, textarea, select"))?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      before?.focus?.();
    };
    // Only on open and close: callers often pass a fresh onClose on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={onClose}>
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-card border border-line bg-card p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-base font-medium">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
