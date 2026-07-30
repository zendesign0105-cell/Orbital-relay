# Handoff Instructions

## For a Developer

Start with `README.md`, then inspect `app/page.tsx` and `app/globals.css`.
Install dependencies with `pnpm install` and run `pnpm dev`.

The project has no required environment variables or remote services.

Do not commit:

- `.vercel`
- `.next`
- `dist`
- `.wrangler`
- `node_modules`
- `.env` files

## For Codex or Another Coding Agent

Use this brief:

> Maintain an interactive Canvas 2D point-cloud communications satellite built
> in `app/page.tsx`. Preserve the recognizable rectangular bus, dominant dish,
> symmetrical solar-panel wings, cursor reaction, scroll-driven camera, and
> tuning panel. Preserve live controls for 3,000–60,000 points, dot size,
> brightness, particle color, glow color, and background color. Use Inter Tight
> for the interface. Validate with both `pnpm run build` and
> `pnpm run vercel-build`. Do not add a backend or external 3D model unless
> explicitly requested.

When changing particle geometry, allocate points proportionally to the current
total. Fixed index thresholds will fail when the user selects more than the
original point count.

## Recipient Checklist

- [ ] Install Node.js 22.13+
- [ ] Install pnpm
- [ ] Run `pnpm install`
- [ ] Run `pnpm dev`
- [ ] Test cursor response
- [ ] Test scrolling
- [ ] Test 3,000 and 60,000 points
- [ ] Test all color pickers
- [ ] Create a new Vercel or OpenAI Sites project

