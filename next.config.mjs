/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.jsdelivr.net",
      },
    ],
    localPatterns: [
      {
        pathname: "/api/icon",
      },
    ],
  },
}

export default nextConfig
