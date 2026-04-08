/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    domains: ["cdn.jsdelivr.net"],
  },
}

export default nextConfig
