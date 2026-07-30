# Customization Guide

## Change Default Controls

Defaults are defined near the start of the `Home` component in
`app/page.tsx`.

Current defaults:

```ts
const DEFAULT_POINT_COUNT = 12000;
const MAX_POINT_COUNT = 60000;
```

The initial color values are:

```ts
const [particleColor, setParticleColor] = useState("#d8cbff");
const [glowColor, setGlowColor] = useState("#a986ff");
const [backgroundColor, setBackgroundColor] = useState("#050408");
```

Keep each state value and its matching ref initialized to the same color.

## Increase the Point Limit

Change `MAX_POINT_COUNT`. Values above 60,000 may reduce frame rate because
Canvas 2D draws every point on every frame.

The geometry uses proportional point ranges, so increasing the total preserves
the distribution across the bus, panels, dish, booms, and telemetry.

For substantially higher limits, WebGL or Three.js Points is a better renderer.

## Change Satellite Proportions

Inside `sampleSatellite()`:

- `busEnd` controls the equipment-bus share.
- `panelEnd` controls the solar-panel share.
- `boomEnd` controls booms and braces.
- `dishEnd` controls the communications dish.
- `instrumentEnd` controls sensors and masts.

The values are cumulative percentages. Keep them in increasing order and below
1.0.

## Change Illustration Size

Find this block in the animation loop:

```ts
const illustrationScale = width < 600 ? 1.34 : 1.46;
```

Increase the values to enlarge the satellite. Very large values can crop the
solar arrays on narrow screens.

## Change Cursor Response

The `rotation` expression controls horizontal response. The `rotateX()` call
controls vertical response.

The nearby-particle effect is controlled by:

- `cursorRadius`
- `attraction`
- the X/Y offsets inside `if (attraction > 0)`

## Change Typography and Layout

Edit `app/globals.css`.

Primary sections:

- `.hero`
- `.manifesto`
- `.lens-section`
- `.systems`
- `.signal-panel`

Display typography uses Inter Tight from Google Fonts. Replace the import at
the top of `app/globals.css` to use another family.

## Change Page Copy

Editorial text and labels live in the JSX returned by `Home()` in
`app/page.tsx`. Social metadata lives in `app/layout.tsx`.

If the visual identity or wording changes substantially, replace the
social-sharing image and update its filename in `app/layout.tsx`.

