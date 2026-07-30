"use client";

import { useEffect, useRef, useState } from "react";

type Point = {
  x: number;
  y: number;
  z: number;
  alpha: number;
  hue: number;
};

const TAU = Math.PI * 2;
const DEFAULT_POINT_COUNT = 12000;
const MAX_POINT_COUNT = 60000;
const TOOL_PACKAGE_FORMAT = "particle-signal-tool";
const TOOL_PACKAGE_VERSION = 1;

function fract(value: number) {
  return value - Math.floor(value);
}

function noise(index: number, seed: number) {
  return fract(Math.sin(index * 127.1 + seed * 311.7) * 43758.5453123);
}

function hexToRgb(hex: string) {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgba(color: { r: number; g: number; b: number }, alpha: number) {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

function clamp(value: unknown, fallback: number, minimum: number, maximum: number) {
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue)
    ? Math.min(maximum, Math.max(minimum, numericValue))
    : fallback;
}

function validHex(value: unknown, fallback: string) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
    ? value.toLowerCase()
    : fallback;
}

function rotateY(point: Point, angle: number): Point {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return {
    ...point,
    x: point.x * c - point.z * s,
    z: point.x * s + point.z * c,
  };
}

function rotateX(point: Point, angle: number): Point {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return {
    ...point,
    y: point.y * c - point.z * s,
    z: point.y * s + point.z * c,
  };
}

function sampleSatellite(index: number, total: number, time: number, seed: number): Point {
  const r1 = noise(index, seed);
  const r2 = noise(index + 11003, seed);
  const r3 = noise(index + 29011, seed);
  const busEnd = Math.floor(total * 0.31);
  const panelEnd = Math.floor(total * 0.67);
  const boomEnd = Math.floor(total * 0.73);
  const dishEnd = Math.floor(total * 0.85);
  const instrumentEnd = Math.floor(total * 0.92);

  if (index < busEnd) {
    // A conventional rectangular equipment bus with six clearly defined faces.
    const face = Math.floor(r3 * 6);
    const width = 128;
    const height = 112;
    const depth = 96;
    let x = (r1 - 0.5) * width;
    let y = (r2 - 0.5) * height;
    let z = (noise(index + 1901, seed) - 0.5) * depth;

    if (face === 0 || face === 1) {
      z = face === 0 ? -depth / 2 : depth / 2;
    } else if (face === 2 || face === 3) {
      x = face === 2 ? -width / 2 : width / 2;
    } else {
      y = face === 4 ? -height / 2 : height / 2;
    }

    const edgeDistance = Math.min(
      Math.abs(Math.abs(x) - width / 2),
      Math.abs(Math.abs(y) - height / 2),
      Math.abs(Math.abs(z) - depth / 2),
    );
    return {
      x,
      y,
      z,
      alpha: edgeDistance < 4 ? 0.82 : 0.24 + 0.38 * noise(index + 5701, seed),
      hue: face === 0 ? 218 : 204 + face * 3,
    };
  }

  if (index < panelEnd) {
    // Six long, rectangular photovoltaic panels arranged as two clean wings.
    const local = index - busEnd;
    const panelCount = panelEnd - busEnd;
    const perPanel = panelCount / 6;
    const panel = Math.min(5, Math.floor(local / perPanel));
    const within = local - Math.floor(panel * perPanel);
    const rows = Math.max(2, Math.ceil(perPanel / 30));
    const side = panel < 3 ? -1 : 1;
    const segment = panel % 3;
    const column = within % 30;
    const row = Math.min(rows - 1, Math.floor(within / 30));
    const gx = column / 29;
    const gy = row / (rows - 1);
    const hingeWave = Math.sin(time * 0.3 + segment * 0.6 + side) * 2.2;
    const gridRow = Math.round(gy * 19);
    const gridLine = gridRow % 4 === 0 || column % 6 === 0;
    return {
      x: side * (94 + segment * 86 + gx * 78),
      y: (gy - 0.5) * 88,
      z: (gy - 0.5) * side * 7 + hingeWave,
      alpha: gridLine ? 0.84 : 0.24 + 0.28 * r3,
      hue: 206 + segment * 5 + 10 * gx,
    };
  }

  if (index < boomEnd) {
    // Straight deployment booms and triangular hinge braces.
    const side = index % 2 === 0 ? -1 : 1;
    const u = r2;
    const brace = Math.floor(r1 * 3);
    if (r3 < 0.5) {
      return {
        x: side * (64 + u * 30),
        y: (noise(index + 88, seed) - 0.5) * 6,
        z: -2 + Math.sin(time * 0.4 + side) * 1.2,
        alpha: 0.56 + 0.34 * noise(index + 101, seed),
        hue: 214,
      };
    }

    const startY = brace === 0 ? -35 : brace === 1 ? 35 : 0;
    const endY = brace === 2 ? 0 : brace === 0 ? -20 : 20;
    return {
      x: side * (62 + u * 33),
      y: startY * (1 - u) + endY * u,
      z: 4 + brace * 3,
      alpha: 0.42 + 0.36 * r3,
      hue: 210,
    };
  }

  if (index < dishEnd) {
    // A single dominant parabolic communications dish above the equipment bus.
    if (r3 < 0.78) {
      const radius = Math.sqrt(r1) * 52;
      const angle = TAU * r2;
      const dishX = Math.cos(angle) * radius;
      const dishY = Math.sin(angle) * radius;
      const dishDepth = (radius * radius) / 112;
      return {
        x: 18 + dishX * 0.86,
        y: -92 + dishY * 0.52 - dishDepth * 0.18,
        z: -4 + dishDepth + dishY * 0.72,
        alpha: 0.3 + 0.52 * r2,
        hue: 211 + 12 * r1,
      };
    }

    const support = Math.floor(r1 * 4);
    const u = r2;
    if (support === 0) {
      return {
        x: 18,
        y: -92 - u * 34,
        z: -4 - u * 42,
        alpha: 0.64 + 0.28 * r3,
        hue: 218,
      };
    }

    const spokeAngle = ((support - 1) / 3) * TAU;
    return {
      x: 18 + Math.cos(spokeAngle) * 42 * u,
      y: -92 + Math.sin(spokeAngle) * 22 * u,
      z: -4 + Math.sin(spokeAngle) * 31 * u,
      alpha: 0.46 + 0.4 * r3,
      hue: 215,
    };
  }

  if (index < instrumentEnd) {
    // One small payload sensor and long antenna masts—no face-like lens cluster.
    if (r3 < 0.48) {
      const angle = TAU * r1;
      const ring = 0.38 + Math.floor(r2 * 3) * 0.28;
      return {
        x: -16 + Math.cos(angle) * 17 * ring,
        y: 11 + Math.sin(angle) * 17 * ring,
        z: -53 - (1 - ring) * 10,
        alpha: 0.52 + 0.4 * (1 - ring),
        hue: 202,
      };
    }

    const mast = r1 > 0.5 ? -1 : 1;
    const u = r2;
    return {
      x: mast === 1 ? 48 + u * 72 : -38,
      y: mast === 1 ? -48 - u * 58 : -54 - u * 70,
      z: mast === 1 ? 8 + u * 26 : 18,
      alpha: 0.46 + 0.42 * r3,
      hue: 217,
    };
  }

  // Three restrained telemetry tracks frame the spacecraft without obscuring it.
  const local = index - instrumentEnd;
  const track = local % 3;
  const slot = Math.floor(local / 3);
  const slotsPerTrack = Math.max(1, Math.ceil((total - instrumentEnd) / 3));
  const angle = TAU * (slot / slotsPerTrack) + time * (0.052 + track * 0.014);
  const radiusX = 250 + track * 27;
  const radiusY = 106 + track * 20;
  const node = slot % (83 - track * 9) < 3;
  return {
    x: Math.cos(angle) * radiusX,
    y: Math.sin(angle) * radiusY + (track - 1) * 10,
    z: Math.sin(angle * 2 + track * 0.9) * (50 + track * 14),
    alpha: node ? 0.9 : 0.12 + 0.09 * r3,
    hue: node ? 187 : 216 + track * 5,
  };
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const packageInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef(0);
  const pointerRef = useRef({
    targetX: 0,
    targetY: 0,
    x: 0,
    y: 0,
    active: false,
  });
  const speedRef = useRef(0.55);
  const pointCountRef = useRef(DEFAULT_POINT_COUNT);
  const dotSizeRef = useRef(1);
  const brightnessRef = useRef(1);
  const particleColorRef = useRef("#d8cbff");
  const glowColorRef = useRef("#a986ff");
  const backgroundColorRef = useRef("#050408");
  const pausedRef = useRef(false);
  const seedRef = useRef(7);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(0.55);
  const [pointCount, setPointCount] = useState(DEFAULT_POINT_COUNT);
  const [dotSize, setDotSize] = useState(1);
  const [brightness, setBrightness] = useState(1);
  const [particleColor, setParticleColor] = useState("#d8cbff");
  const [glowColor, setGlowColor] = useState("#a986ff");
  const [backgroundColor, setBackgroundColor] = useState("#050408");
  const [seed, setSeed] = useState(7);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [packageStatus, setPackageStatus] = useState("");

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    pointCountRef.current = pointCount;
  }, [pointCount]);

  useEffect(() => {
    dotSizeRef.current = dotSize;
  }, [dotSize]);

  useEffect(() => {
    brightnessRef.current = brightness;
  }, [brightness]);

  useEffect(() => {
    particleColorRef.current = particleColor;
  }, [particleColor]);

  useEffect(() => {
    glowColorRef.current = glowColor;
  }, [glowColor]);

  useEffect(() => {
    backgroundColorRef.current = backgroundColor;
  }, [backgroundColor]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    seedRef.current = seed;
  }, [seed]);

  useEffect(() => {
    function updateScroll() {
      const distance = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      scrollRef.current = Math.max(0, Math.min(1, window.scrollY / distance));
      document.documentElement.style.setProperty("--scroll-progress", scrollRef.current.toString());
    }

    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", updateScroll);
    return () => {
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    let frame = 0;
    let elapsed = 0;
    let previous = performance.now();

    function resize() {
      const box = canvas!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.max(1, Math.floor(box.width * dpr));
      canvas!.height = Math.max(1, Math.floor(box.height * dpr));
      context!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw(now: number) {
      const delta = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      if (!pausedRef.current) elapsed += delta * speedRef.current;

      const width = canvas!.clientWidth;
      const height = canvas!.clientHeight;
      const progress = scrollRef.current;
      const storyProgress = Math.min(1, progress / 0.74);
      const cameraPush = 1 + Math.pow(storyProgress, 1.6) * 0.58;
      const illustrationScale = width < 600 ? 1.34 : 1.46;
      const scale = Math.min(width / 900, height / 720) * illustrationScale * cameraPush;
      const pointer = pointerRef.current;
      pointer.x += (pointer.targetX - pointer.x) * 0.065;
      pointer.y += (pointer.targetY - pointer.y) * 0.065;
      const centerX =
        width * (0.53 - storyProgress * 0.12) + pointer.x * 46 * Math.min(scale, 1.4);
      const centerY =
        height * (0.49 + storyProgress * 0.045) + pointer.y * 32 * Math.min(scale, 1.4);
      const cursorX = width * (pointer.x * 0.5 + 0.5);
      const cursorY = height * (pointer.y * 0.5 + 0.5);
      const particleRgb = hexToRgb(particleColorRef.current);
      const glowRgb = hexToRgb(glowColorRef.current);
      const backgroundRgb = hexToRgb(backgroundColorRef.current);

      context!.globalCompositeOperation = "source-over";
      context!.fillStyle = backgroundColorRef.current;
      context!.fillRect(0, 0, width, height);

      const glow = context!.createRadialGradient(
        pointer.active ? cursorX : centerX,
        pointer.active ? cursorY : centerY - 20 * scale,
        0,
        centerX,
        centerY,
        Math.min(width, height) * 0.62,
      );
      glow.addColorStop(0, rgba(glowRgb, 0.24));
      glow.addColorStop(0.28, rgba(glowRgb, 0.12));
      glow.addColorStop(0.7, rgba(glowRgb, 0.04));
      glow.addColorStop(1, rgba(backgroundRgb, 0));
      context!.fillStyle = glow;
      context!.fillRect(0, 0, width, height);

      const planetGlow = context!.createLinearGradient(0, height * 0.68, 0, height);
      planetGlow.addColorStop(0, rgba(backgroundRgb, 0));
      planetGlow.addColorStop(0.32, rgba(glowRgb, 0.055 * (1 - storyProgress)));
      planetGlow.addColorStop(1, rgba(glowRgb, 0.16 * (1 - storyProgress)));
      context!.fillStyle = planetGlow;
      context!.beginPath();
      context!.ellipse(
        width * 0.5,
        height + 145 * scale,
        width * 0.72,
        260 * scale,
        0,
        Math.PI,
        TAU,
      );
      context!.fill();
      context!.strokeStyle = rgba(particleRgb, 0.22 * (1 - storyProgress));
      context!.lineWidth = 1;
      context!.stroke();

      for (let star = 0; star < 90; star += 1) {
        const starX = noise(star, seedRef.current + 11) * width;
        const starY = noise(star + 503, seedRef.current + 17) * height * 0.78;
        const twinkle = 0.12 + 0.18 * Math.sin(elapsed * 0.7 + star);
        context!.fillStyle = rgba(
          particleRgb,
          Math.max(0.03, twinkle) * (1 - storyProgress * 0.55),
        );
        context!.fillRect(starX, starY, star % 13 === 0 ? 1.4 : 0.7, star % 13 === 0 ? 1.4 : 0.7);
      }

      if (pointer.active || Math.abs(pointer.x) + Math.abs(pointer.y) > 0.02) {
        const cursorGlow = context!.createRadialGradient(
          cursorX,
          cursorY,
          0,
          cursorX,
          cursorY,
          150 * scale,
        );
        cursorGlow.addColorStop(0, rgba(glowRgb, 0.14));
        cursorGlow.addColorStop(0.32, rgba(glowRgb, 0.055));
        cursorGlow.addColorStop(1, rgba(backgroundRgb, 0));
        context!.fillStyle = cursorGlow;
        context!.fillRect(0, 0, width, height);
      }

      context!.globalCompositeOperation = "lighter";
      const rotation =
        -0.2 +
        Math.sin(elapsed * 0.32) * 0.24 +
        pointer.x * 0.82 +
        storyProgress * 0.38;
      const count = pointCountRef.current;

      for (let i = 0; i < count; i += 1) {
        let point = sampleSatellite(i, count, elapsed, seedRef.current);
        point = rotateX(
          point,
          pointer.y * -0.4 + Math.sin(elapsed * 0.21) * 0.035 - storyProgress * 0.08,
        );
        point = rotateY(point, rotation);
        const perspective = 540 / (540 + point.z);
        let x = centerX + point.x * scale * perspective;
        let y = centerY + point.y * scale * perspective;
        const cursorDx = cursorX - x;
        const cursorDy = cursorY - y;
        const cursorDistance = Math.hypot(cursorDx, cursorDy);
        const cursorRadius = 145 * scale;
        const attraction =
          pointer.active && cursorDistance < cursorRadius
            ? (1 - cursorDistance / cursorRadius) ** 2
            : 0;
        if (attraction > 0) {
          const orbit = Math.sin(i * 0.043 + elapsed * 3.2);
          x += cursorDx * attraction * 0.18 - cursorDy * attraction * orbit * 0.055;
          y += cursorDy * attraction * 0.18 + cursorDx * attraction * orbit * 0.055;
        }
        const depth = Math.max(0.18, Math.min(1, (point.z + 140) / 280));
        const pulse = 0.72 + 0.28 * Math.sin(i * 0.029 + elapsed * 2.6);
        const alpha = Math.min(
          1,
          point.alpha *
            (0.45 + depth * 0.55) *
            pulse *
            (1 + attraction * 1.8) *
            brightnessRef.current,
        );
        const size =
          (0.52 + depth * 0.88 + attraction * 1.1) *
          scale *
          dotSizeRef.current;
        const colorMix = Math.min(1, attraction * 0.9 + (1 - depth) * 0.18);
        const red = Math.round(particleRgb.r * (1 - colorMix) + glowRgb.r * colorMix);
        const green = Math.round(particleRgb.g * (1 - colorMix) + glowRgb.g * colorMix);
        const blue = Math.round(particleRgb.b * (1 - colorMix) + glowRgb.b * colorMix);
        context!.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
        context!.fillRect(x, y, size, size);
      }

      if (pointer.active) {
        context!.strokeStyle = rgba(glowRgb, 0.42);
        context!.lineWidth = 0.75;
        context!.beginPath();
        context!.arc(cursorX, cursorY, 13 + Math.sin(elapsed * 2) * 2, 0, TAU);
        context!.stroke();
        context!.fillStyle = rgba(particleRgb, 0.82);
        context!.fillRect(cursorX - 1, cursorY - 1, 2, 2);
      }

      frame = requestAnimationFrame(draw);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  function reseed() {
    setSeed((current) => current + 1);
  }

  function exportToolPackage() {
    const toolPackage = {
      format: TOOL_PACKAGE_FORMAT,
      version: TOOL_PACKAGE_VERSION,
      name: "Particle Signal",
      createdAt: new Date().toISOString(),
      scene: {
        model: "communications-satellite",
        seed,
      },
      particles: {
        count: pointCount,
        size: dotSize,
        brightness,
        color: particleColor,
      },
      environment: {
        glowColor,
        backgroundColor,
      },
      animation: {
        speed,
        paused,
        cursorReactive: true,
        scrollReactive: true,
      },
    };
    const blob = new Blob([JSON.stringify(toolPackage, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `particle-signal-seed-${seed}.orbital.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setPackageStatus("Tool package exported");
  }

  async function importToolPackage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text()) as {
        format?: unknown;
        version?: unknown;
        scene?: { seed?: unknown };
        particles?: {
          count?: unknown;
          size?: unknown;
          brightness?: unknown;
          color?: unknown;
        };
        environment?: {
          glowColor?: unknown;
          backgroundColor?: unknown;
        };
        animation?: {
          speed?: unknown;
          paused?: unknown;
        };
      };

      if (
        parsed.format !== TOOL_PACKAGE_FORMAT ||
        parsed.version !== TOOL_PACKAGE_VERSION
      ) {
        throw new Error("Unsupported package");
      }

      setSeed(Math.round(clamp(parsed.scene?.seed, seed, 1, 9999)));
      setPointCount(
        Math.round(
          clamp(parsed.particles?.count, pointCount, 3000, MAX_POINT_COUNT) / 1000,
        ) * 1000,
      );
      setDotSize(clamp(parsed.particles?.size, dotSize, 0.35, 2.4));
      setBrightness(clamp(parsed.particles?.brightness, brightness, 0.4, 1.6));
      setParticleColor(validHex(parsed.particles?.color, particleColor));
      setGlowColor(validHex(parsed.environment?.glowColor, glowColor));
      setBackgroundColor(
        validHex(parsed.environment?.backgroundColor, backgroundColor),
      );
      setSpeed(clamp(parsed.animation?.speed, speed, 0.1, 1.4));
      if (typeof parsed.animation?.paused === "boolean") {
        setPaused(parsed.animation.paused);
      }
      setPackageStatus(`Imported ${file.name}`);
    } catch {
      setPackageStatus("Could not import this package");
    } finally {
      event.target.value = "";
    }
  }

  function updatePointer(event: React.PointerEvent<HTMLElement>) {
    const bounds = document.documentElement.getBoundingClientRect();
    pointerRef.current.targetX = Math.max(
      -1,
      Math.min(1, (event.clientX / bounds.width) * 2 - 1),
    );
    pointerRef.current.targetY = Math.max(
      -1,
      Math.min(1, (event.clientY / window.innerHeight) * 2 - 1),
    );
    pointerRef.current.active = true;
  }

  function releasePointer() {
    pointerRef.current.targetX = 0;
    pointerRef.current.targetY = 0;
    pointerRef.current.active = false;
  }

  return (
    <main
      className="experience"
      onPointerMove={updatePointer}
      onPointerLeave={releasePointer}
    >
      <div className="scene-shell" aria-label="Interactive generative point-cloud artwork">
        <canvas
          ref={canvasRef}
          aria-label="Animated point-cloud satellite that follows your cursor"
        />
        <div className="grain" aria-hidden="true" />
      </div>

      <nav className="site-nav" aria-label="Primary navigation">
        <a className="wordmark" href="#top" aria-label="Particle Signal home">
          PS / 01
        </a>
        <div className="nav-status">
          <span className="pulse-dot" />
          SIGNAL LIVE
        </div>
        <button
          type="button"
          className="control-toggle"
          aria-expanded={controlsOpen}
          onClick={() => setControlsOpen((value) => !value)}
        >
          {controlsOpen ? "Close" : "Tune signal"}
          <span>{controlsOpen ? "×" : "+"}</span>
        </button>
      </nav>

      <aside className={`signal-panel ${controlsOpen ? "is-open" : ""}`} aria-hidden={!controlsOpen}>
        <div className="panel-heading">
          <span>Signal controls</span>
          <span>SEED {seed.toString().padStart(2, "0")}</span>
        </div>
        <label>
          <span>Orbital motion <output>{speed.toFixed(2)}×</output></span>
          <input
            type="range"
            min="0.1"
            max="1.4"
            step="0.05"
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
          />
        </label>
        <label>
          <span>Point count <output>{pointCount.toLocaleString()}</output></span>
          <input
            type="range"
            min="3000"
            max={MAX_POINT_COUNT}
            step="1000"
            value={pointCount}
            onChange={(event) => setPointCount(Number(event.target.value))}
          />
        </label>
        <label>
          <span>Dot size <output>{dotSize.toFixed(2)}×</output></span>
          <input
            type="range"
            min="0.35"
            max="2.4"
            step="0.05"
            value={dotSize}
            onChange={(event) => setDotSize(Number(event.target.value))}
          />
        </label>
        <label>
          <span>Brightness <output>{brightness.toFixed(2)}×</output></span>
          <input
            type="range"
            min="0.4"
            max="1.6"
            step="0.05"
            value={brightness}
            onChange={(event) => setBrightness(Number(event.target.value))}
          />
        </label>
        <div className="color-controls">
          <label className="color-control">
            <span>Dots</span>
            <input
              type="color"
              value={particleColor}
              onChange={(event) => setParticleColor(event.target.value)}
              aria-label="Dot color"
            />
          </label>
          <label className="color-control">
            <span>Glow</span>
            <input
              type="color"
              value={glowColor}
              onChange={(event) => setGlowColor(event.target.value)}
              aria-label="Glow color"
            />
          </label>
          <label className="color-control">
            <span>Space</span>
            <input
              type="color"
              value={backgroundColor}
              onChange={(event) => setBackgroundColor(event.target.value)}
              aria-label="Background color"
            />
          </label>
        </div>
        <div className="package-actions">
          <button type="button" onClick={exportToolPackage}>
            Export tool package
            <span>↓</span>
          </button>
          <button type="button" onClick={() => packageInputRef.current?.click()}>
            Import tool package
            <span>↑</span>
          </button>
          <input
            ref={packageInputRef}
            className="package-input"
            type="file"
            accept=".json,.orbital.json,application/json"
            onChange={importToolPackage}
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
        {packageStatus ? (
          <p className="package-status" role="status">{packageStatus}</p>
        ) : null}
        <div className="panel-actions">
          <button type="button" onClick={() => setPaused((value) => !value)}>
            {paused ? "Resume field" : "Pause field"}
          </button>
          <button type="button" onClick={reseed}>New variation ↗</button>
        </div>
      </aside>

      <div className="telemetry-badges" aria-hidden="true">
        <span className="telemetry-badge badge-one">RX</span>
        <span className="telemetry-badge badge-two">∿</span>
        <span className="telemetry-badge badge-three">◇</span>
      </div>

      <div className="story">
        <section className="hero" id="top">
          <div className="hero-copy">
            <div className="kicker">Introducing orbital intelligence</div>
            <h1>Signals with<br /><em>perspective.</em></h1>
            <p>
              A living satellite model formed from {pointCount.toLocaleString()} points.
              Move to alter its attitude. Scroll to enter the transmission.
            </p>
          </div>
          <div className="scroll-cue" aria-hidden="true">
            <span>Scroll to approach</span>
            <i />
          </div>
          <div className="hero-index">01 — 04</div>
        </section>

        <section className="manifesto">
          <p className="section-label">[ THE RELAY ]</p>
          <h2>
            It doesn&apos;t just observe.
            <br />
            It <em>responds.</em>
          </h2>
          <p className="manifesto-copy">
            Light, attitude and telemetry continuously recompute around your position—
            turning a static orbital object into a responsive instrument.
          </p>
        </section>

        <section className="lens-section">
          <div className="lens-card">
            <span className="card-index">02 / COMMUNICATIONS ARRAY</span>
            <h3>See the signal take shape.</h3>
            <p>
              Cursor proximity bends the point field while a moving lavender source
              reveals the equipment bus, communications dish and solar geometry.
            </p>
          </div>
          <div className="coordinate-readout" aria-hidden="true">
            <span>ALT 547.28 KM</span>
            <span>INC 51.64°</span>
            <span>{pointCount.toLocaleString()} NODES</span>
          </div>
        </section>

        <section className="systems">
          <div className="systems-header">
            <p className="section-label">[ SYSTEM ARCHITECTURE ]</p>
            <h2>One relay.<br />Three living systems.</h2>
          </div>
          <div className="system-grid">
            <article>
              <span>01</span>
              <h3>Comms</h3>
              <p>A dominant parabolic dish and feed boom make the relay readable at a glance.</p>
            </article>
            <article>
              <span>02</span>
              <h3>Solar</h3>
              <p>Six articulated photovoltaic surfaces breathe with independent phase.</p>
            </article>
            <article>
              <span>03</span>
              <h3>Telemetry</h3>
              <p>Three precessing orbital tracks carry live nodes around the flight bus.</p>
            </article>
          </div>
          <div className="systems-footer">
            <span>PARTICLE SIGNAL / EXPERIMENT 01</span>
            <a href="#top">Return to orbit ↑</a>
          </div>
        </section>
      </div>
    </main>
  );
}
