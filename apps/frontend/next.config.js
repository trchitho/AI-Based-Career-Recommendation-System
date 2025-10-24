// Config Next.js with API proxy rewrites for dev
const API_BASE = process.env.PROXY_API_BASE || process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

module.exports = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_BASE}/:path*`,
      },
    ];
  },
};

