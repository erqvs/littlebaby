import { describe, expect, it } from "vitest";
import { isLittleBabyManagedMatrixDevice, summarizeMatrixDeviceHealth } from "./device-health.js";

describe("matrix device health", () => {
  it("detects LittleBaby-managed device names", () => {
    expect(isLittleBabyManagedMatrixDevice("LittleBaby Gateway")).toBe(true);
    expect(isLittleBabyManagedMatrixDevice("LittleBaby Debug")).toBe(true);
    expect(isLittleBabyManagedMatrixDevice("Element iPhone")).toBe(false);
    expect(isLittleBabyManagedMatrixDevice(null)).toBe(false);
  });

  it("summarizes stale LittleBaby-managed devices separately from the current device", () => {
    const summary = summarizeMatrixDeviceHealth([
      {
        deviceId: "du314Zpw3A",
        displayName: "LittleBaby Gateway",
        current: true,
      },
      {
        deviceId: "BritdXC6iL",
        displayName: "LittleBaby Gateway",
        current: false,
      },
      {
        deviceId: "G6NJU9cTgs",
        displayName: "LittleBaby Debug",
        current: false,
      },
      {
        deviceId: "phone123",
        displayName: "Element iPhone",
        current: false,
      },
    ]);

    expect(summary.currentDeviceId).toBe("du314Zpw3A");
    expect(summary.currentLittleBabyDevices).toEqual([
      expect.objectContaining({ deviceId: "du314Zpw3A" }),
    ]);
    expect(summary.staleLittleBabyDevices).toEqual([
      expect.objectContaining({ deviceId: "BritdXC6iL" }),
      expect.objectContaining({ deviceId: "G6NJU9cTgs" }),
    ]);
  });
});
