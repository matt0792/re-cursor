import "./OpeningAnimation.css";
import React, { useRef, useEffect, useState } from "react";

const generateSpiralPath = (
  startRadius = 35,
  endRadius = 0,
  rotations = 9,
  points = 400
) => {
  const path = [];
  for (let i = 0; i <= points; i++) {
    const progress = i / points;
    const angle = progress * Math.PI * 2 * rotations;
    const radius = startRadius - (startRadius - endRadius) * progress;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    path.push(`${x},${y}`);
  }
  return `M ${path.join(" L ")}`;
};

const spiralPath = generateSpiralPath();

const OpeningAnimation = ({ setAnimationOver }) => {
  const spiralRef = useRef(null);
  const lineRef = useRef(null);
  const [phase, setPhase] = useState("spiral");

  useEffect(() => {
    if (phase !== "spiral" || !spiralRef.current) return;

    const spiral = spiralRef.current;
    const length = spiral.getTotalLength();

    // Set initial state
    spiral.style.strokeDasharray = `${length}`;
    spiral.style.strokeDashoffset = `${length}`;

    // Create animation
    const animation = spiral.animate(
      [{ strokeDashoffset: length }, { strokeDashoffset: 0 }],
      {
        duration: 2000,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        fill: "forwards",
      }
    );

    animation.onfinish = () => setPhase("line");
  }, [phase]);

  useEffect(() => {
    if (phase !== "line" || !lineRef.current) return;

    const line = lineRef.current;
    line.style.visibility = "visible";

    setTimeout(() => {
      setAnimationOver(true);
    }, 900);

    line.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], {
      duration: 900,
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      fill: "forwards",
    });
  }, [phase]);

  return (
    <div className="anim-container">
      <div className="anim-blur"></div>
      <svg viewBox="-50 -50 100 100" style={{ width: "100%", height: "100%" }}>
        {/* Spiral path */}
        <path
          ref={spiralRef}
          fill="none"
          stroke="rgb(255, 102, 0)"
          strokeWidth="2"
          d={spiralPath}
          style={{ visibility: phase === "spiral" ? "visible" : "visible" }}
          className="anim-spiral"
        />

        {/* Vertical line */}
        <line
          ref={lineRef}
          x1="-1"
          y1="2"
          x2="-1"
          y2="-45"
          stroke="rgb(255, 102, 0)"
          strokeWidth="2"
          style={{
            visibility: phase === "line" ? "visible" : "hidden",
            transform: "scaleY(0)",
            transformOrigin: "0 0",
          }}
        />
      </svg>
    </div>
  );
};

export default OpeningAnimation;
