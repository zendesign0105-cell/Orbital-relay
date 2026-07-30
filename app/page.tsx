"use client";

import {
  ChangeEvent,
  DragEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type Particle = {
  x: number;
  y: number;
  depth: number;
  r: number;
  g: number;
  b: number;
  alpha: number;
  phase: number;
};

type PixelSource = {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
};

type ColorMode = "original" | "tint";
type FocusMode = "subject" | "full";

type Rgb = {
  r: number;
  g: number;
  b: number;
};

type RenderSettings = {
  background: string;
  colorMode: ColorMode;
  depth: number;
  dotSize: number;
  tint: string;
};

const MAX_POINTS = 60_000;
const DEFAULT_POINTS = 18_000;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function hash(a: number, b: number, salt = 0) {
  const value = Math.sin(a * 127.1 + b * 311.7 + salt * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

function hexToRgb(hex: string) {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function smoothstep(edgeStart: number, edgeEnd: number, value: number) {
  const progress = clamp((value - edgeStart) / (edgeEnd - edgeStart), 0, 1);
  return progress * progress * (3 - 2 * progress);
}

function getBackgroundPalette(source: PixelSource): Rgb[] {
  const { width, height, pixels } = source;
  const patchSize = Math.max(4, Math.round(Math.min(width, height) * 0.075));
  const sampleStep = Math.max(1, Math.floor(patchSize / 10));
  const corners = [
    [0, 0],
    [Math.max(0, width - patchSize), 0],
    [0, Math.max(0, height - patchSize)],
    [Math.max(0, width - patchSize), Math.max(0, height - patchSize)],
  ];

  return corners.flatMap(([startX, startY]) => {
    let red = 0;
    let green = 0;
    let blue = 0;
    let totalWeight = 0;

    for (let y = startY; y < Math.min(height, startY + patchSize); y += sampleStep) {
      for (let x = startX; x < Math.min(width, startX + patchSize); x += sampleStep) {
        const offset = (y * width + x) * 4;
        const alpha = pixels[offset + 3] / 255;

        if (alpha < 0.12) {
          continue;
        }

        red += pixels[offset] * alpha;
        green += pixels[offset + 1] * alpha;
        blue += pixels[offset + 2] * alpha;
        totalWeight += alpha;
      }
    }

    if (totalWeight === 0) {
      return [];
    }

    return [
      {
        r: red / totalWeight,
        g: green / totalWeight,
        b: blue / totalWeight,
      },
    ];
  });
}

function getSubjectWeight(
  source: PixelSource,
  palette: Rgb[],
  x: number,
  y: number,
  cleanup: number,
) {
  if (palette.length === 0) {
    return 1;
  }

  const { width, height, pixels } = source;
  const offset = (y * width + x) * 4;
  const r = pixels[offset];
  const g = pixels[offset + 1];
  const b = pixels[offset + 2];
  let closestBackground = 1;

  for (const color of palette) {
    const red = (r - color.r) / 255;
    const green = (g - color.g) / 255;
    const blue = (b - color.b) / 255;
    const distance = Math.sqrt(
      red * red * 0.24 + green * green * 0.58 + blue * blue * 0.18,
    );
    closestBackground = Math.min(closestBackground, distance);
  }

  const normalizedX = (x / Math.max(1, width - 1) - 0.5) * 2;
  const normalizedY = (y / Math.max(1, height - 1) - 0.5) * 2;
  const centrality = 1 - clamp(Math.hypot(normalizedX, normalizedY) / 1.25, 0, 1);
  const subjectScore = closestBackground + centrality * 0.08;
  const threshold = 0.035 + (cleanup / 100) * 0.225;
  const feather = 0.065;

  return smoothstep(threshold - feather, threshold + feather, subjectScore);
}

function drawOrbitNetwork(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  scale: number,
  yaw: number,
  pitch: number,
  time: number,
  tint: Rgb,
) {
  const orbits = [
    { radius: 1.34, squash: 0.46, rotation: -0.28, speed: 0.00016, phase: 0.4 },
    { radius: 1.48, squash: 0.34, rotation: 0.16, speed: -0.00012, phase: 2.3 },
    { radius: 1.17, squash: 0.63, rotation: 0.48, speed: 0.0002, phase: 4.6 },
  ];

  context.save();
  context.lineWidth = 0.72;

  orbits.forEach((orbit, index) => {
    const rotation = orbit.rotation + yaw * 0.34 - pitch * 0.16;
    const radiusX = scale * orbit.radius;
    const radiusY =
      scale * orbit.squash * (1 - Math.min(0.22, Math.abs(pitch) * 0.22));

    context.beginPath();
    context.ellipse(
      centerX,
      centerY,
      radiusX,
      radiusY,
      rotation,
      0,
      Math.PI * 2,
    );
    context.strokeStyle = `rgba(${tint.r}, ${tint.g}, ${tint.b}, ${
      0.18 - index * 0.025
    })`;
    context.stroke();

    const theta = time * orbit.speed + orbit.phase;
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);
    const cosRotation = Math.cos(rotation);
    const sinRotation = Math.sin(rotation);
    const nodeX =
      centerX +
      cosTheta * radiusX * cosRotation -
      sinTheta * radiusY * sinRotation;
    const nodeY =
      centerY +
      cosTheta * radiusX * sinRotation +
      sinTheta * radiusY * cosRotation;
    const nodeSize = 1.7 + index * 0.35;

    context.beginPath();
    context.arc(nodeX, nodeY, nodeSize, 0, Math.PI * 2);
    context.fillStyle = `rgba(${tint.r}, ${tint.g}, ${tint.b}, 0.86)`;
    context.shadowColor = `rgba(${tint.r}, ${tint.g}, ${tint.b}, 0.72)`;
    context.shadowBlur = 12;
    context.fill();
    context.shadowBlur = 0;

    const echoTheta = theta + Math.PI * (0.72 + index * 0.15);
    const echoCos = Math.cos(echoTheta);
    const echoSin = Math.sin(echoTheta);
    const echoX =
      centerX +
      echoCos * radiusX * cosRotation -
      echoSin * radiusY * sinRotation;
    const echoY =
      centerY +
      echoCos * radiusX * sinRotation +
      echoSin * radiusY * cosRotation;

    context.beginPath();
    context.arc(echoX, echoY, 0.85, 0, Math.PI * 2);
    context.fillStyle = `rgba(${tint.r}, ${tint.g}, ${tint.b}, 0.44)`;
    context.fill();
  });

  context.restore();
}

function createDemoParticles(targetCount: number): Particle[] {
  const count = Math.min(targetCount, 14_000);

  return Array.from({ length: count }, (_, index) => {
    const radius = Math.sqrt((index + 0.5) / count);
    const angle = index * GOLDEN_ANGLE;
    const ripple = Math.sin(radius * 22 - angle * 0.35);
    const brightness = 0.58 + hash(index, count) * 0.42;

    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.68,
      depth: ripple * 0.48 + Math.cos(angle * 2) * 0.12,
      r: Math.round(183 + brightness * 54),
      g: Math.round(170 + brightness * 50),
      b: 255,
      alpha: 0.2 + brightness * 0.72,
      phase: hash(index, 17) * Math.PI * 2,
    };
  });
}

function createImageParticles(
  source: PixelSource,
  targetCount: number,
  focusMode: FocusMode,
  cleanup: number,
): Particle[] {
  const { width, height, pixels } = source;
  const area = width * height;
  const palette = focusMode === "subject" ? getBackgroundPalette(source) : [];
  let retention = 1;

  if (focusMode === "subject" && palette.length > 0) {
    const probeStep = Math.max(2, Math.floor(Math.sqrt(area / 5_000)));
    let kept = 0;
    let checked = 0;

    for (let y = 0; y < height; y += probeStep) {
      for (let x = 0; x < width; x += probeStep) {
        const offset = (y * width + x) * 4;
        if (pixels[offset + 3] / 255 < 0.06) {
          continue;
        }
        checked += 1;
        if (getSubjectWeight(source, palette, x, y, cleanup) > 0.06) {
          kept += 1;
        }
      }
    }

    retention = checked > 0 ? clamp(kept / checked, 0.06, 1) : 1;
  }

  const step = Math.max(
    1,
    Math.sqrt((area * retention) / (targetCount * 1.12)),
  );
  const longestSide = Math.max(width, height);
  const particles: Particle[] = [];

  for (
    let sampleY = step * 0.5;
    sampleY < height && particles.length < targetCount;
    sampleY += step
  ) {
    for (
      let sampleX = step * 0.5;
      sampleX < width && particles.length < targetCount;
      sampleX += step
    ) {
      const jitterX = (hash(sampleX, sampleY, 1) - 0.5) * step * 0.5;
      const jitterY = (hash(sampleX, sampleY, 2) - 0.5) * step * 0.5;
      const x = clamp(Math.round(sampleX + jitterX), 0, width - 1);
      const y = clamp(Math.round(sampleY + jitterY), 0, height - 1);
      const offset = (y * width + x) * 4;
      const alpha = pixels[offset + 3] / 255;

      if (alpha < 0.06) {
        continue;
      }

      const r = pixels[offset];
      const g = pixels[offset + 1];
      const b = pixels[offset + 2];
      const luminance = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
      const subjectWeight =
        focusMode === "subject"
          ? getSubjectWeight(source, palette, x, y, cleanup)
          : 1;

      if (subjectWeight < 0.06) {
        continue;
      }

      particles.push({
        x: (x - width / 2) / (longestSide / 2),
        y: (y - height / 2) / (longestSide / 2),
        depth: (luminance - 0.5) * 1.35,
        r,
        g,
        b,
        alpha: alpha * (0.38 + luminance * 0.62) * subjectWeight,
        phase: hash(x, y, 3) * Math.PI * 2,
      });
    }
  }

  return particles;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pixelSourceRef = useRef<PixelSource | null>(null);
  const particlesRef = useRef<Particle[]>(createDemoParticles(DEFAULT_POINTS));
  const frameRef = useRef<number | null>(null);
  const pointerRef = useRef({ active: false, x: 0, y: 0 });
  const viewRef = useRef({
    dragging: false,
    lastX: 0,
    lastY: 0,
    pitch: -0.04,
    yaw: 0,
    zoom: 1,
  });

  const [background, setBackground] = useState("#050408");
  const [colorMode, setColorMode] = useState<ColorMode>("tint");
  const [depth, setDepth] = useState(42);
  const [density, setDensity] = useState(DEFAULT_POINTS);
  const [dotSize, setDotSize] = useState(1.15);
  const [focusMode, setFocusMode] = useState<FocusMode>("subject");
  const [cleanup, setCleanup] = useState(64);
  const [tint, setTint] = useState("#d8cbff");
  const [zoom, setZoom] = useState(1);
  const [activeCount, setActiveCount] = useState(DEFAULT_POINTS);
  const [fileName, setFileName] = useState("");
  const [hasImage, setHasImage] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [error, setError] = useState("");

  const settingsRef = useRef<RenderSettings>({
    background,
    colorMode: "tint",
    depth,
    dotSize,
    tint,
  });

  useEffect(() => {
    settingsRef.current = {
      background,
      colorMode,
      depth,
      dotSize,
      tint,
    };
  }, [
    background,
    colorMode,
    depth,
    dotSize,
    tint,
  ]);

  const rebuildParticles = useCallback(
    (nextDensity: number) => {
      const source = pixelSourceRef.current;
      const nextParticles = source
        ? createImageParticles(source, nextDensity, focusMode, cleanup)
        : createDemoParticles(nextDensity);

      particlesRef.current = nextParticles;
      setActiveCount(nextParticles.length);
    },
    [cleanup, focusMode],
  );

  useEffect(() => {
    rebuildParticles(density);
  }, [density, rebuildParticles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      return;
    }

    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const render = (time: number) => {
      const settings = settingsRef.current;
      const particles = particlesRef.current;
      const pointer = pointerRef.current;
      const view = viewRef.current;
      const tintRgb = hexToRgb(settings.tint);
      const backgroundRgb = hexToRgb(settings.background);

      context.globalAlpha = 1;
      context.fillStyle = settings.background;
      context.fillRect(0, 0, width, height);

      const glow = context.createRadialGradient(
        width * 0.48,
        height * 0.45,
        0,
        width * 0.48,
        height * 0.45,
        Math.max(width, height) * 0.68,
      );
      glow.addColorStop(
        0,
        `rgba(${tintRgb.r}, ${tintRgb.g}, ${tintRgb.b}, 0.075)`,
      );
      glow.addColorStop(
        0.55,
        `rgba(${backgroundRgb.r}, ${backgroundRgb.g}, ${backgroundRgb.b}, 0.02)`,
      );
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      const pointerYaw = pointer.active
        ? ((pointer.x / Math.max(1, width) - 0.5) * 0.12)
        : 0;
      const pointerPitch = pointer.active
        ? ((pointer.y / Math.max(1, height) - 0.5) * -0.08)
        : 0;
      const yaw = view.yaw + pointerYaw;
      const pitch = view.pitch + pointerPitch;
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const cosX = Math.cos(pitch);
      const sinX = Math.sin(pitch);
      const scale = Math.min(width, height) * 0.42 * view.zoom;
      const centerX = width > 980 ? width * 0.45 : width * 0.5;
      const centerY = height * (width < 720 ? 0.42 : 0.5);
      const depthAmount = settings.depth / 100;

      drawOrbitNetwork(
        context,
        centerX,
        centerY,
        scale,
        yaw,
        pitch,
        time,
        tintRgb,
      );

      context.fillStyle = settings.tint;

      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];
        const breathing =
          Math.sin(time * 0.00062 + particle.phase) * 0.018 * depthAmount;
        const z = particle.depth * depthAmount + breathing;
        const rotatedX = particle.x * cosY - z * sinY;
        const rotatedZ = particle.x * sinY + z * cosY;
        const rotatedY = particle.y * cosX - rotatedZ * sinX;
        const finalZ = particle.y * sinX + rotatedZ * cosX;
        const perspective = 3.25 / Math.max(1.8, 3.25 + finalZ);

        const screenX = centerX + rotatedX * scale * perspective;
        const screenY = centerY + rotatedY * scale * perspective;

        const size = Math.max(
          0.45,
          settings.dotSize * perspective * (0.62 + particle.alpha * 0.52),
        );
        const edgeFade =
          screenX < 0 || screenX > width || screenY < 0 || screenY > height
            ? 0
            : 1;

        if (!edgeFade) {
          continue;
        }

        if (settings.colorMode === "original") {
          context.fillStyle = `rgb(${particle.r}, ${particle.g}, ${particle.b})`;
        }

        context.globalAlpha = clamp(
          particle.alpha * (0.72 + perspective * 0.2),
          0.08,
          0.98,
        );
        context.fillRect(
          screenX - size / 2,
          screenY - size / 2,
          size,
          size,
        );
      }

      context.globalAlpha = 1;
      frameRef.current = window.requestAnimationFrame(render);
    };

    resize();
    window.addEventListener("resize", resize);
    frameRef.current = window.requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const loadImageFile = useCallback(
    (file: File) => {
      setError("");

      if (!file.type.startsWith("image/")) {
        setError("Choose a JPG, PNG, WebP, GIF, or other image file.");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError("That image is larger than 20 MB. Choose a smaller file.");
        return;
      }

      setIsBusy(true);
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();

      image.onload = () => {
        const maxDimension = 960;
        const ratio = Math.min(
          1,
          maxDimension / Math.max(image.naturalWidth, image.naturalHeight),
        );
        const width = Math.max(1, Math.round(image.naturalWidth * ratio));
        const height = Math.max(1, Math.round(image.naturalHeight * ratio));
        const samplingCanvas = document.createElement("canvas");
        const samplingContext = samplingCanvas.getContext("2d", {
          willReadFrequently: true,
        });

        if (!samplingContext) {
          URL.revokeObjectURL(objectUrl);
          setError("This browser could not process the image.");
          setIsBusy(false);
          return;
        }

        samplingCanvas.width = width;
        samplingCanvas.height = height;
        samplingContext.drawImage(image, 0, 0, width, height);

        try {
          const imageData = samplingContext.getImageData(0, 0, width, height);
          pixelSourceRef.current = {
            width,
            height,
            pixels: imageData.data,
          };
          const nextParticles = createImageParticles(
            pixelSourceRef.current,
            density,
            focusMode,
            cleanup,
          );
          particlesRef.current = nextParticles;
          setActiveCount(nextParticles.length);
          setFileName(file.name);
          setHasImage(true);
          setIsPanelOpen(true);
          viewRef.current = {
            dragging: false,
            lastX: 0,
            lastY: 0,
            pitch: -0.04,
            yaw: 0,
            zoom: 1,
          };
          setZoom(1);
        } catch {
          setError("The image could not be read. Try saving it as PNG or JPG.");
        } finally {
          URL.revokeObjectURL(objectUrl);
          setIsBusy(false);
        }
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        setError("The image could not be opened. Try another file.");
        setIsBusy(false);
      };

      image.src = objectUrl;
    },
    [cleanup, density, focusMode],
  );

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      loadImageFile(file);
    }
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDraggingFile(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      loadImageFile(file);
    }
  };

  const updatePointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerRef.current = {
      active: true,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    updatePointer(event);
    viewRef.current.dragging = true;
    viewRef.current.lastX = event.clientX;
    viewRef.current.lastY = event.clientY;
  };

  const handlePointerMove = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    updatePointer(event);

    if (!viewRef.current.dragging) {
      return;
    }

    const deltaX = event.clientX - viewRef.current.lastX;
    const deltaY = event.clientY - viewRef.current.lastY;
    viewRef.current.yaw += deltaX * 0.006;
    viewRef.current.pitch = clamp(
      viewRef.current.pitch + deltaY * 0.005,
      -0.72,
      0.72,
    );
    viewRef.current.lastX = event.clientX;
    viewRef.current.lastY = event.clientY;
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    viewRef.current.dragging = false;
  };

  const handleWheel = (event: WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const nextZoom = clamp(viewRef.current.zoom - event.deltaY * 0.001, 0.5, 3);
    viewRef.current.zoom = nextZoom;
    setZoom(nextZoom);
  };

  const updateZoom = (value: number) => {
    const nextZoom = clamp(value, 0.5, 3);
    viewRef.current.zoom = nextZoom;
    setZoom(nextZoom);
  };

  const changeZoom = (amount: number) => {
    updateZoom(viewRef.current.zoom + amount);
  };

  const resetView = () => {
    viewRef.current.yaw = 0;
    viewRef.current.pitch = -0.04;
    viewRef.current.zoom = 1;
    setZoom(1);
  };

  const exportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasImage) {
      return;
    }

    canvas.toBlob((blob) => {
      if (!blob) {
        return;
      }

      const safeName =
        fileName
          .replace(/\.[^.]+$/, "")
          .replace(/[^a-z0-9]+/gi, "-")
          .replace(/^-|-$/g, "")
          .toLowerCase() || "particle-signal";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeName}-particle-signal.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  return (
    <main
      className={`tool-shell ${isDraggingFile ? "is-dropping" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDraggingFile(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) {
          setIsDraggingFile(false);
        }
      }}
      onDrop={handleDrop}
    >
      <canvas
        ref={canvasRef}
        className="particle-canvas"
        aria-label="Interactive image particle field"
        onDoubleClick={resetView}
        onPointerDown={handlePointerDown}
        onPointerLeave={() => {
          if (!viewRef.current.dragging) {
            pointerRef.current.active = false;
          }
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      />

      <div className="ambient-grid" aria-hidden="true" />
      <div className="noise-layer" aria-hidden="true" />

      <div className="zoom-controls" aria-label="View zoom controls">
        <button
          type="button"
          onClick={() => changeZoom(-0.2)}
          disabled={zoom <= 0.5}
          aria-label="Zoom out"
        >
          −
        </button>
        <output aria-live="polite">{Math.round(zoom * 100)}%</output>
        <button
          type="button"
          onClick={() => changeZoom(0.2)}
          disabled={zoom >= 3}
          aria-label="Zoom in"
        >
          +
        </button>
      </div>

      <header className="topbar">
        <a className="brand" href="#" aria-label="Particle Signal home">
          <span className="brand-mark">PS</span>
          <span className="brand-copy">
            <strong>Particle Signal</strong>
            <small>Image field studio</small>
          </span>
        </a>

        <div className="topbar-status" aria-label="Privacy status">
          <span className="status-light" />
          Processed locally
        </div>

        <div className="topbar-actions">
          <button
            className="button button-secondary"
            type="button"
            onClick={() => setIsPanelOpen((value) => !value)}
            aria-expanded={isPanelOpen}
            aria-controls="particle-controls"
          >
            Controls
          </button>
          <button
            className="button button-primary"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            {hasImage ? "Replace image" : "Upload image"}
            <span aria-hidden="true">↗</span>
          </button>
        </div>
      </header>

      <input
        ref={fileInputRef}
        className="visually-hidden"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        aria-label="Upload an image"
      />

      {!hasImage && (
        <section className="intro-card" aria-labelledby="tool-title">
          <span className="eyebrow">Subject → signal → orbit</span>
          <h1 id="tool-title">
            Turn any image into a <em>living signal.</em>
          </h1>
          <p>
            Upload a subject. Particle Signal isolates it locally, rebuilds it
            as a sculptural point field, then sets it in motion.
          </p>
          <button
            className="upload-target"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
          >
            <span className="upload-icon" aria-hidden="true">
              +
            </span>
            <span>
              <strong>{isBusy ? "Processing image…" : "Choose an image"}</strong>
              <small>or drop one anywhere · up to 20 MB</small>
            </span>
          </button>
          {error && <p className="error-message">{error}</p>}
          <div className="intro-meta" aria-label="Tool capabilities">
            <span>Orbital depth</span>
            <span>Private by default</span>
            <span>Up to 60K points</span>
          </div>
        </section>
      )}

      {hasImage && (
        <div className="file-chip" role="status">
          <span className="status-light" />
          <span className="file-name">{fileName}</span>
          <span>{formatCount(activeCount)} particles</span>
        </div>
      )}

      <aside
        id="particle-controls"
        className={`control-panel ${isPanelOpen ? "is-open" : ""}`}
        aria-label="Particle controls"
      >
        <div className="panel-header">
          <div>
            <span className="eyebrow">Signal controls</span>
            <h2>Compose the field</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={() => setIsPanelOpen(false)}
            aria-label="Close controls"
          >
            ×
          </button>
        </div>

        <div className="control-stack essential-controls">
          <label className="range-control">
            <span>
              Particle density
              <output>{formatCount(density)}</output>
            </span>
            <input
              type="range"
              min="3000"
              max={MAX_POINTS}
              step="1000"
              value={density}
              onChange={(event) => setDensity(Number(event.target.value))}
            />
          </label>

          <label className="range-control">
            <span>
              Depth
              <output>{depth}%</output>
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={depth}
              onChange={(event) => setDepth(Number(event.target.value))}
            />
          </label>

          <label className="range-control">
            <span>
              Zoom
              <output>{Math.round(zoom * 100)}%</output>
            </span>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(event) => updateZoom(Number(event.target.value))}
            />
          </label>

          <label className="signal-color-control">
            <span>
              <span className="control-label">Signal color</span>
              <small>Particles, paths and nodes</small>
            </span>
            <input
              type="color"
              value={tint}
              onChange={(event) => setTint(event.target.value)}
              aria-label="Signal tint color"
            />
          </label>
        </div>

        <details className="advanced-controls">
          <summary>
            <span>Advanced</span>
            <span aria-hidden="true">+</span>
          </summary>
          <div className="advanced-controls-body">
            <div className="control-group">
              <span className="control-label">Image area</span>
              <div className="segmented-control">
                {(["subject", "full"] as FocusMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={focusMode === mode ? "is-active" : ""}
                    onClick={() => setFocusMode(mode)}
                  >
                    {mode === "subject" ? "Subject" : "Full frame"}
                  </button>
                ))}
              </div>
            </div>

            <label
              className={`range-control ${
                focusMode === "full" ? "is-disabled" : ""
              }`}
            >
              <span>
                Background cleanup
                <output>{cleanup}%</output>
              </span>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={cleanup}
                disabled={focusMode === "full"}
                onChange={(event) => setCleanup(Number(event.target.value))}
              />
            </label>

            <label className="range-control">
              <span>
                Dot size
                <output>{dotSize.toFixed(2)}×</output>
              </span>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.05"
                value={dotSize}
                onChange={(event) => setDotSize(Number(event.target.value))}
              />
            </label>

            <div className="control-group">
              <span className="control-label">Particle color</span>
              <div className="segmented-control">
                {(["tint", "original"] as ColorMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={colorMode === mode ? "is-active" : ""}
                    onClick={() => setColorMode(mode)}
                  >
                    {mode === "tint" ? "Signal tint" : "Original"}
                  </button>
                ))}
              </div>
            </div>

            <label className="signal-color-control is-compact">
              <span>
                <span className="control-label">Space color</span>
              </span>
              <input
                type="color"
                value={background}
                onChange={(event) => setBackground(event.target.value)}
                aria-label="Background color"
              />
            </label>
          </div>
        </details>

        <div className="panel-actions">
          <button
            className="button button-secondary"
            type="button"
            onClick={resetView}
          >
            Reset view
          </button>
          <button
            className="button button-primary"
            type="button"
            onClick={exportImage}
            disabled={!hasImage}
          >
            Export PNG
            <span aria-hidden="true">↓</span>
          </button>
        </div>
      </aside>

      <div className="interaction-hint" aria-hidden="true">
        <span>Drag to rotate</span>
        <span>Scroll to zoom</span>
        <span>Move for depth</span>
      </div>

      {isDraggingFile && (
        <div className="drop-overlay" aria-hidden="true">
          <div>
            <span>+</span>
            Drop image to transform
          </div>
        </div>
      )}
    </main>
  );
}
