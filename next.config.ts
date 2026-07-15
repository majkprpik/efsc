import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only: lets another machine on the tailnet load /_next/* (HMR, chunks)
  // when opening this server over Tailscale. Without it the page shell renders
  // but no client JS runs.
  allowedDevOrigins: ["100.113.161.30", "*.ts.net"],
};

export default nextConfig;
