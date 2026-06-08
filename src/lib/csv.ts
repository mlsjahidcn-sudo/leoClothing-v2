/**
 * CSV serialization + download helper for admin exports.
 *
 * Browsers can't write files directly; we build the CSV string in
 * memory, wrap it in a Blob, and trigger a download via a temporary
 * <a download> element.
 *
 * Why hand-rolled (vs papaparse / csv-stringify): we don't need streaming,
 * multi-format, or schema inference. This is ~30 lines, zero deps.
 *
 * Caveats:
 * - We escape any cell that contains a quote, comma, or newline by
 *   wrapping it in double-quotes and doubling internal quotes — that's
 *   the RFC 4180 contract every spreadsheet honours.
 * - We append a UTF-8 BOM at the start so Excel on Windows opens
 *   CJK characters correctly without an import wizard. The BOM
 *   itself is 3 bytes (\uFEFF) and won't show up in editors.
 */

type Cell = string | number | boolean | null | undefined | Date;

export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: Array<{ key: keyof T & string; header: string }>,
): string {
  const escape = (val: Cell): string => {
    if (val === null || val === undefined) return '';
    const s = val instanceof Date ? val.toISOString() : String(val);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map((c) => escape(c.header)).join(',');
  const body = rows
    .map((row) => columns.map((c) => escape(row[c.key] as Cell)).join(','))
    .join('\n');
  return `${header}\n${body}`;
}

export function downloadCsv(filename: string, csv: string): void {
  // \uFEFF is the UTF-8 BOM; Excel needs it to auto-detect encoding
  // and render CJK + emoji correctly without an import wizard.
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
