import { trackVisit } from "./index";

interface CfProperties {
  country?: string;
  [key: string]: unknown;
}

interface CfRequest extends Request {
  cf?: CfProperties;
}

interface CfExecutionContext {
  waitUntil: (promise: Promise<unknown>) => void;
  passThroughOnException?: () => void;
}

interface CfPagesContext {
  request: CfRequest;
  next: () => Response | Promise<Response>;
  waitUntil: (promise: Promise<unknown>) => void;
}

type CfFetchHandler = (
  request: CfRequest,
  env: unknown,
  ctx: CfExecutionContext,
) => Response | Promise<Response>;

type CfPagesHandler = (context: CfPagesContext) => Response | Promise<Response>;

export function trackRequest(request: CfRequest, waitUntil: (p: Promise<unknown>) => void) {
  const url = new URL(request.url);
  waitUntil(
    trackVisit({
      host: url.hostname,
      path: url.pathname,
      userAgent: request.headers.get("user-agent") || "",
      accept: request.headers.get("accept") || "",
      country: request.cf?.country,
    }).catch(() => {}),
  );
}

export function withAIAnalytics(handler: CfFetchHandler): CfFetchHandler {
  return async (request, env, ctx) => {
    trackRequest(request, ctx.waitUntil.bind(ctx));
    return handler(request, env, ctx);
  };
}

export function onRequest(
  handler?: CfPagesHandler,
): CfPagesHandler {
  return async (context) => {
    trackRequest(context.request, context.waitUntil.bind(context));
    if (handler) return handler(context);
    return context.next();
  };
}

export { trackVisit } from "./index";
