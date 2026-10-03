/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Saved video analyses are read from disk at runtime; make sure Vercel ships them with the function.
  outputFileTracingIncludes: {
    "/api/analyze": ["./data/video-cache/**/*.json"],
  },
};
export default nextConfig;
