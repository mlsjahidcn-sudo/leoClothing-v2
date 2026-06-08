'use client';

import { useEffect, useState } from 'react';

/**
 * Debounce a fast-changing value. Returns the value after it has been
 * stable for `delay` ms.
 *
 * Used by admin search inputs so we don't fire a Supabase query on
 * every keystroke. The returned value is the one callers should feed
 * into effect deps; the input is bound to `value` (immediate) while
 * the API call uses `debouncedValue` (after the pause).
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
