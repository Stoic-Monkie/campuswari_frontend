import { useCallback, useEffect, useState } from "react";

/** Counts down whole seconds. `start(n)` begins a cooldown; `remaining` is 0 when ready. */
export function useCooldown(initial = 0) {
  const [remaining, setRemaining] = useState(initial);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining]);

  const start = useCallback((seconds: number) => setRemaining(Math.max(0, Math.ceil(seconds))), []);
  return { remaining, start };
}
