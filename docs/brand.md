# CampusWari brand decisions

Single source of truth for look and feel. Update this file when a decision changes, and the code follows it.
Last updated: 2026-11-12.

Status key: **LOCKED** (decided, do not change without discussion), **DRAFT** (proposed, not approved), **OPEN** (not yet discussed).

---

## 1. Name and concept: LOCKED

- **Name:** CampusWari (one word, capitals C and W).
- **Meaning:** "wari" is Manipuri for "story". CampusWari = campus stories and campus affairs.
- **Positioning:** campus-exclusive. Only verified students of the campus see anything.
- **Mark:** a swan (logo drawn by the project owner, see section 5).

## 2. Wordmark: LOCKED

Written as `CampusWari` with two typefaces:

| Letters | Font | Style | Weight |
|---|---|---|---|
| `C` and `W` | **DM Serif Display** | Regular (upright) | 400 |
| `ampus` and `ari` | **Fraunces** | Italic | 400 |

Both fonts are open source (SIL Open Font License), free for commercial use.

```html
<span class="wordmark" aria-label="CampusWari">
  <span class="wm-cap">C</span><span class="wm-low">ampus</span><span class="wm-cap">W</span><span class="wm-low">ari</span>
</span>
```

```css
.wm-cap { font-family: "DM Serif Display", Georgia, serif; font-weight: 400; font-style: normal; }
.wm-low { font-family: "Fraunces", Georgia, serif; font-weight: 400; font-style: italic; }
```

To fine-tune later (not yet decided): size of the capitals against the italics, baseline, letter spacing, and any flourish on the C.

**Delivery:** the fonts are installed from npm and bundled with the app, so no request goes to Google:

```bash
npm install @fontsource/dm-serif-display @fontsource/fraunces
```

```ts
import "@fontsource/dm-serif-display/400.css";
import "@fontsource/fraunces/400-italic.css";
```

For the favicon, app icon and share images, export the wordmark as an SVG with the letters **converted to outlines**, so it does not depend on the fonts loading.

## 3. Direction and feel: LOCKED

- Familiar, **Instagram-like** layout and behaviour: content first, neutral chrome, bottom navigation on phones.
- **Warm** tone. A calm, readable, academic undertone (so it does not become flashy), with **small bold touches** only (never the dominant theme).
- Learn from established platforms (Instagram, Threads, Substack, Reddit, Mastodon) but copy none of them.
- Not generic: no default indigo, teal, orange or blue accent.

## 4. Themes: LOCKED

Light and dark, following the device setting, with a manual toggle.

---

## 5. Logo: OPEN (owner is drawing it)

Concept: a **swan**. Files go in `Assets/logo/`. Requested set:

| File | Use |
|---|---|
| `mark.svg` | The swan alone, full colour |
| `mark-mono.svg` | One colour (for dark mode, stamps, watermarks) |
| `lockup-horizontal.svg` | Swan next to the wordmark (letters outlined) |
| `wordmark.svg` | Wordmark only (letters outlined) |
| `favicon.svg` | Simplified swan, must read at 16 px |
| `app-icon-1024.png` | Square, no transparency, for install icons |

Design notes: a simple silhouette works best at small sizes; check it on both light and dark backgrounds; leave clear space around it of about the height of the "C".

## 6. Colour: OPEN

**Not decided.** Four palettes were explored (Shirui, Phumdi, Phanek, Sangai); none was chosen. Proposed next step: take the accent colour from the swan logo once it exists.

Draft neutrals (warm paper and ink), kept for reference only:

| Token | Light | Dark |
|---|---|---|
| background | `#FAF7F2` | `#171413` |
| card | `#FFFFFF` | `#1F1B1A` |
| text | `#211D1B` | `#F1ECE6` |
| muted text | `#6F6760` | `#A39B93` |
| border | `#E8E1D8` | `#2E2927` |

Roles still to define: accent (actions, active tab, links), spark (likes), danger, success, plus contrast checks (WCAG AA: 4.5:1 for text).

## 7. Other decisions: DRAFT / OPEN

| Topic | Draft |
|---|---|
| App text font | Clean sans (system font stack) for posts, buttons, forms |
| Serif use | Wordmark and maybe screen titles only |
| Corners | Soft, about 12 px on cards |
| Icons | Outline style. **`lucide-react` is used for now (temporary, not approved).** |
| Motion | Subtle; only on like and post; respect "reduce motion" |
| Language | English only for v1; all text in one strings file |

## 8. Where the decisions live in code

| Decision | File in `FRONTEND/app` |
|---|---|
| Colour tokens (light and dark) | `src/index.css` (`:root` and `.dark`). **Accent and spark are still plain ink (TEMP).** |
| Wordmark (fonts and pairing) | `src/components/Wordmark.tsx` and the `.wm-cap` / `.wm-low` rules in `src/index.css` |
| Theme switching | `src/lib/theme.ts` (stores `cw-theme` in localStorage: system, light or dark) |
| Live style guide | open `/design` in the running app |
| Shape and spacing | Tailwind classes; cards use `rounded-card` (0.75rem) defined in `src/index.css` |

To change a colour: edit the token in `src/index.css`, reload `/design`, check light and dark, then record the final value in section 6 above and mark it LOCKED.

## 9. Change log

- 2026-11-10: name, wordmark, direction and themes locked; swan chosen as mark.
- 2026-11-12: design tokens, wordmark and theme switching implemented in the app. Colour still open (waiting for the swan).
