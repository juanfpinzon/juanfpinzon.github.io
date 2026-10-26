import type { NextConfig } from "next";

// The scaffold (create-next-app 16.4.3) turned on `cacheComponents` and
// `partialPrefetching` by default. Both exist to mix cached/static and
// request-time content inside one route. Every Day 27 route is fully static
// (no cookies, headers, fetches or request data), so plain build-time
// prerendering is the simplest correct model and the build output can show
// each route as "○ (Static)". Revisit when Day 28 adds the chat route.
const nextConfig: NextConfig = {
  // Do not advertise the framework in an `X-Powered-By` response header.
  poweredByHeader: false,
};

export default nextConfig;
