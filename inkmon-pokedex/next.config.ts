import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 将 @inkmon/core 作为外部包，因为它使用了 node:sqlite
  serverExternalPackages: ["@inkmon/core"],
};

export default nextConfig;
