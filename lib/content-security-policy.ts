export const CSP_HEADER = 'Content-Security-Policy';
export const CSP_NONCE_HEADER = 'x-nonce';

type RuntimeEnvironment = 'development' | 'production' | 'test';

function serializeDirective(name: string, values: string[]): string {
  return `${name} ${values.join(' ')}`;
}

export function createCspNonce(): string {
  return crypto.randomUUID().replaceAll('-', '');
}

export function createDocumentContentSecurityPolicy(
  nonce: string,
  environment: RuntimeEnvironment = process.env.NODE_ENV ?? 'development',
  upgradeInsecureRequests = environment === 'production'
): string {
  const scriptSources = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(environment === 'development' ? ["'unsafe-eval'"] : []),
    // These hosts are fallbacks for browsers without strict-dynamic support.
    'https://www.googletagmanager.com',
    'https://connect.facebook.net',
  ];

  const directives = [
    serializeDirective('default-src', ["'self'"]),
    serializeDirective('script-src', scriptSources),
    serializeDirective('script-src-attr', ["'none'"]),
    // The app currently relies on React style attributes, Sonner's generated
    // stylesheet, and two small component style blocks. This permission does
    // not allow inline JavaScript and can be narrowed in a separate stage.
    serializeDirective('style-src', ["'self'", "'unsafe-inline'"]),
    serializeDirective('img-src', ["'self'", 'data:', 'blob:', 'https:']),
    serializeDirective('font-src', ["'self'", 'data:']),
    serializeDirective('connect-src', [
      "'self'",
      'https://*.supabase.co',
      'wss://*.supabase.co',
      'https://*.google-analytics.com',
      'https://www.facebook.com',
      'https://*.sentry.io',
    ]),
    serializeDirective('frame-src', [
      "'self'",
      'https://js.stripe.com',
      'https://hooks.stripe.com',
      'https://challenges.cloudflare.com',
    ]),
    serializeDirective('worker-src', ["'self'", 'blob:']),
    serializeDirective('manifest-src', ["'self'"]),
    serializeDirective('media-src', ["'self'", 'blob:']),
    serializeDirective('object-src', ["'none'"]),
    serializeDirective('base-uri', ["'self'"]),
    serializeDirective('form-action', ["'self'"]),
    serializeDirective('frame-ancestors', ["'none'"]),
    ...(upgradeInsecureRequests ? ['upgrade-insecure-requests'] : []),
  ];

  return `${directives.join('; ')};`;
}

export function createNonDocumentContentSecurityPolicy(): string {
  return "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none';";
}
