/*
  Real limits enforced by the API service after it cleans the text (patch logs).
  openapi.json shows larger "coarse" limits (post 8000, comment 4000, bio 1000,
  displayName 200) that are only a guard against huge payloads.
  Validate in the UI against THESE numbers.
*/
export const LIMITS = {
  post: 2000,
  comment: 1000,
  displayName: 60,
  bio: 300,
  reportDetails: 500,
  usernameMin: 3,
  usernameMax: 30,
  passwordMin: 10,
  passwordMax: 128,
  email: 254,
  /** Shortest username search the staff API accepts. */
  searchMin: 2,
  /** Largest file the API accepts after our browser-side conversion. */
  imageBytes: 5 * 1024 * 1024,
  /** Biggest side, in pixels, of a post photo and of an avatar (the API itself allows up to 2048). */
  postImageSide: 2048,
  avatarSide: 512,
  /** Refuse to even try to decode a picked file bigger than this. */
  imagePickBytes: 50 * 1024 * 1024,
} as const;

/** a-z, 0-9, underscore; no leading, trailing or double underscore. */
export const USERNAME_RE = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
