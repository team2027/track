import { withAIAnalytics } from "2027-track/cloudflare";

export default {
  fetch: withAIAnalytics((request) => fetch(request)),
};
