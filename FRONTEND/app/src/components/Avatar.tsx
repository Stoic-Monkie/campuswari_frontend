interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
}

export function Avatar({ name, src, size = 40 }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  const style = { width: size, height: size, fontSize: size * 0.36 };
  return src ? (
    <img src={src} alt="" className="rounded-full object-cover" style={style} />
  ) : (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center rounded-full bg-line font-medium text-fg"
      style={style}
    >
      {initials}
    </span>
  );
}
