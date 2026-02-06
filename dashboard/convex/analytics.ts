"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const API_URL = "https://ai-docs-analytics-api.theisease.workers.dev";
const API_SECRET = process.env.API_SECRET;

export const query = action({
  args: {
    queryName: v.string(),
    host: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ data: unknown[] }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const allowedHosts: string[] = await ctx.runQuery(
      internal.users.internal_getAllowedHosts,
      { userId }
    );

    if (allowedHosts.length === 0) {
      return { data: [] };
    }

    let targetHosts = allowedHosts;
    if (args.host) {
      const requestedHost = args.host;
      const isAllowed = allowedHosts.some((host) =>
        requestedHost.includes(host)
      );
      if (!isAllowed) {
        return { data: [] };
      }
      targetHosts = [requestedHost];
    }

    const results: unknown[][] = await Promise.all(
      targetHosts.map(async (host: string): Promise<unknown[]> => {
        const url = new URL(`${API_URL}/query`);
        url.searchParams.set("q", args.queryName);
        url.searchParams.set("host", host);
        const res = await fetch(url.toString(), {
          headers: API_SECRET ? { "x-api-secret": API_SECRET } : {},
        });
        const json = await res.json();
        return (json.data as unknown[]) || [];
      })
    );

    return { data: results.flat() };
  },
});
