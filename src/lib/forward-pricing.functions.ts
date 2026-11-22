import { createServerFn } from "@tanstack/react-start";

/** Public read: latest official central bank policy rates by currency. No user data. */
export const policyRates = createServerFn({ method: "GET" }).handler(async () => {
  const { readPolicyRates } = await import("./services/policy-rates.server");
  const { serviceOperation } = await import("./services/runtime.server");
  return serviceOperation("market.policy-rates", () => readPolicyRates());
});

/** Public read: latest public FBIL USD/INR forward premia curve. No user data. */
export const fbilForwardPremia = createServerFn({ method: "GET" }).handler(async () => {
  const { readFbilForwardPremia } = await import("./services/fbil-forwards.server");
  const { serviceOperation } = await import("./services/runtime.server");
  return serviceOperation("market.fbil-forward-premia", () => readFbilForwardPremia());
});
