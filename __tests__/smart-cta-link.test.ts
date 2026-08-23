import { describe, expect, it } from 'vitest';
import { buildSmartCTAHref } from '@/components/SmartCTALink';
import type { AuthState } from '@/components/AuthProvider';

describe('SmartCTALink acquisition continuation', () => {
  it.each(['snapshot', 'report'] as const)(
    'sends an anonymous %s CTA through signup and then upload',
    (intent) => {
      expect(buildSmartCTAHref(intent, { status: 'anon' })).toBe(
        '/signup?next=%2Fupload',
      );
    },
  );

  it.each(['snapshot', 'report'] as const)(
    'sends a signed-in user without a snapshot to upload for %s intent',
    (intent) => {
      const state = {
        status: 'no-snapshot',
        user: { id: 'user-1' },
        profile: null,
      } as AuthState;
      expect(buildSmartCTAHref(intent, state)).toBe('/upload');
    },
  );

  it('keeps existing snapshot users on the intended next step', () => {
    const state = {
      status: 'has-snapshot',
      user: { id: 'user-1' },
      profile: null,
      snapshotId: 'snapshot-1',
    } as AuthState;
    expect(buildSmartCTAHref('snapshot', state)).toBe('/reports?id=snapshot-1');
    expect(buildSmartCTAHref('report', state)).toBe('/pricing');
  });
});
