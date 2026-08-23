// @vitest-environment jsdom

import React from 'react';
import { act, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot, type Root } from 'react-dom/client';
import useSWR from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuthProvider, { useAuthState } from '@/components/AuthProvider';
import SWRProvider from '@/components/SWRProvider';

const supabaseMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('@/lib/supabase-browser', () => ({
  createBrowserSupabaseClient: () => ({
    auth: {
      getUser: supabaseMocks.getUser,
      signOut: supabaseMocks.signOut,
    },
  }),
}));

function AuthProbe() {
  const state = useAuthState();
  return <span data-testid="auth-state">{state.status}</span>;
}

function SWRProbe() {
  const { data } = useSWR<string>('hydration-key', null, {
    revalidateOnMount: false,
    revalidateIfStale: false,
  });
  return <span data-testid="swr-state">{data ?? 'loading'}</span>;
}

function mountServerHtml(html: string): HTMLDivElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
}

async function unmount(root: Root, container: HTMLElement) {
  await act(async () => root.unmount());
  container.remove();
}

beforeEach(() => {
  window.localStorage.clear();
  supabaseMocks.getUser.mockReset();
  supabaseMocks.signOut.mockReset();
});

describe('frontend cache hydration boundaries', () => {
  it('hydrates AuthProvider with identical first-render markup, then applies cache', async () => {
    const element = (
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );
    const container = mountServerHtml(renderToString(element));
    expect(container.textContent).toBe('loading');

    window.localStorage.setItem('ba-auth-cache-v1', JSON.stringify({
      userId: 'user-1',
      email: 'bettor@example.com',
      profile: null,
      snapshotId: 'snapshot-1',
      hasActiveSnapshot: true,
      cachedAt: Date.now(),
    }));

    const recoverableErrors: unknown[] = [];
    let root!: Root;
    await act(async () => {
      root = hydrateRoot(container, element, {
        onRecoverableError: (error) => recoverableErrors.push(error),
      });
    });

    await waitFor(() => expect(container.textContent).toBe('has-snapshot'));
    expect(recoverableErrors).toEqual([]);
    expect(supabaseMocks.getUser).not.toHaveBeenCalled();
    await unmount(root, container);
  });

  it('hydrates SWR with an empty first-render cache, then mounts persisted data', async () => {
    const element = (
      <SWRProvider>
        <SWRProbe />
      </SWRProvider>
    );
    const container = mountServerHtml(renderToString(element));
    expect(container.textContent).toBe('loading');

    window.localStorage.setItem('ba-swr-cache', JSON.stringify([
      ['hydration-key', { data: 'cached-value' }],
    ]));

    const recoverableErrors: unknown[] = [];
    let root!: Root;
    await act(async () => {
      root = hydrateRoot(container, element, {
        onRecoverableError: (error) => recoverableErrors.push(error),
      });
    });

    await waitFor(() => expect(container.textContent).toBe('cached-value'));
    expect(recoverableErrors).toEqual([]);
    await unmount(root, container);
  });
});
