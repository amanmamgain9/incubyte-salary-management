import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  // AGENTS.md is maintained by hand; stop `next dev` from writing its managed block into it.
  agentRules: false,
  async redirects() {
    return [{ source: "/", destination: "/employees", permanent: false }];
  },
};

export default nextConfig;
