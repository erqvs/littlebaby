import { describe, expect, it } from "vitest";
import { resolveIrcInboundTarget } from "./monitor.js";

describe("irc monitor inbound target", () => {
  it("keeps channel target for group messages", () => {
    expect(
      resolveIrcInboundTarget({
        target: "#littlebaby",
        senderNick: "alice",
      }),
    ).toEqual({
      isGroup: true,
      target: "#littlebaby",
      rawTarget: "#littlebaby",
    });
  });

  it("maps DM target to sender nick and preserves raw target", () => {
    expect(
      resolveIrcInboundTarget({
        target: "littlebaby-bot",
        senderNick: "alice",
      }),
    ).toEqual({
      isGroup: false,
      target: "alice",
      rawTarget: "littlebaby-bot",
    });
  });

  it("falls back to raw target when sender nick is empty", () => {
    expect(
      resolveIrcInboundTarget({
        target: "littlebaby-bot",
        senderNick: " ",
      }),
    ).toEqual({
      isGroup: false,
      target: "littlebaby-bot",
      rawTarget: "littlebaby-bot",
    });
  });
});
