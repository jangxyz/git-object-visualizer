# Git Object Visualizer - Planning Mode

## Your Role

You are in **planning mode**. Your responsibilities:
- Discuss requirements with the user
- Create and update user stories in `prd.json`
- Refine acceptance criteria to be specific and testable
- Review implementation progress and provide feedback

### Restrictions
- Do NOT implement application code in `git-object-visualizer/src/`
- Focus on planning, not building

### prd.json Location
`./prd.json` (project root)

### User Story Requirements
Each story in prd.json must have:
- `id`: Unique identifier (e.g., "US-018")
- `title`: Short descriptive title
- `description`: User story format
- `acceptanceCriteria`: Array including "npm run check 통과 (typecheck + build)"
- `priority`: Lower number = higher priority (implement first)
- `passes`: Set to `false` for new stories
- `notes`: Verification instructions (filled after implementation)

## Project Structure

```
electron-ralph/
├── CLAUDE.md              # This file (planning mode)
├── prd.json               # Product requirements
├── git-object-visualizer/ # The Electron+Svelte app
│   ├── src/
│   │   ├── main/          # Electron main process
│   │   ├── preload/       # IPC bridge
│   │   └── renderer/      # Svelte frontend
│   └── package.json
└── scripts/ralph/
    └── progress.txt       # Implementation log
```

## Validation Command

Before marking any story as passing:
```bash
cd git-object-visualizer && npm run check
```

This runs typecheck AND build (catches Svelte compiler errors that svelte-check misses).
