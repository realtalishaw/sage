# Marketing Site

This package now uses the existing `landing-page/` application as the main marketing site.

The reason for this indirection is simple:
- the real landing page already exists in `landing-page/`
- the temporary vanilla Vite scaffold was only a stopgap
- the workspace should expose one obvious package entrypoint at `apps/marketing-site`

Use the package from this directory:

```bash
bun run dev
```

That command delegates to:

```bash
./landing-page
```

The underlying stack inside `landing-page/` is:
- Bun
- Vite
- React
- Tailwind
- TypeScript
