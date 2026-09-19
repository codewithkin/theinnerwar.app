import { varlockNextConfigPlugin } from "@varlock/nextjs-integration/plugin";
import type { NextConfig } from "next";

const withVarlock = varlockNextConfigPlugin();

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Type errors are caught by `pnpm check-types`, not by the production build.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default withVarlock(nextConfig);
