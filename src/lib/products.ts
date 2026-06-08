export interface ProductMaterial {
  fabric: string;
  lining: string;
  craft: string;
}

export interface SizeMeasurement {
  size: string;
  chest: number;
  waist: number;
  hip: number;
  length: number;
  sleeve: number;
}

export interface BulkPricingTier {
  minQty: number;
  maxQty: number | null; // null = no upper limit
  unitPrice: number;
}

export interface ColorOption {
  name: string;
  hex: string;
}

export interface Category {
  slug: string;
  label: string;
  image: string;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  series: string;
  images: string[];
  wholesalePrice: number; // starting wholesale price per unit (USD)
  bulkPricing: BulkPricingTier[];
  moq: number; // minimum order quantity
  leadTime: string; // e.g. "15-20 business days"
  packaging: string; // e.g. "Individual polybag, 50pcs/carton"
  availableColors: ColorOption[];
  sku: string;
  material: ProductMaterial;
  sizes: string[];
  sizeChart: SizeMeasurement[];
  designDetails: string[];
  description: string;
  careInstructions: string;
  certifications: string[];
  isNew: boolean;
  isFeatured: boolean;
}

export type ProductCategory = 'polos' | 't-shirts' | 'striped-tees' | 'knitwear';

export const categories: Category[] = [
  { slug: 'all', label: 'All Products', image: '' },
  { slug: 'polos', label: 'Knit Polos', image: '/products/polo-navy.webp' },
  { slug: 't-shirts', label: 'T-Shirts', image: '/products/tee-brown.webp' },
  { slug: 'striped-tees', label: 'Striped Tees', image: '/products/tee-stripe-grey.webp' },
  { slug: 'knitwear', label: 'Knitwear', image: '/products/sweater-white.webp' },
];

export type CategorySlug = 'all' | 'polos' | 't-shirts' | 'striped-tees' | 'knitwear';

export function getCategoryLabel(slug: string): string {
  const cat = categories.find((c) => c.slug === slug);
  return cat?.label || slug;
}
