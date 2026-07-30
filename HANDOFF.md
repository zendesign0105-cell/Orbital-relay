# Handoff Instructions

## For a Developer

Start with `README.md`, then inspect `app/page.tsx` and `app/globals.css`.
Install dependencies with `pnpm install` and run `pnpm dev`.

The tool has no required API keys, backend, accounts, database, or image
storage. Uploaded images must remain client-side.

Do not commit `.vercel`, `.next`, `dist`, `.wrangler`, `node_modules`,
`.pnpm-store`, or `.env` files.

## For Codex or Another Coding Agent

Use this brief:

> Maintain a single-screen Canvas 2D creative tool that transforms locally
> uploaded images into interactive 3D particle fields. Preserve client-side
> privacy, recognizable image reconstruction, adjustable subject isolation,
> drag rotation, wheel and button zoom,
> cursor attract/repel, original and tint color modes, custom background,
> 3,000–60,000 particles, and PNG export. Keep Inter Tight and the black/lavender
> visual system. Do not add a backend or upload images to a server unless
> explicitly requested. Validate both production builds and the rendering tests.

## Recipient Checklist

- [ ] Install Node.js 22.13+
- [ ] Install pnpm
- [ ] Run `pnpm install`
- [ ] Run `pnpm dev`
- [ ] Test JPG, transparent PNG, and replacement upload
- [ ] Test cursor movement, drag, zoom, reset, attract, and repel
- [ ] Test original colors, tint, background, and 3,000/60,000 points
- [ ] Export a PNG
- [ ] Check desktop and mobile layouts
- [ ] Run both production builds
