# Contributing

Thank you for improving Particle Signal.

## Local Setup

```bash
pnpm install
pnpm dev
```

## Before Opening a Pull Request

Run both production builds:

```bash
pnpm run build
pnpm run vercel-build
```

Then verify:

- JPG and transparent PNG uploads remain local and render correctly
- cursor parallax, orbital motion, drag rotation, wheel zoom, and reset work
- the controls remain usable at 3,000 and 60,000 points
- original color, tint, and background controls update the field
- PNG export downloads the current composition
- the one-screen interface remains usable on desktop and mobile
- no generated build folders or credentials are staged

## Pull Requests

Keep each pull request focused. Describe the visual or behavioral change, its
reason, and the devices or browsers used for testing. Include a screenshot or
short recording when changing the illustration or layout.

## Code Style

- Keep TypeScript strict.
- Preserve accessible labels for controls.
- Preserve client-side image privacy.
- Avoid server-side image uploads unless the change explicitly requires them.
- Do not commit `.env`, `.vercel`, `.next`, `dist`, or `node_modules`.
