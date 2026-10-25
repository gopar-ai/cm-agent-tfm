import type { NextConfig } from 'next';

/**
 * Configuración de Next.
 *
 * Estaba vacía, así que la app respondía sin ninguna cabecera de seguridad
 * (OWASP A05). Aquí se fijan las que aplican a una app con sesión por cookie, y
 * se activa la salida `standalone`, que es la que empaqueta el Dockerfile.
 */

const isProduction = process.env.NODE_ENV === 'production';

/**
 * CSP. `script-src` admite inline porque Next inyecta el estado de hidratación
 * en un script en línea; el riesgo residual y la alternativa con nonce quedan
 * anotados en docs/04-seguridad.md.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'" + (isProduction ? '' : " 'unsafe-eval'"),
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  // Las portadas de las noticias vienen del medio que publicó la nota.
  "img-src 'self' data: https:",
  "connect-src 'self'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ...(isProduction
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }]
    : []),
];

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
export { contentSecurityPolicy, securityHeaders };
