# FRONTEND/Assets

Brand source files for CampusWari. These are **design sources**, not the files the app serves. Copies the app needs go into `FRONTEND/app/public` or `src/assets` when the project is scaffolded.

```
Assets/
├── brand.md      decisions: name, fonts, colours, status of each (read this first)
├── README.md     this file
├── logo/         swan mark, wordmark, lockups, favicon, app icon (owner supplies)
├── fonts/        font licence files and any local copies (the app installs fonts from npm)
└── colors/       palette exports (tokens, swatches) once colours are locked
```

Rules:

1. A design decision is only final when it is marked **LOCKED** in `brand.md`.
2. Keep master files here (SVG, not just PNG). Never edit the copy inside the app; edit the master and copy it over.
3. Keep original licence files for any font or icon set we use.
