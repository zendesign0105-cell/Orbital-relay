# Customization Guide

## Change Particle Limits

The main constants are near the top of `app/page.tsx`:

```ts
const MAX_POINTS = 60_000;
const DEFAULT_POINTS = 18_000;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
```

Update the corresponding range input when changing the limit. Values above
60,000 are better suited to a WebGL renderer.

## Change Image Sampling

`createImageParticles()` controls how pixels become particles.

- `step` determines grid spacing from the requested density.
- `jitterX` and `jitterY` soften the grid.
- `longestSide` preserves the image aspect ratio.
- luminance controls the initial Z depth and opacity.
- transparent pixels below the alpha threshold are skipped.

The upload path scales large images to a maximum dimension of 960 pixels before
sampling. Increase that value only when more source detail is worth the memory
cost.

## Change Depth and Motion

The animation loop applies:

- `depthAmount` for luminance-driven relief
- `breathing` for subtle continuous Z motion
- `yaw` and `pitch` for rotation
- `view.zoom` for camera scale
- `interactionRadius` and `force` for cursor behavior

Keep motion subtle enough that the uploaded image remains recognizable.

## Change Default Colors

Defaults live in the `Home` component:

```ts
const [background, setBackground] = useState("#050408");
const [tint, setTint] = useState("#d8cbff");
```

Original mode uses sampled RGB values. Tint mode uses the selected signal color
while preserving sampled opacity.

## Change Interface Styling

Edit `app/globals.css`.

Primary surfaces:

- `.topbar`
- `.intro-card`
- `.upload-target`
- `.control-panel`
- `.file-chip`
- `.drop-overlay`

The page is intentionally locked to `100svh` with hidden overflow so no second
screen appears below the tool.

## Change Copy and Metadata

Interface text lives in `app/page.tsx`. Search/social metadata lives in
`app/layout.tsx`, and the social card is `public/og.png`.
