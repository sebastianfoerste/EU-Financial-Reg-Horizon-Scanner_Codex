import { describe, expect, it } from "vitest";

import { canApproveAlertStatus, escapeAlertHtml } from "@/lib/alerts";
import { deliverApprovedAlert, providerForChannel } from "@/lib/delivery";

describe("reviewed alert delivery", () => {
  it("maps alert channels to delivery providers", () => {
    expect(providerForChannel("EMAIL_REALTIME")).toBe("RESEND");
    expect(providerForChannel("SLACK")).toBe("SLACK");
    expect(providerForChannel("MS_TEAMS")).toBe("MS_TEAMS");
    expect(providerForChannel("HUBSPOT")).toBe("HUBSPOT");
    expect(providerForChannel("WEBHOOK")).toBeNull();
    expect(providerForChannel("IN_APP")).toBeNull();
  });

  it("blocks email sends without an approved recipient", async () => {
    const result = await deliverApprovedAlert({
      channel: "EMAIL_REALTIME",
      payload: {
        subject: "Test alert",
        text: "Reviewed alert draft",
        to: null,
      },
    });

    expect(result.status).toBe("BLOCKED_BY_CONFIG");
  });

  it("escapes regulator text before it is rendered in reviewed alert HTML", () => {
    expect(escapeAlertHtml('<script>alert("x")</script> & source')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; source",
    );
  });

  it("prevents approval of alerts already in delivery or sent", () => {
    expect(canApproveAlertStatus("DRAFT")).toBe(true);
    expect(canApproveAlertStatus("FAILED")).toBe(true);
    expect(canApproveAlertStatus("SENDING")).toBe(false);
    expect(canApproveAlertStatus("SENT")).toBe(false);
  });
});
