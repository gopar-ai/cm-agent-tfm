'use client';

import { useEffect, useState } from 'react';

type Props = {
  labels: string[];
};

const ROTATE_MS = 2500;
const FADE_MS = 300;

export default function LoadingBubble({ labels }: Props) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [labelsAnteriores, setLabelsAnteriores] = useState(labels);

  // Al cambiar los avisos, la rotación vuelve a empezar. Se ajusta durante el
  // render, que es la forma que recomienda React para derivar estado de una
  // prop, en vez de hacerlo en un efecto y provocar un render extra.
  if (labelsAnteriores !== labels) {
    setLabelsAnteriores(labels);
    setIndex(0);
    setVisible(true);
  }

  useEffect(() => {
    if (labels.length <= 1) return;

    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % labels.length);
        setVisible(true);
      }, FADE_MS);
    }, ROTATE_MS);

    return () => clearInterval(interval);
  }, [labels]);

  return (
    <div className="flex justify-start mb-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl rounded-tl-sm px-4 py-3 max-w-[85%] text-sm flex items-center gap-1.5">
        <span
          className={`text-white transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        >
          {labels[index]}
        </span>
        <span className="flex items-center gap-0.5">
          <span className="loading-dot text-[#6366F1] text-base leading-none" style={{ animationDelay: '0ms' }}>
            •
          </span>
          <span className="loading-dot text-[#6366F1] text-base leading-none" style={{ animationDelay: '200ms' }}>
            •
          </span>
          <span className="loading-dot text-[#6366F1] text-base leading-none" style={{ animationDelay: '400ms' }}>
            •
          </span>
        </span>
      </div>
    </div>
  );
}
