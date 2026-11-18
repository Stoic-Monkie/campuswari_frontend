interface WordmarkProps {
  /** Tailwind text size class, e.g. "text-2xl". Defaults to a header size. */
  className?: string;
}

/** CampusWari wordmark. Fonts and pairing are LOCKED in Assets/brand.md. */
export function Wordmark({ className = "text-2xl" }: WordmarkProps) {
  return (
    <span className={`${className} leading-none tracking-tight`} role="img" aria-label="CampusWari">
      <span aria-hidden="true">
        <span className="wm-cap">C</span>
        <span className="wm-low">ampus</span>
        <span className="wm-cap">W</span>
        <span className="wm-low">ari</span>
      </span>
    </span>
  );
}
