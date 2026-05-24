import type { ToonCompressionOptions, ToonCompressionResult } from '../types/api.types';

export class ToonParserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ToonParserError';
  }
}

type FlatRecord = Record<string, string>;

const DEFAULT_DELIMITER = '|';
const DEFAULT_MAX_DEPTH = 5;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function isPrimitiveValue(value: unknown): boolean {
  return value === null || ['string', 'number', 'boolean', 'undefined', 'bigint'].includes(typeof value);
}

function escapeCell(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/,/g, '\\,')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
}

function scalarToCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return escapeCell(value);
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();

  return escapeCell(JSON.stringify(value));
}

interface FlattenState {
  out: FlatRecord;
  seen: WeakSet<object>;
  maxDepth: number;
  maxDepthUsed: number;
}

function flattenValue(value: unknown, path: string, depth: number, state: FlattenState): void {
  state.maxDepthUsed = Math.max(state.maxDepthUsed, depth);

  if (depth > state.maxDepth) {
    throw new ToonParserError(`Payload nesting exceeds maxDepth=${state.maxDepth}. Path: ${path || '<root>'}`);
  }

  if (isPrimitiveValue(value) || value instanceof Date) {
    if (!path) {
      throw new ToonParserError('Each documentContext item must be an object, not a primitive value.');
    }
    state.out[path] = scalarToCell(value);
    return;
  }

  if (Array.isArray(value)) {
    if (!path) {
      throw new ToonParserError('Each documentContext item must be an object, not an array.');
    }

    if (value.length === 0) {
      state.out[path] = '';
      return;
    }

    const allPrimitive = value.every((item) => isPrimitiveValue(item) || item instanceof Date);
    if (allPrimitive) {
      state.out[path] = value.map((item) => scalarToCell(item)).join(',');
      return;
    }

    value.forEach((item, index) => {
      flattenValue(item, `${path}[${index}]`, depth + 1, state);
    });
    return;
  }

  if (!isPlainObject(value)) {
    if (!path) {
      throw new ToonParserError('Each documentContext item must be a plain object.');
    }
    state.out[path] = scalarToCell(value);
    return;
  }

  if (state.seen.has(value)) {
    throw new ToonParserError(`Circular reference detected at path: ${path || '<root>'}`);
  }

  state.seen.add(value);
  const entries = Object.entries(value);

  if (entries.length === 0) {
    if (path) state.out[path] = '';
    state.seen.delete(value);
    return;
  }

  for (const [key, child] of entries) {
    const nextPath = path ? `${path}.${key}` : key;
    flattenValue(child, nextPath, depth + 1, state);
  }

  state.seen.delete(value);
}

function flattenRecord(value: Record<string, unknown>, maxDepth: number): { flat: FlatRecord; maxDepthUsed: number } {
  const state: FlattenState = {
    out: {},
    seen: new WeakSet<object>(),
    maxDepth,
    maxDepthUsed: 0,
  };

  flattenValue(value, '', 0, state);
  return { flat: state.out, maxDepthUsed: state.maxDepthUsed };
}

/**
 * Converts an array of flat or nested objects into a pipe-delimited TOON table.
 *
 * Design choices:
 * - Schema keys are collected from all rows, not only the first row, to prevent missing columns.
 * - Nested object paths use dot notation, e.g. user.profile.role.
 * - Arrays of primitives are stored as comma-separated cell values.
 * - Arrays containing objects are expanded with index notation, e.g. addresses[0].city.
 * - null, undefined, missing values, and empty objects become empty cell segments.
 */
export function convertJsonToToon(
  data: Record<string, unknown>[],
  options: ToonCompressionOptions = {},
): ToonCompressionResult {
  const delimiter = options.delimiter ?? DEFAULT_DELIMITER;
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;

  if (delimiter !== DEFAULT_DELIMITER) {
    throw new ToonParserError('Only pipe delimiter "|" is currently supported for safe LLM decoding.');
  }

  if (!Array.isArray(data)) {
    throw new ToonParserError('documentContext must be an array of objects.');
  }

  if (data.length === 0) {
    return {
      schemaHeader: 'Format: []',
      toonString: '',
      keys: [],
      rows: [],
      rowCount: 0,
      columnCount: 0,
      maxDepthUsed: 0,
    };
  }

  const flattenedRows: FlatRecord[] = [];
  const keys: string[] = [];
  const keySet = new Set<string>();
  let maxDepthUsed = 0;

  data.forEach((item, index) => {
    if (!isPlainObject(item)) {
      throw new ToonParserError(`documentContext[${index}] must be a plain object.`);
    }

    const { flat, maxDepthUsed: rowDepth } = flattenRecord(item, maxDepth);
    maxDepthUsed = Math.max(maxDepthUsed, rowDepth);
    flattenedRows.push(flat);

    Object.keys(flat).forEach((key) => {
      if (!keySet.has(key)) {
        keySet.add(key);
        keys.push(key);
      }
    });
  });

  const rows = flattenedRows.map((row) => keys.map((key) => row[key] ?? '').join(delimiter));
  const schemaHeader = `Format: [${keys.join(` ${delimiter} `)}]`;

  return {
    schemaHeader,
    toonString: rows.join('\n'),
    keys,
    rows,
    rowCount: rows.length,
    columnCount: keys.length,
    maxDepthUsed,
  };
}
