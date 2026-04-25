export type PdfExtractedImage = {
  page: number;
  mimeType: string;
  data: Buffer;
};

export type PdfExtractedContent = {
  text: string;
  images: PdfExtractedImage[];
};

export async function extractPdfContent(params: unknown): Promise<PdfExtractedContent> {
  void params;
  return { text: "", images: [] };
}
