/** @type {import('next').NextConfig} */
const publicApiUrl = process.env.NEXT_PUBLIC_API_URL || '';
const internalApiUrl = process.env.INTERNAL_API_URL || 'http://127.0.0.1:4000';
const wsUrl = publicApiUrl ? publicApiUrl.replace(/^http/, 'ws') : '';
const isDev = process.env.NODE_ENV !== 'production';
const connectSources = ["'self'"];
if (publicApiUrl) connectSources.push(publicApiUrl);
if (wsUrl) connectSources.push(wsUrl);

const scriptSources = ["'self'", "'unsafe-inline'"];
if (isDev) scriptSources.push("'unsafe-eval'");

const frameAncestors = isDev ? '*' : "'none'";

const securityHeaders = [
  { key: 'Content-Security-Policy', value: `default-src 'self'; script-src ${scriptSources.join(' ')}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; connect-src ${connectSources.join(' ')} ws: wss:; frame-ancestors ${frameAncestors};` },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '0' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

if (!isDev) {
  securityHeaders.splice(2, 0, { key: 'X-Frame-Options', value: 'DENY' });
}

const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${internalApiUrl}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  poweredByHeader: false,
};
export default nextConfig;
