'use client';

import React, { memo } from 'react';

function SpreadLoaderImpl({ size = 40 }: { size?: number }) {
  const scale = size / 100;
  return (
    <div
      className="loader"
      role="status"
      aria-label="Generating response"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        ['--size' as string]: scale,
      }}
    >
      <div className="box" />
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
        <defs>
          <clipPath id="clipping" clipPathUnits="objectBoundingBox">
            <polygon points="0.5,0 0.55,0.1 0.6,0.1 0.65,0.15 0.7,0.2 0.75,0.3 0.8,0.4 0.85,0.5 0.85,0.6 0.8,0.7 0.75,0.8 0.7,0.85 0.6,0.9 0.5,1 0.4,0.9 0.3,0.85 0.25,0.8 0.2,0.7 0.15,0.6 0.15,0.5 0.2,0.4 0.25,0.3 0.3,0.2 0.4,0.15 0.45,0.1" />
            <polygon points="0.5,0 0.6,0.05 0.7,0.15 0.75,0.25 0.8,0.35 0.85,0.5 0.8,0.65 0.7,0.75 0.6,0.85 0.5,0.9 0.4,0.85 0.3,0.75 0.25,0.65 0.2,0.5 0.25,0.35 0.3,0.25 0.4,0.15" />
            <polygon points="0.5,0.1 0.6,0.15 0.7,0.25 0.75,0.4 0.7,0.55 0.6,0.7 0.5,0.8 0.4,0.7 0.3,0.55 0.25,0.4 0.3,0.25 0.4,0.15" />
            <polygon points="0.5,0.2 0.6,0.3 0.65,0.45 0.6,0.6 0.5,0.7 0.4,0.6 0.35,0.45 0.4,0.3" />
            <polygon points="0.45,0.3 0.55,0.4 0.55,0.55 0.45,0.65 0.35,0.55 0.35,0.4" />
            <polygon points="0.5,0.05 0.65,0.2 0.7,0.4 0.65,0.6 0.5,0.75 0.35,0.6 0.3,0.4 0.35,0.2" />
            <polygon points="0.4,0.1 0.55,0.15 0.65,0.3 0.65,0.5 0.55,0.65 0.4,0.75 0.25,0.65 0.2,0.5 0.2,0.3 0.3,0.15" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

export const SpreadLoader = memo(SpreadLoaderImpl);