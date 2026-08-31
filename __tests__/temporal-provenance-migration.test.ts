import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = path.resolve(
  process.cwd(),
  'supabase/migrations/20260831213000_temporal_provenance.sql',
);
const migration = readFileSync(migrationPath, 'utf8');
const schema = readFileSync(path.resolve(process.cwd(), 'supabase/schema.sql'), 'utf8');

describe('temporal provenance migration', () => {
  it('allows partial source timestamps without manufacturing placed_at', () => {
    expect(migration).toMatch(/alter column placed_at drop not null/i);
    expect(migration).toMatch(/timestamp_quality = 'local_datetime'[\s\S]*placed_at is null/i);
    expect(migration).toMatch(/timestamp_quality = 'date_only'[\s\S]*placed_at is null/i);
  });

  it('marks every pre-migration row as legacy unknown without backfilling source facts', () => {
    expect(migration).toMatch(/set timestamp_quality = 'legacy_unknown'/i);
    expect(migration).toMatch(/timestamp_quality = 'legacy_unknown'[\s\S]*placed_at is not null/i);
    expect(migration).not.toMatch(/set\s+source_placed_at\s*=/i);
    expect(migration).not.toMatch(/set\s+placed_(date|time)\s*=/i);
    expect(migration).not.toMatch(/set\s+source_timezone\s*=/i);
  });

  it('adds a date-only compatibility key and additive report boundaries', () => {
    expect(migration).toMatch(/recorded_date date generated always as/i);
    expect(migration).toMatch(/add column if not exists date_range_start_date date/i);
    expect(migration).toMatch(/add column if not exists date_range_end_date date/i);
  });

  it('keeps the fresh-install schema aligned with the migration', () => {
    expect(schema).toMatch(/placed_at timestamptz,\s+source_placed_at text/i);
    expect(schema).toMatch(/timestamp_quality text not null default 'legacy_unknown'/i);
    expect(schema).toMatch(/recorded_date date generated always as/i);
    expect(schema).toMatch(/constraint bets_temporal_provenance_check check/i);
    expect(schema).toMatch(/date_range_start_date date/i);
    expect(schema).toMatch(/date_range_end_date date/i);
  });
});
