# Rendering and Development Workflow

## How the Illustration Works

The entire satellite is generated in `app/page.tsx`; there is no imported 3D
model.

Each point is assigned to one of five geometric systems:

1. Equipment bus — approximately 31% of the points
2. Solar panels — approximately 36%
3. Hinges and deployment booms — approximately 6%
4. Communications dish — approximately 12%
5. Payload instruments and telemetry tracks — the remaining points

`sampleSatellite()` converts a point index into a deterministic 3D coordinate.
The same seed always produces the same spacecraft variation.

## Frame Pipeline

On every animation frame the page:

1. Reads motion, point, size, brightness, and color settings from React refs.
2. Calculates the scroll-driven camera scale and position.
3. Smoothly interpolates toward the current cursor position.
4. Paints the selected background, atmospheric glow, stars, and horizon.
5. Samples every satellite point.
6. Applies cursor-driven X/Y rotation.
7. Projects the 3D coordinate onto the 2D canvas with perspective.
8. Attracts nearby points toward the cursor.
9. Blends the particle and glow colors according to depth and proximity.
10. Draws the point as a small rectangle using additive blending.

The canvas is fixed behind the page. HTML sections scroll above it, creating the
camera-story effect without a WebGL dependency.

## Interaction Architecture

- React state drives the visible controls and labels.
- Refs mirror state used by the animation loop, avoiding a new animation effect
  every time a control changes.
- Pointer coordinates are normalized to values between -1 and 1.
- Scroll progress is normalized to a value between 0 and 1.
- `requestAnimationFrame()` performs the render loop.
- `ResizeObserver` keeps the canvas sharp when the viewport changes.

## Recommended Editing Workflow

1. Change one visual system at a time.
2. Run `pnpm run vercel-build` after TypeScript or layout changes.
3. Check desktop and mobile widths.
4. Test the minimum and maximum point counts.
5. Test a light and a dark background color.
6. Confirm that the tuning panel remains scrollable on a short screen.
7. Deploy a preview before replacing production.

## Performance Notes

Canvas cost scales almost linearly with point count. The maximum of 60,000 is
intended for recent desktop hardware. For mobile-first work, use 8,000–20,000
points.

Useful performance changes:

- reduce `MAX_POINT_COUNT`
- lower the device-pixel-ratio cap in `resize()`
- render every second point on small screens
- cache projected coordinates while paused
- migrate the point renderer to WebGL if substantially exceeding 60,000 points

## Deployment Workflow

Vercel:

```bash
pnpm run vercel-build
pnpm dlx vercel --prod
```

OpenAI Sites:

```bash
pnpm run build
```

Then use the Sites publishing workflow in Codex. The recipient must create or
connect their own Sites project; the original project identifier is not part of
this package.

