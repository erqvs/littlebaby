export type MinimalMediaAttachment = {
  index: number;
  path?: string;
  url?: string;
  mime?: string;
};

export class MediaAttachmentCache {
  constructor(
    attachments: MinimalMediaAttachment[],
    options?: { localPathRoots?: string[] },
  ) {
    void attachments;
    void options;
  }

  async getBuffer(params: {
    attachmentIndex: number;
    maxBytes?: number;
    timeoutMs?: number;
  }): Promise<{ buffer: Buffer }> {
    void params;
    throw new MediaUnderstandingSkipError("media-disabled");
  }
}

export class MediaUnderstandingSkipError extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = "MediaUnderstandingSkipError";
  }
}

export async function applyMediaUnderstanding(params: unknown): Promise<void> {
  void params;
}

export function normalizeAttachments(ctx: unknown): MinimalMediaAttachment[] {
  void ctx;
  return [];
}

export function isMediaUnderstandingSkipError(error: unknown): error is MediaUnderstandingSkipError {
  return error instanceof MediaUnderstandingSkipError;
}

export function resolveMediaAttachmentLocalRoots(params: unknown): string[] {
  void params;
  return [];
}
