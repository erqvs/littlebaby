export type MemoryMultimodalSettings = {
  enabled: boolean;
  modalities: Array<"image" | "audio" | "all">;
  maxFileBytes: number;
};

export function normalizeMemoryMultimodalSettings(params?: {
  enabled?: boolean;
  modalities?: Array<"image" | "audio" | "all">;
  maxFileBytes?: number;
}): MemoryMultimodalSettings {
  return {
    enabled: params?.enabled === true,
    modalities: params?.modalities?.length ? params.modalities : ["image"],
    maxFileBytes: params?.maxFileBytes ?? 0,
  };
}

export function isMemoryMultimodalEnabled(settings?: MemoryMultimodalSettings): boolean {
  return settings?.enabled === true;
}
