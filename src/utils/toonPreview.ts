import type { ToonCompressionResult, ToonPreview } from '../types/api.types';

export function buildToonPreview(compression: ToonCompressionResult, rowLimit = 10): ToonPreview {
  return {
    schemaHeader: compression.schemaHeader,
    preview: compression.rows.slice(0, rowLimit).join('\n'),
    rowCount: compression.rowCount,
    columnCount: compression.columnCount,
    keys: compression.keys,
  };
}
