import { z } from "zod";
import { LIMITS, USERNAME_RE } from "../../lib/limits";
import { cpLength } from "../../lib/text";

export const emailField = z
  .string()
  .trim()
  .min(1, "Enter your email")
  .max(LIMITS.email, "That email is too long")
  .pipe(z.email("Enter a valid email address"));

export const passwordField = z
  .string()
  .refine((v) => cpLength(v) >= LIMITS.passwordMin, `Use at least ${LIMITS.passwordMin} characters`)
  .refine((v) => cpLength(v) <= LIMITS.passwordMax, `Use at most ${LIMITS.passwordMax} characters`);

export const usernameField = z
  .string()
  .refine((v) => v.length >= LIMITS.usernameMin, `At least ${LIMITS.usernameMin} characters`)
  .refine((v) => v.length <= LIMITS.usernameMax, `At most ${LIMITS.usernameMax} characters`)
  .refine((v) => USERNAME_RE.test(v), "Use only letters, numbers and single underscores (not at the start or end)");

export const displayNameField = z
  .string()
  .trim()
  .min(1, "Enter your name")
  .refine((v) => cpLength(v) <= LIMITS.displayName, `At most ${LIMITS.displayName} characters`);
