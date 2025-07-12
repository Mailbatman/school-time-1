import withPWA from "next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ["assets.co.dev", "images.unsplash.com"],
  },
  webpack: (config, context) => {
    config.optimization.minimize = process.env.NEXT_PUBLIC_CO_DEV_ENV !== "preview";
    return config;
  },
  async headers() {
    const cspHeader = `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' https://assets.co.dev;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https://images.unsplash.com https://assets.co.dev;
      font-src 'self';
      connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.supabase.in wss://*.supabase.in;
      frame-src 'self';
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'self' https://*.co.dev;
    `.replace(/\s{2,}/g, ' ').trim();

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
        ],
      },
    ];
  },
};

const pwaConfig = {
  dest: "public",
  disable: process.env.NODE_ENV === "development",
};

export default withPWA(pwaConfig)(nextConfig);
