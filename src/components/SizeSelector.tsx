'use client';

import { useState, useCallback } from 'react';
import type { SizeMeasurement } from '@/lib/products';

interface SizeSelectorProps {
  sizes: string[];
  sizeChart: SizeMeasurement[];
}

export default function SizeSelector({ sizes, sizeChart }: SizeSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hoveredSize, hoveredSetSize] = useState<string | null>(null);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  return (
    <>
      <div className="bg-white border border-[#D9D4CE] p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-base text-[#2C2C2C]" style={{ letterSpacing: '0.04em' }}>
            Available Sizes
          </h3>
          <button
            onClick={openModal}
            className="text-[10px] tracking-[0.1em] uppercase text-[#B8956A] hover:text-[#2C2C2C] transition-colors underline underline-offset-2"
          >
            Size Guide
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {sizes.map((size) => (
            <button
              key={size}
              className="relative px-4 py-2 text-xs text-[#2C2C2C] border border-[#D9D4CE] hover:border-[#B8956A] transition-colors"
              onMouseEnter={() => hoveredSetSize(size)}
              onMouseLeave={() => hoveredSetSize(null)}
              onClick={openModal}
            >
              {size}
              {/* Hover tooltip with measurements */}
              {hoveredSize === size && (() => {
                const chartRow = sizeChart.find((row) => row.size === size);
                if (!chartRow) return null;
                return (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#2C2C2C] text-white text-[10px] px-3 py-2 whitespace-nowrap z-10 shadow-sm">
                    <div className="font-medium mb-1">{size}</div>
                    <div className="space-y-0.5 text-[#2C2C2C]/70">
                      <div>Chest: {chartRow.chest}cm</div>
                      <div>Waist: {chartRow.waist}cm</div>
                      <div>Length: {chartRow.length}cm</div>
                      <div>Sleeve: {chartRow.sleeve}cm</div>
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#2C2C2C]" />
                  </div>
                );
              })()}
            </button>
          ))}
        </div>
      </div>

      {/* Size Chart Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#2C2C2C]/40 backdrop-blur-[2px]"
          onClick={closeModal}
        >
          <div
            className="bg-white max-w-lg w-[90vw] max-h-[80vh] overflow-auto shadow-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#D9D4CE]">
              <h3 className="font-serif text-lg text-[#2C2C2C]" style={{ letterSpacing: '0.04em' }}>
                Size Guide
              </h3>
              <button
                onClick={closeModal}
                className="text-[#2C2C2C]/40 hover:text-[#2C2C2C] transition-colors text-xl leading-none"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#D9D4CE]">
                    <th className="text-left text-[10px] tracking-[0.1em] uppercase text-[#2C2C2C]/40 px-3 py-2.5">Size</th>
                    <th className="text-left text-[10px] tracking-[0.1em] uppercase text-[#2C2C2C]/40 px-3 py-2.5">Chest</th>
                    <th className="text-left text-[10px] tracking-[0.1em] uppercase text-[#2C2C2C]/40 px-3 py-2.5">Waist</th>
                    <th className="text-left text-[10px] tracking-[0.1em] uppercase text-[#2C2C2C]/40 px-3 py-2.5">Length</th>
                    <th className="text-left text-[10px] tracking-[0.1em] uppercase text-[#2C2C2C]/40 px-3 py-2.5">Sleeve</th>
                  </tr>
                </thead>
                <tbody>
                  {sizeChart.map((row) => (
                    <tr key={row.size} className="border-b border-[#D9D4CE] last:border-0">
                      <td className="text-sm text-[#2C2C2C] px-3 py-2.5 font-medium">{row.size}</td>
                      <td className="text-sm text-[#2C2C2C]/60 px-3 py-2.5">{row.chest} cm</td>
                      <td className="text-sm text-[#2C2C2C]/60 px-3 py-2.5">{row.waist} cm</td>
                      <td className="text-sm text-[#2C2C2C]/60 px-3 py-2.5">{row.length} cm</td>
                      <td className="text-sm text-[#2C2C2C]/60 px-3 py-2.5">{row.sleeve} cm</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[#2C2C2C]/30 text-xs mt-4">Custom sizing available for orders of 200+ units. Contact us for details.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
