import Image from 'next/image';
import Link from 'next/link';
import { Product, getCategoryLabel } from '@/lib/products';

interface ProductCardProps {
  product: Product;
  variant?: 'standard' | 'large' | 'tall';
}

export default function ProductCard({ product, variant = 'standard' }: ProductCardProps) {
  const heightClass = variant === 'tall' ? 'h-[520px]' : variant === 'large' ? 'h-[480px]' : 'h-[420px]';

  return (
    <Link
      href={`/products/${product.id}`}
      className={`group block bg-white overflow-hidden border border-[#D9D4CE] hover:border-[#B8956A] transition-colors duration-300`}
    >
      {/* Image */}
      <div className={`relative ${heightClass} overflow-hidden bg-[#EDEBE8]`}>
        {product.images.length > 0 ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            className="object-cover object-top group-hover:scale-[1.02] transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-[#2C2C2C]/30 text-sm">No Image</div>
        )}
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {product.isNew && (
            <span className="bg-[#B8956A] text-white text-[10px] tracking-[0.1em] uppercase px-2.5 py-1">
              New
            </span>
          )}
          {product.availableColors.length > 1 && (
            <span className="bg-[#2C2C2C]/80 text-white text-[10px] tracking-[0.08em] px-2.5 py-1">
              {product.availableColors.length} Colors
            </span>
          )}
        </div>
        {/* MOQ Badge */}
        <div className="absolute bottom-3 right-3">
          <span className="bg-white/90 text-[#2C2C2C] text-[10px] tracking-[0.08em] uppercase px-2.5 py-1">
            MOQ: {product.moq}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-[#B8956A] text-[10px] tracking-[0.12em] uppercase mb-1">
          {getCategoryLabel(product.category)} · {product.series}
        </p>
        <h3 className="font-serif text-base text-[#2C2C2C] mb-2 line-clamp-1" style={{ letterSpacing: '0.02em' }}>
          {product.name}
        </h3>
        {/* Color swatches */}
        <div className="flex items-center gap-1.5 mb-3">
          {product.availableColors.map((color) => (
            <span
              key={color.name}
              className="w-3 h-3 rounded-full border border-[#D9D4CE]"
              style={{ backgroundColor: color.hex }}
              title={color.name}
            />
          ))}
        </div>
        {/* Pricing */}
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-[#2C2C2C] font-medium text-sm">
              From ${product.wholesalePrice.toFixed(2)}
            </span>
            <span className="text-[#2C2C2C]/40 text-xs ml-1">/unit</span>
          </div>
          <span className="text-[#B8956A] text-xs tracking-[0.08em] uppercase group-hover:translate-x-0.5 transition-transform duration-300">
            Details →
          </span>
        </div>
        {/* Lead time */}
        <p className="text-[#2C2C2C]/40 text-[10px] mt-2">
          Lead time: {product.leadTime}
        </p>
      </div>
    </Link>
  );
}
