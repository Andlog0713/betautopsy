// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ShareModal from '@/components/ShareModal';
import type { ShareCardData } from '@/components/ShareCard';

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  apiGet: mocks.apiGet,
  apiPost: mocks.apiPost,
  apiDelete: mocks.apiDelete,
}));

vi.mock('sonner', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: vi.fn(),
  },
}));

vi.mock('html-to-image', () => ({ toPng: vi.fn() }));
vi.mock('@/hooks/useFocusTrap', () => ({ useFocusTrap: vi.fn() }));
vi.mock('@/lib/archetypes', () => ({ getArchetypeByName: vi.fn(() => null) }));
vi.mock('@/lib/share-helpers', () => ({
  generateRoastStats: vi.fn(() => ({})),
  deriveBehavioralInsight: vi.fn(() => ''),
  getArchetypeRoast: vi.fn(() => ''),
}));
vi.mock('@/components/ShareCard', async () => {
  const { forwardRef } = await import('react');
  return { default: forwardRef(() => null) };
});
vi.mock('@/components/ArchetypeShareCard', async () => {
  const { forwardRef } = await import('react');
  return { default: forwardRef(() => null) };
});
vi.mock('@/components/ShareCardStories', async () => {
  const { forwardRef } = await import('react');
  const MockStory = forwardRef(() => null);
  return {
    StorySlidePersonality: MockStory,
    StorySlideBehavioral: MockStory,
    StorySlideReceipt: MockStory,
    StorySlideCTA: MockStory,
    SLIDE_LABELS: ['Personality', 'Behavior', 'Receipt', 'CTA'],
  };
});

const shareData = {
  grade: 'B',
  emotion_score: 42,
  bets: [],
  archetype: null,
} as unknown as ShareCardData;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  mocks.apiGet.mockReset();
  mocks.apiPost.mockReset();
  mocks.apiDelete.mockReset();
  mocks.toastSuccess.mockReset();
});

afterEach(() => cleanup());

describe('ShareModal existing-link privacy control', () => {
  it('shows and revokes an active link from a past session without minting on mount', async () => {
    mocks.apiGet.mockResolvedValue(jsonResponse({ share_id: 'token-1' }));
    mocks.apiDelete.mockResolvedValue(jsonResponse({ revoked: true }));

    render(<ShareModal data={shareData} reportId="report-123" onClose={vi.fn()} />);

    const deleteButton = await screen.findByRole('button', { name: 'Delete shared link' });
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/share?report_id=report-123');
    expect(mocks.apiPost).not.toHaveBeenCalled();

    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mocks.apiDelete).toHaveBeenCalledWith('/api/share', { report_id: 'report-123' });
      expect(screen.queryByRole('button', { name: 'Delete shared link' })).toBeNull();
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Share link deleted');
  });

  it('does not show delete or mint when no active link exists', async () => {
    mocks.apiGet.mockResolvedValue(jsonResponse({ share_id: null }));

    render(<ShareModal data={shareData} reportId="report-123" onClose={vi.fn()} />);

    await waitFor(() => expect(mocks.apiGet).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('button', { name: 'Delete shared link' })).toBeNull();
    expect(mocks.apiPost).not.toHaveBeenCalled();
  });
});
