import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 自托管用 standalone；Vercel 不要开
  ...(process.env.NEXT_OUTPUT === "standalone" ? { output: "standalone" as const } : {}),
};

export default nextConfig;
