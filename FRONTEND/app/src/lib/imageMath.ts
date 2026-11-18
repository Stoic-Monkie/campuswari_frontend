import { LIMITS } from "./limits";

/** Scale (width, height) down so the longer side is at most `max`. Never scales up. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const scale = max / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** The centred square inside a picture (for avatars). */
export function squareCrop(width: number, height: number): { sx: number; sy: number; size: number } {
  const size = Math.min(width, height);
  return { sx: Math.floor((width - size) / 2), sy: Math.floor((height - size) / 2), size };
}

/** A message for a file we will not even try to use, or null when it looks fine. */
export function pickedFileProblem(file: { type: string; size: number }): string | null {
  if (!file.type.startsWith("image/")) return "Please choose an image file.";
  if (file.size > LIMITS.imagePickBytes) return "That file is too large. Please choose a smaller photo.";
  return null;
}
