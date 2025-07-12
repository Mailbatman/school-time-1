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
  }
};

const pwaConfig = {
  dest: "public",
  disable: process.env.NODE_ENV === "development",
};

export default withPWA(pwaConfig)(nextConfig);
