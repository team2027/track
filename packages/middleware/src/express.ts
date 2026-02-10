import { trackVisit } from "./index";

interface ExpressRequest {
  hostname?: string;
  path: string;
  headers: Record<string, string | string[] | undefined>;
  get?: (name: string) => string | undefined;
}

interface ExpressResponse {
  [key: string]: unknown;
}

type NextFunction = () => void;

function getHeader(req: ExpressRequest, name: string): string {
  if (req.get) return req.get(name) || "";
  const val = req.headers[name.toLowerCase()];
  return Array.isArray(val) ? val[0] || "" : val || "";
}

export function withAIAnalytics() {
  return (req: ExpressRequest, _res: ExpressResponse, next: NextFunction) => {
    trackVisit({
      host: req.hostname || getHeader(req, "host"),
      path: req.path,
      userAgent: getHeader(req, "user-agent"),
      accept: getHeader(req, "accept"),
    }).catch(() => {});
    next();
  };
}

export { trackVisit } from "./index";
