import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const isCloudflarePages = process.env.CLOUDFLARE_PAGES === "true";
const githubPagesBasePath = "/sakurakou-lesson-review";
const basePath = isGitHubPages ? githubPagesBasePath : "";

const nextConfig: NextConfig = {
  ...(isGitHubPages || isCloudflarePages
    ? {
        output: "export",
        basePath,
        assetPrefix: basePath,
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
