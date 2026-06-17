/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Keep heavy native binaries out of the serverless lambda bundle
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gywtejthpqoshmiwylyr.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Google OAuth avatars
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  // Security Headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://gywtejthpqoshmiwylyr.supabase.co https://lh3.googleusercontent.com",
              "connect-src 'self' https://gywtejthpqoshmiwylyr.supabase.co https://integrate.api.nvidia.com wss://gywtejthpqoshmiwylyr.supabase.co",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
