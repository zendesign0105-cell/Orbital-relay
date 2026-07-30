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

- cursor response still feels smooth
- scroll-driven camera movement still works
- the tuning panel works at 3,000 and 60,000 points
- all three color controls update the scene
- the satellite remains recognizable on desktop and mobile
- no generated build folders or credentials are staged

## Pull Requests

Keep each pull request focused. Describe the visual or behavioral change, its
reason, and the devices or browsers used for testing. Include a screenshot or
short recording when changing the illustration or layout.

## Code Style

- Keep TypeScript strict.
- Preserve accessible labels for controls.
- Use proportional particle allocations when changing geometry.
- Avoid external 3D assets unless the change explicitly requires them.
- Do not commit `.env`, `.vercel`, `.next`, `dist`, or `node_modules`.

