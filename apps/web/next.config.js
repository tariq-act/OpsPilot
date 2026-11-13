/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fail the production build on ESLint / type errors instead of shipping soft failures.
  // Lint and typecheck also run as separate CI steps.
  poweredByHeader: false,
};

export default nextConfig;
