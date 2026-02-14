import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";

export default convexAuthNextjsMiddleware(undefined, {
  apiRoute: "/app/api/auth",
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
    { source: "/" },
  ],
};
