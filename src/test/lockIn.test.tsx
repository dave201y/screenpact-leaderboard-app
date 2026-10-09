import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { describe, it, expect, vi } from "vitest";
import FigmaApp from "../FigmaApp";

describe("lock in flow", () => {
  it("shows a short lock-in ping when the member taps the action", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ authenticated: true }) }));
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<FigmaApp />);
    });

    const trigger = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.toLowerCase().includes("lock in"),
    );

    expect(trigger).toBeTruthy();

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const ping = container.querySelector(".lockin-ping");
    expect(ping).not.toBeNull();
    expect(ping?.textContent).toMatch(/locked? in|focus|no doomscroll/i);

    root.unmount();
    container.remove();
    vi.unstubAllGlobals();
  });
});
