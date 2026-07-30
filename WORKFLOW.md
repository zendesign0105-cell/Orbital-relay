# Rendering and Development Workflow

## Image Pipeline

All image processing happens in `app/page.tsx`:

1. The browser validates the selected image and its 20 MB size limit.
2. An `Image` decodes the local object URL.
3. A temporary canvas scales the source to a maximum dimension of 960 pixels.
4. `getImageData()` reads the RGBA pixels locally.
5. `createImageParticles()` samples a jittered grid at the requested density.
6. Pixel position becomes X/Y, luminance becomes depth, and RGBA becomes
   particle color and opacity.
7. The temporary object URL is revoked after sampling.

The source image is never sent over the network or stored by the application.

## Frame Pipeline

On every animation frame the canvas:

1. Paints the selected background and a restrained radial glow.
2. Applies the current yaw, pitch, zoom, and subtle depth breathing.
3. Projects each 3D point into screen space.
4. Applies cursor attraction or repulsion inside the interaction radius.
5. Draws either original sampled colors or the chosen tint.

React state drives labels and controls. Refs mirror render settings so control
changes do not restart the animation loop.

## Interaction Model

- Pointer movement distorts nearby points.
- Pointer drag updates yaw and pitch.
- Mouse wheel changes zoom.
- Double-click and **Reset view** restore the camera.
- Touch pointer events use the same drag path.
- Drag-and-drop and the hidden file input share one image-loading function.
- **Export PNG** serializes the live canvas with `canvas.toBlob()`.

## Recommended Editing Workflow

1. Change one rendering or interface concern at a time.
2. Run `pnpm run build`.
3. Run `node --test tests/rendered-html.test.mjs`.
4. Run `pnpm run vercel-build`.
5. Test an opaque JPG and a transparent PNG.
6. Check attract/repel, original/tint, minimum/maximum density, drag, zoom,
   reset, replacement upload, and export.
7. Check desktop, a short laptop viewport, and a mobile viewport.

## Performance Notes

Canvas cost scales almost linearly with particle count. The 60,000-point limit
is intended for recent desktop hardware. Mobile-friendly settings are
8,000–20,000 points.

Useful performance levers:

- reduce `MAX_POINTS`
- lower the device-pixel-ratio cap in `resize()`
- reduce the 960-pixel sampling limit
- reduce the default density
- move the renderer to WebGL when substantially exceeding 60,000 points

## Production Targets

```bash
pnpm run build
pnpm run vercel-build
```

The first command produces the vinext/OpenAI Sites output. The second validates
the Vercel/Next.js production build.
