"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";

export default function ProductGallery({
  productName,
  images,
  children,
}: {
  productName: string;
  images: string[];
  children?: ReactNode;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const activeIndex = Math.min(selectedIndex, images.length - 1);
  const activeImage = images[activeIndex];

  return (
    <div className="space-y-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-mj-cream ring-1 ring-mj-beige">
        <Image
          src={activeImage}
          alt={`${productName} photo ${activeIndex + 1}`}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
        {children}
      </div>
      {images.length > 1 && (
        <div
          className="grid grid-cols-4 gap-3"
          role="group"
          aria-label="Product photos"
        >
          {images.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setSelectedIndex(index)}
              aria-label={`Show ${productName} photo ${index + 1}`}
              aria-pressed={activeIndex === index}
              className={`relative aspect-square overflow-hidden rounded-xl bg-mj-cream ring-2 ${
                activeIndex === index
                  ? "ring-mj-green"
                  : "ring-mj-beige hover:ring-mj-green/50"
              }`}
            >
              <Image
                src={image}
                alt=""
                fill
                sizes="(max-width: 768px) 25vw, 12vw"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
