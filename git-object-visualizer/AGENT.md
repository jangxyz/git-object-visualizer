# Agent Instructions

## Project Overview

This is a Git Object Visualizer - an Electron + Svelte 5 desktop application for exploring Git's internal object structure (blob, tree, commit, tag).

## Validation Process

### Acceptance Criteria Check

Every user story in `prd.json` requires **"npm run check 통과 (typecheck + build)"** to pass.

Run the full check with:
```bash
cd git-object-visualizer && npm run check
```

This runs two validation steps:

1. **Typecheck** (`npm run typecheck`)
   - `typecheck:node`: TypeScript check for main process (`tsc --noEmit`)
   - `typecheck:web`: Svelte static type check (`svelte-check`)

2. **Build** (`npm run build`)
   - Runs the Vite/Svelte compiler which catches additional errors that `svelte-check` misses:
     - Invalid HTML nesting (e.g., `<button>` inside `<button>`)
     - Svelte 5 compiler warnings (non-reactive updates, a11y issues)
     - Template validation errors

### Why Both Steps Are Required

`svelte-check` only performs static type analysis and does NOT catch:
- `node_invalid_placement` errors (invalid HTML element nesting)
- Some Svelte 5 runtime-related compiler warnings
- A11y violations that the Svelte compiler enforces

The build step runs the full Svelte compiler which catches these issues.

### Quick Commands

```bash
# Full validation (required for acceptance criteria)
npm run check

# Individual checks
npm run typecheck:node   # TypeScript for main process
npm run typecheck:web    # Svelte static types
npm run typecheck        # Both typechecks
npm run build            # Full build with compiler validation
```

## Project Structure

```
git-object-visualizer/
├── src/
│   ├── main/           # Electron main process
│   ├── preload/        # Preload scripts (IPC bridge)
│   └── renderer/       # Svelte frontend
│       ├── components/ # Svelte components
│       └── stores/     # Svelte stores
├── package.json
└── svelte.config.js
```

## Tech Stack

- Electron (v34+)
- Svelte 5 (with runes: `$state`, `$derived`, etc.)
- TypeScript
- Vite (electron-vite)
- D3.js (for graph visualization)
