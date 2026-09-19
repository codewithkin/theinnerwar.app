import { varlockNextConfigPlugin } from "@varlock/nextjs-integration/plugin";
import type { NextConfig } from "next";

const withVarlock = varlockNextConfigPlugin();

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Type errors are caught by `pnpm check-types`, not by the production build.
  typescript: {
    ignoreBuildErrors: true,
  },
  // Standalone output for the Docker image.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
};

export default withVarlock(nextConfig);
