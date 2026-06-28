/**
 * RAG context builder for the chatbot.
 *
 * "RAG" here is intentionally lightweight — no embeddings, no vector
 * store. We fetch the full live catalog from Supabase on every chat
 * turn and assemble a tight context block the model can quote from.
 *
 * Why no embeddings for a 14-product catalog?
 *   - The catalog is small enough to fit comfortably inside the model's
 *     context window, even with a generous system prompt.
 *   - Live fetch means price/MOQ/availability changes show up
 *     immediately, with zero staleness window.
 *   - No new infrastructure to maintain (no pgvector, no Apify, no
 *     nightly embedding job).
 *
 * When the catalog grows past ~100 products, swap this for a real
 * embedding search — the interface (`buildRagContext`) stays the same,
 * callers don't change.
 */
import 'server-only';
import { getAllProducts, getAllCategories } from '@/lib/db-queries';

/**
 * Compact representation of a product for the prompt context.
 * Drops fields the model doesn't need (URLs, sort orders) so the
 * prompt stays under budget.
 */
export interface RagProductSnippet {
  id: string;
  name: string;
  category: string;
  series: string | null;
  sku: string;
  startingPrice: number;
  moq: number;
  leadTime: string | null;
  description: string | null;
  colors: string[];
  sizes: string[];
  certifications: string[];
  isNew: boolean;
  isFeatured: boolean;
}

/**
 * Hard cap on context size. DeepSeek-V3 has a 64k context window;
 * keeping the catalog at <8k chars leaves room for system prompt +
 * conversation history + the model's own answer.
 */
const MAX_CONTEXT_CHARS = 8_000;

export interface RagContext {
  /** Plain-text block ready to drop into the system prompt. */
  contextText: string;
  /** Product IDs the assistant is allowed to cite. Used to validate
   *  the model's citations so we don't store hallucinated IDs. */
  availableProductIds: string[];
  /** Snippets in case the caller wants them (e.g. for client-side
   *  product cards). */
  products: RagProductSnippet[];
}

/**
 * Build the catalog context block. Runs in O(N products).
 *
 * Returns an empty context on any fetch failure rather than throwing
 * — a missing catalog shouldn't kill the whole chat. The caller can
 * detect `availableProductIds.length === 0` and decide to tell the
 * user "I'm having trouble reaching our catalog right now".
 */
export async function buildRagContext(): Promise<RagContext> {
  try {
    const [products, categories] = await Promise.all([
      getAllProducts({ limit: 200 }),
      getAllCategories(),
    ]);
    // Map to the compact snippet form so we can serialize cheaply.
    const snippets: RagProductSnippet[] = products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      series: p.series,
      sku: p.sku,
      startingPrice: p.wholesalePrice,
      moq: p.moq,
      leadTime: p.leadTime,
      description: p.description,
      colors: p.availableColors.map((c) => c.name),
      sizes: p.sizes,
      certifications: p.certifications,
      isNew: p.isNew,
      isFeatured: p.isFeatured,
    }));
    // We drop the 'all' pseudo-category — it's only a UI label.
    const realCategories = categories.filter((c) => c.slug !== 'all');
    const contextText = serializeContext(realCategories, snippets);
    return {
      contextText,
      availableProductIds: snippets.map((s) => s.id),
      products: snippets,
    };
  } catch (err) {
    // Log so ops sees it, but never throw to the caller.
    console.error('[chatbot.rag] failed to build context:', err);
    return { contextText: '', availableProductIds: [], products: [] };
  }
}

function serializeContext(
  categories: { slug: string; label: string }[],
  products: RagProductSnippet[],
): string {
  if (products.length === 0) return '';
  const categoryLines = categories
    .map((c) => `- ${c.label} (slug: ${c.slug})`)
    .join('\n');
  // Product blocks — one per product, compact multi-line format.
  // We number them so the model can reference "Product 3" naturally,
  // but also include the SKU and ID so the citation validator can
  // cross-check at the end of the turn.
  const productBlocks = products
    .map((p, idx) => {
      const flags = [
        p.isFeatured ? 'featured' : null,
        p.isNew ? 'new' : null,
      ].filter(Boolean).join(', ');
      return [
        `Product ${idx + 1}: ${p.name}` +
          (flags ? ` [${flags}]` : ''),
        `  Category: ${p.category} | SKU: ${p.sku} | ID: ${p.id}`,
        `  Starting wholesale price: $${p.startingPrice.toFixed(2)} per unit`,
        `  MOQ: ${p.moq} units | Lead time: ${p.leadTime ?? 'contact us'}`,
        p.colors.length ? `  Available colors: ${p.colors.join(', ')}` : null,
        p.sizes.length ? `  Sizes: ${p.sizes.join(', ')}` : null,
        p.certifications.length
          ? `  Certifications: ${p.certifications.join(', ')}`
          : null,
        p.description ? `  Description: ${p.description}` : null,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
  const header = `CATALOG CONTEXT (${products.length} products across ${categories.length} categories):\nCategories:\n${categoryLines}\n`;
  let body = `${header}\nProducts:\n${productBlocks}`;
  if (body.length > MAX_CONTEXT_CHARS) {
    // Truncate gracefully — keep header + as many products as fit.
    // If the catalog ever outgrows this, switch to embedding search.
    body = `${body.slice(0, MAX_CONTEXT_CHARS)}\n\n(... ${products.length} products total, catalog truncated for context window ...)`;
  }
  return body;
}

/**
 * Extract product IDs the assistant cited in its reply.
 *
 * The system prompt tells the model to cite products by their SKU
 * (e.g. `SKU: 28255`) or by their numeric label (`Product 3`). We
 * resolve both forms to canonical product IDs so the admin dashboard
 * can render the cited products as links.
 *
 * SKU matching uses an alternation built from the live catalog's
 * actual SKUs rather than a hardcoded pattern, because the seed
 * admin has added products with non-`CF-XX-NNN` SKUs (e.g. legacy
 * numeric SKUs from import). A hardcoded `CF-[A-Z]{2}-\d{3}` regex
 * silently missed those and the cited-products UI showed nothing
 * for them.
 *
 * Returns de-duplicated IDs in the order they appeared.
 */
export function extractCitedProductIds(
  assistantText: string,
  products: RagProductSnippet[],
): string[] {
  if (!assistantText || products.length === 0) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  const skuToId = new Map<string, string>();
  for (const p of products) {
    if (p.sku) skuToId.set(p.sku, p.id);
  }
  // Build a single alternation regex from the live SKUs.
  // Escape regex metachars in each SKU; sort by length desc so
  // longer SKUs match first when one is a prefix of another.
  const escapedSkus = Array.from(skuToId.keys())
    .map((sku) => sku.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .sort((a, b) => b.length - a.length);
  if (escapedSkus.length > 0) {
    // Word boundary on the left side only — SKUs can end with
    // punctuation like a period or comma.
    const skuRe = new RegExp(`\\b(?:${escapedSkus.join('|')})`, 'g');
    let m: RegExpExecArray | null;
    while ((m = skuRe.exec(assistantText)) !== null) {
      const id = skuToId.get(m[0]);
      if (id && !seen.has(id)) {
        seen.add(id);
        result.push(id);
      }
    }
  }
  // Numeric label match — "Product 3", "product 12", "products 1 and 2".
  // We index from 1 to match the prompt's numbering. This is a
  // fallback for when the model forgets to mention the SKU and only
  // uses the numeric label.
  const numericRe = /\bproducts?\s+(\d{1,3})\b/gi;
  let m: RegExpExecArray | null;
  while ((m = numericRe.exec(assistantText)) !== null) {
    const n = parseInt(m[1], 10);
    const product = products[n - 1];
    if (product && !seen.has(product.id)) {
      seen.add(product.id);
      result.push(product.id);
    }
  }
  return result;
}
