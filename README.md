# Particle Signal

Particle Signal is a single-screen creative tool that turns an uploaded image
into a cinematic, cursor-reactive 3D signal sculpture. Images are decoded and
sampled entirely in the browser; they are never uploaded to a server.

Live site:
[point-cloud-sketch.vercel.app](https://point-cloud-sketch.vercel.app)

## Features

- Local JPG, PNG, WebP, GIF, and image-file processing
- Subtle luminance-driven 3D depth
- Automatic subject isolation with adjustable background cleanup
- Animated orbital paths and signal nodes
- Drag-to-rotate, wheel-to-zoom, visible zoom controls, and cursor parallax
- Original-image color or a custom single-color tint
- Custom background color
- Adjustable depth, dot size, interaction strength, and 3,000–60,000 particles
- PNG export of the current particle composition
- Responsive single-screen desktop and mobile interface
- No API key, backend, database, account, or image storage

## Requirements

- Node.js 22.13 or newer
- pnpm 10 or newer

## Run Locally

```bash
pnpm install
pnpm dev
```

Open the local URL printed in the terminal.

Production builds:

```bash
pnpm run build
pnpm run vercel-build
```

## Using the Tool

1. Select **Upload image**, choose a file, or drop an image anywhere.
2. Move the cursor across the result for subtle parallax.
3. Use **Subject** mode and **Background cleanup** to separate the main object,
   or switch to **Full frame** to keep every pixel.
4. Drag to rotate the depth field, scroll to zoom, or use the −/+ buttons.
5. Open **Controls** for density, depth, zoom, and signal color. Secondary
   sampling and appearance settings live under **Advanced**.
6. Select **Export PNG** to download the current composition.

The image stays on the device. Only sampled pixel values are used to render the
canvas. High particle counts require more graphics work; reduce density or dot
size if a device becomes slow.

## Important Files

| File | Purpose |
| --- | --- |
| `app/page.tsx` | Image decoding, pixel sampling, particle rendering, interactions, controls, and PNG export |
| `app/globals.css` | Single-screen layout, interface styling, and responsive behavior |
| `app/layout.tsx` | Page title, description, icons, and social metadata |
| `public/og.png` | Social-sharing image |
| `tests/rendered-html.test.mjs` | Rendering and source-contract tests |
| `vercel.json` | Vercel build configuration |
| `vite.config.ts` | vinext/OpenAI Sites build configuration |

For implementation details, read [WORKFLOW.md](./WORKFLOW.md). For common
changes, read [CUSTOMIZATION.md](./CUSTOMIZATION.md).

## Deploy to Vercel

```bash
pnpm dlx vercel
pnpm dlx vercel --prod
```

Set `NEXT_PUBLIC_SITE_URL` to the final production URL so social metadata uses
the correct origin.

## Deploy to OpenAI Sites

The included `.openai/hosting.json` is sanitized and has no project ID. A new
Sites project should be created for a new owner.

## Repository

[github.com/zendesign0105-cell/Particle-Signal](https://github.com/zendesign0105-cell/Particle-Signal)

No open-source license is included. Agree on reuse and ownership terms before
public redistribution.
