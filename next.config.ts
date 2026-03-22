import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit resolves font AFM files via __dirname at runtime.
  // Marking it as external prevents Next.js from bundling it, so Node's
  // native require() is used and __dirname resolves correctly.
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
