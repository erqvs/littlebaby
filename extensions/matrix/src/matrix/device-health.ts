export type MatrixManagedDeviceInfo = {
  deviceId: string;
  displayName: string | null;
  current: boolean;
};

export type MatrixDeviceHealthSummary = {
  currentDeviceId: string | null;
  staleLittleBabyDevices: MatrixManagedDeviceInfo[];
  currentLittleBabyDevices: MatrixManagedDeviceInfo[];
};

const LITTLEBABY_DEVICE_NAME_PREFIX = "LittleBaby ";

export function isLittleBabyManagedMatrixDevice(displayName: string | null | undefined): boolean {
  return displayName?.startsWith(LITTLEBABY_DEVICE_NAME_PREFIX) === true;
}

export function summarizeMatrixDeviceHealth(
  devices: MatrixManagedDeviceInfo[],
): MatrixDeviceHealthSummary {
  const currentDeviceId = devices.find((device) => device.current)?.deviceId ?? null;
  const littleBabyDevices = devices.filter((device) =>
    isLittleBabyManagedMatrixDevice(device.displayName),
  );
  return {
    currentDeviceId,
    staleLittleBabyDevices: littleBabyDevices.filter((device) => !device.current),
    currentLittleBabyDevices: littleBabyDevices.filter((device) => device.current),
  };
}
