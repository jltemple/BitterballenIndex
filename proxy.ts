import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: [
    // Match all pathnames except /api, /admin, /_next, /_vercel, and files with extensions
    "/((?!api|admin|_next|_vercel|.*\\..*).*)",
  ],
};
