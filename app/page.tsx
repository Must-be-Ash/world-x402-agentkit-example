"use client";

import { useEffect, useRef } from "react";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { GooeyFilter } from "@/components/ui/gooey-filter";
import { PixelTrail } from "@/components/ui/pixel-trail";
import { useScreenSize } from "@/hooks/use-screen-size";

/** Load an SVG and sample it onto a small grid → array of [col, row] offsets. */
function sampleLogoPixels(
  svgSrc: string,
  gridW: number,
  gridH: number,
): Promise<[number, number][]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = gridW;
      canvas.height = gridH;
      const ctx = canvas.getContext("2d")!;
      const aspect = img.width / img.height;
      let dw = gridW, dh = gridH;
      if (aspect > gridW / gridH) dh = gridW / aspect;
      else dw = gridH * aspect;
      const ox = Math.floor((gridW - dw) / 2);
      const oy = Math.floor((gridH - dh) / 2);
      ctx.drawImage(img, ox, oy, dw, dh);
      const data = ctx.getImageData(0, 0, gridW, gridH);
      const px: [number, number][] = [];
      for (let y = 0; y < gridH; y++)
        for (let x = 0; x < gridW; x++)
          if (data.data[(y * gridW + x) * 4 + 3] > 80) px.push([x, y]);
      resolve(px);
    };
    img.onerror = () => resolve([]);
    img.src = svgSrc;
  });
}

export default function Home() {
  const screenSize = useScreenSize();
  const trailContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = trailContainerRef.current;
    if (!container) return;

    const pixelSize = screenSize.lessThan("md") ? 24 : 32;
    const logoGridSize = screenSize.lessThan("md") ? 7 : 10;
    const animationFrameIds: number[] = [];

    const buildPixelMap = (): Map<string, HTMLElement> => {
      const pixelMap = new Map<string, HTMLElement>();
      const allPixels = document.querySelectorAll('[id*="-pixel-"]');
      allPixels.forEach((pixel) => {
        const match = pixel.id.match(/-pixel-(\d+)-(\d+)/);
        if (match) {
          pixelMap.set(`${match[1]}-${match[2]}`, pixel as HTMLElement);
        }
      });
      return pixelMap;
    };

    const pixelTrailContainer = container.querySelector(
      '[class*="absolute inset-0"]',
    ) as HTMLDivElement;
    if (!pixelTrailContainer) return;

    let pixelMap = buildPixelMap();
    let mapRebuildAttempts = 0;
    const rebuildPixelMap = () => {
      if (pixelMap.size === 0 && mapRebuildAttempts < 10) {
        mapRebuildAttempts++;
        pixelMap = buildPixelMap();
        if (pixelMap.size === 0) setTimeout(rebuildPixelMap, 100);
      }
    };
    setTimeout(rebuildPixelMap, 300);

    const activateGridCell = (gx: number, gy: number) => {
      if (pixelMap.size === 0) pixelMap = buildPixelMap();
      const pixel = pixelMap.get(`${gx}-${gy}`);
      if (pixel) {
        const fn = (pixel as unknown as { __animatePixel?: () => void })
          .__animatePixel;
        if (fn) fn();
      }
    };

    // Logo pixel data — loaded async, starts empty
    let logos: [number, number][][] = [];
    Promise.all([
      sampleLogoPixels("/world.svg", logoGridSize, logoGridSize),
      sampleLogoPixels("/coinbase.svg", logoGridSize, logoGridSize),
    ]).then((loaded) => {
      logos = loaded.filter((l) => l.length > 0);
    });

    const createTrailAnimation = (startX: number, startY: number) => {
      let currentX = startX;
      let currentY = startY;
      let velocityX = (Math.random() - 0.5) * 2;
      let velocityY = (Math.random() - 0.5) * 2;
      const speed = 1.5;
      let angle = Math.random() * Math.PI * 2;
      let angleVelocity = (Math.random() - 0.5) * 0.05;
      let circleRadius = 0;
      let circleCenterX = currentX;
      let circleCenterY = currentY;
      let movementMode: "scribble" | "circle" | "logo" =
        Math.random() > 0.3 ? "scribble" : "circle";
      let modeChangeCounter = 0;

      // Logo-drawing state
      let logoPixels: [number, number][] = [];
      let logoIdx = 0;
      let logoOriginGx = 0;
      let logoOriginGy = 0;

      const animateMovement = () => {
        modeChangeCounter++;

        // ── Logo mode: stamp out the shape then resume wandering ──
        if (movementMode === "logo") {
          // Draw 2 pixels per frame for a quick stamp
          for (let i = 0; i < 2 && logoIdx < logoPixels.length; i++) {
            const [dx, dy] = logoPixels[logoIdx];
            activateGridCell(logoOriginGx + dx, logoOriginGy + dy);
            logoIdx++;
          }
          if (logoIdx >= logoPixels.length) {
            // Done drawing — resume wandering from where we left off
            movementMode = Math.random() > 0.3 ? "scribble" : "circle";
            modeChangeCounter = 0;
            velocityX = (Math.random() - 0.5) * 2;
            velocityY = (Math.random() - 0.5) * 2;
          }
          const frameId = requestAnimationFrame(animateMovement);
          animationFrameIds.push(frameId);
          return;
        }

        // ── Maybe switch to logo mode (~0.5% chance per frame after wandering a while) ──
        if (modeChangeCounter > 250 && Math.random() > 0.995 && logos.length > 0) {
          movementMode = "logo";
          modeChangeCounter = 0;
          logoPixels = logos[Math.floor(Math.random() * logos.length)];
          logoIdx = 0;
          // Center the logo on the cursor's current grid position
          const rect = pixelTrailContainer.getBoundingClientRect();
          const gx = Math.floor((currentX - rect.left) / pixelSize);
          const gy = Math.floor((currentY - rect.top) / pixelSize);
          logoOriginGx = gx - Math.floor(logoGridSize / 2);
          logoOriginGy = gy - Math.floor(logoGridSize / 2);
          const frameId = requestAnimationFrame(animateMovement);
          animationFrameIds.push(frameId);
          return;
        }

        // ── Normal mode switching (scribble ↔ circle) ──
        if (modeChangeCounter > 120 && Math.random() > 0.98) {
          movementMode = Math.random() > 0.3 ? "scribble" : "circle";
          modeChangeCounter = 0;
          if (movementMode === "circle") {
            circleCenterX = currentX;
            circleCenterY = currentY;
            circleRadius = 50 + Math.random() * 100;
            angleVelocity = (Math.random() - 0.5) * 0.08;
          } else {
            velocityX = (Math.random() - 0.5) * 2;
            velocityY = (Math.random() - 0.5) * 2;
          }
        }

        if (movementMode === "circle") {
          angle += angleVelocity;
          currentX = circleCenterX + Math.cos(angle) * circleRadius;
          currentY = circleCenterY + Math.sin(angle) * circleRadius;
          if (Math.random() > 0.95) {
            angleVelocity += (Math.random() - 0.5) * 0.02;
            angleVelocity = Math.max(-0.1, Math.min(0.1, angleVelocity));
          }
        } else {
          velocityX += (Math.random() - 0.5) * 0.3;
          velocityY += (Math.random() - 0.5) * 0.3;
          velocityX *= 0.98;
          velocityY *= 0.98;
          const maxVel = 3;
          velocityX = Math.max(-maxVel, Math.min(maxVel, velocityX));
          velocityY = Math.max(-maxVel, Math.min(maxVel, velocityY));
          currentX += velocityX * speed;
          currentY += velocityY * speed;
          if (currentX < 0 || currentX > window.innerWidth) {
            velocityX *= -0.8;
            currentX = Math.max(0, Math.min(window.innerWidth, currentX));
          }
          if (currentY < 0 || currentY > window.innerHeight) {
            velocityY *= -0.8;
            currentY = Math.max(0, Math.min(window.innerHeight, currentY));
          }
        }

        if (pixelMap.size === 0) pixelMap = buildPixelMap();
        const rect = pixelTrailContainer.getBoundingClientRect();
        const x = Math.floor((currentX - rect.left) / pixelSize);
        const y = Math.floor((currentY - rect.top) / pixelSize);
        activateGridCell(x, y);

        const frameId = requestAnimationFrame(animateMovement);
        animationFrameIds.push(frameId);
      };

      const frameId = requestAnimationFrame(animateMovement);
      animationFrameIds.push(frameId);
    };

    // All 8 original trail starting positions
    const positions = [
      [0.5, 0.5],
      [0.25, 0.3],
      [0.75, 0.7],
      [0.15, 0.7],
      [0.85, 0.25],
      [0.5, 0.15],
      [0.1, 0.5],
      [0.9, 0.5],
    ];
    positions.forEach(([px, py]) =>
      createTrailAnimation(window.innerWidth * px, window.innerHeight * py),
    );

    return () => animationFrameIds.forEach((id) => cancelAnimationFrame(id));
  }, [screenSize]);

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 py-24 md:py-32 relative overflow-hidden"
      style={{ backgroundColor: "#111111" }}
    >
      {/* Gooey pixel trail background */}
      <GooeyFilter id="gooey-filter-pixel-trail" strength={8} />
      <div
        ref={trailContainerRef}
        className="absolute inset-0 z-0"
        style={{ filter: "url(#gooey-filter-pixel-trail)" }}
      >
        <PixelTrail
          pixelSize={screenSize.lessThan("md") ? 24 : 32}
          fadeDuration={0}
          delay={800}
          pixelClassName={
            screenSize.lessThan("md") ? "bg-[#222222]" : "bg-[#1c1c1c]"
          }
        />
      </div>

      <div className="max-w-2xl w-full relative z-10 flex flex-col items-center gap-20">
        {/* Hero */}
        <div className="text-center flex flex-col items-center gap-6">
          <h1
            className="font-jersey text-6xl md:text-8xl tracking-tight"
            style={{ color: "#fafafa" }}
          >
            x402 + World ID
          </h1>
          <p
            className="text-lg md:text-xl leading-relaxed max-w-lg"
            style={{ color: "#a0a0a0" }}
          >
            Human-backed agents get free calls via World ID.
            <br />
            Sybil-resistant — one human, one identity.
          </p>

        </div>

        {/* How It Works */}
        <section className="w-full">
          <div
            className="rounded-lg p-6 md:p-8 font-mono text-sm leading-relaxed"
            style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333" }}
          >
            <span style={{ color: "#777777" }}>{"// how it works"}</span>
            <br /><br />
            <span style={{ color: "#b0b0b0" }}>GET /api/random</span>
            <span style={{ color: "#777777" }}>{" → "}</span>
            <span style={{ color: "#c4b5fd" }}>402</span>
            <span style={{ color: "#777777" }}>{" + agentkit challenge"}</span>
            <br /><br />
            <span style={{ color: "#b0b0b0" }}>GET /api/random</span>
            <span style={{ color: "#777777" }}>{" + "}</span>
            <span style={{ color: "#fafafa" }}>agentkit</span>
            <span style={{ color: "#777777" }}>{" header"}</span>
            <br />
            <span style={{ color: "#777777" }}>{"  ├─ "}</span>
            <span style={{ color: "#4ade80" }}>human-backed + free uses left</span>
            <span style={{ color: "#777777" }}>{" → "}</span>
            <span style={{ color: "#4ade80" }}>200 free access</span>
            <br />
            <span style={{ color: "#777777" }}>{"  ├─ "}</span>
            <span style={{ color: "#fbbf24" }}>human-backed + trial exhausted</span>
            <span style={{ color: "#777777" }}>{" → "}</span>
            <span style={{ color: "#c4b5fd" }}>402 pay $0.02</span>
            <br />
            <span style={{ color: "#777777" }}>{"  └─ "}</span>
            <span style={{ color: "#fbbf24" }}>not in AgentBook</span>
            <span style={{ color: "#777777" }}>{" → "}</span>
            <span style={{ color: "#c4b5fd" }}>402 pay $0.02</span>
            <br /><br />
            <span style={{ color: "#b0b0b0" }}>GET /api/random</span>
            <span style={{ color: "#777777" }}>{" + "}</span>
            <span style={{ color: "#fafafa" }}>agentkit</span>
            <span style={{ color: "#777777" }}>{" + "}</span>
            <span style={{ color: "#fafafa" }}>PAYMENT</span>
            <br />
            <span style={{ color: "#777777" }}>{"  └─ "}</span>
            <span style={{ color: "#4ade80" }}>200 paid access</span>
          </div>
        </section>

        {/* Divider */}
        <div
          className="w-full h-px"
          style={{ backgroundColor: "#333333" }}
        />

        {/* Links */}
        <div className="flex flex-col items-center gap-10">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <ShimmerButton
              href="https://github.com/Must-be-Ash/world-x402-agentkit-example"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              }
            >
              GitHub
            </ShimmerButton>
            <ShimmerButton
              href="https://docs.world.org/world-chain/quick-start/fund-wallet"
              icon={
                <img
                  src="/world.svg"
                  alt="World ID"
                  width={16}
                  height={16}
                />
              }
            >
              AgentKit
            </ShimmerButton>
            <ShimmerButton
              href="https://x402.org"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                  <path d="M2 12h20" />
                </svg>
              }
            >
              x402.org
            </ShimmerButton>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-center gap-4 text-xs"
            style={{ color: "#666666" }}
          >
            <a
              href="https://x402.org"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
            >
              Built on x402
            </a>
            <span>&middot;</span>
            <a
              href="https://docs.world.org/world-chain/quick-start/fund-wallet"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
            >
              AgentKit by World
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
