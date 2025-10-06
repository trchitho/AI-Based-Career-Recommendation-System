/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["localhost", "lh3.googleusercontent.com"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        port: "",
      },
    ],
  },
};

module.exports = nextConfig;
