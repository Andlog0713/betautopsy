import { describe, expect, it } from 'vitest';
import {
  CSP_HEADER,
  CSP_NONCE_HEADER,
  createCspNonce,
  createDocumentContentSecurityPolicy,
  createNonDocumentContentSecurityPolicy,
} from '@/lib/content-security-policy';

function getDirective(policy: string, name: string): string {
  return policy
    .split(';')
    .map((directive) => directive.trim())
    .find((directive) => directive.startsWith(`${name} `)) ?? '';
}

describe('content security policy', () => {
  it('enforces nonced scripts without production inline or eval execution', () => {
    const policy = createDocumentContentSecurityPolicy('knownnonce', 'production');
    const scriptDirective = getDirective(policy, 'script-src');

    expect(CSP_HEADER).toBe('Content-Security-Policy');
    expect(CSP_NONCE_HEADER).toBe('x-nonce');
    expect(scriptDirective).toContain("'nonce-knownnonce'");
    expect(scriptDirective).toContain("'strict-dynamic'");
    expect(scriptDirective).not.toContain("'unsafe-inline'");
    expect(scriptDirective).not.toContain("'unsafe-eval'");
    expect(getDirective(policy, 'script-src-attr')).toBe("script-src-attr 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain('upgrade-insecure-requests');
    expect(policy).not.toContain('api.anthropic.com');
  });

  it('allows eval only for the Next.js development runtime', () => {
    const developmentPolicy = createDocumentContentSecurityPolicy(
      'knownnonce',
      'development'
    );
    const testPolicy = createDocumentContentSecurityPolicy('knownnonce', 'test');

    expect(getDirective(developmentPolicy, 'script-src')).toContain("'unsafe-eval'");
    expect(getDirective(testPolicy, 'script-src')).not.toContain("'unsafe-eval'");
    expect(developmentPolicy).not.toContain('upgrade-insecure-requests');
  });

  it('does not upgrade subresources on an HTTP production-mode request', () => {
    const policy = createDocumentContentSecurityPolicy(
      'knownnonce',
      'production',
      false
    );

    expect(policy).not.toContain('upgrade-insecure-requests');
  });

  it('generates a fresh high-entropy nonce', () => {
    const first = createCspNonce();
    const second = createCspNonce();

    expect(first).toMatch(/^[a-f0-9]{32}$/);
    expect(second).toMatch(/^[a-f0-9]{32}$/);
    expect(second).not.toBe(first);
  });

  it('locks non-document responses down without a nonce', () => {
    const policy = createNonDocumentContentSecurityPolicy();

    expect(policy).toBe(
      "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none';"
    );
    expect(policy).not.toContain('nonce-');
  });
});
