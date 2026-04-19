"use client";

import { useState } from "react";
import Image from "next/image";

interface Props {
  images: string[];
  title: string;
}

export default function ImageGallery({ images, title }: Props) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  if (!images || images.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 bg-gray-100 text-gray-400">
        No image available
      </div>
    );
  }

  return (
    <>
      {/* Main image */}
      <div className="relative h-80 cursor-pointer" onClick={() => setLightbox(true)}>
        <Image
          src={images[active]}
          alt={title}
          fill
          sizes="(max-width: 1024px) 100vw, 66vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition flex items-center justify-center">
          <span className="opacity-0 hover:opacity-100 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded-full transition">
            Click to enlarge
          </span>
        </div>
        {images.length > 1 && (
          <span className="absolute bottom-3 right-3 text-xs bg-black bg-opacity-60 text-white px-2 py-1 rounded-full">
            {active + 1} / {images.length}
          </span>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 p-3 overflow-x-auto bg-gray-50">
          {images.map((img, i) => (
            <div key={i}
              onClick={() => setActive(i)}
              className={`relative w-20 h-16 flex-shrink-0 rounded-lg overflow-hidden cursor-pointer border-2 transition ${
                active === i ? "border-blue-500" : "border-transparent hover:border-gray-300"
              }`}>
              <Image src={img} alt="" fill sizes="80px" className="object-cover" />
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 text-white text-3xl w-10 h-10 flex items-center justify-center hover:bg-white hover:bg-opacity-20 rounded-full transition"
          >
            ×
          </button>

          {/* Prev */}
          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setActive((a) => (a - 1 + images.length) % images.length); }}
              className="absolute left-4 text-white text-2xl w-10 h-10 flex items-center justify-center hover:bg-white hover:bg-opacity-20 rounded-full transition"
            >
              ‹
            </button>
          )}

          <div className="relative max-w-4xl max-h-screen w-full h-full"
            onClick={(e) => e.stopPropagation()}>
            <Image
              src={images[active]}
              alt={title}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>

          {/* Next */}
          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setActive((a) => (a + 1) % images.length); }}
              className="absolute right-4 text-white text-2xl w-10 h-10 flex items-center justify-center hover:bg-white hover:bg-opacity-20 rounded-full transition"
            >
              ›
            </button>
          )}

          {/* Dots */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <button key={i}
                onClick={(e) => { e.stopPropagation(); setActive(i); }}
                className={`w-2 h-2 rounded-full transition ${active === i ? "bg-white" : "bg-white bg-opacity-40"}`}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
