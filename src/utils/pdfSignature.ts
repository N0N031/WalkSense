// src/utils/pdfSignature.ts (NEW — Helper signature)


export interface SignaturePad {
  toDataURL(type?: string): string;
  clear(): void;
  isEmpty(): boolean;
}

/**
 * Convertit un canvas de signature en Data URL
 * Compatible iOS + Android
 */
export function captureSignatureAsDataUrl(
  canvas: HTMLCanvasElement | SignaturePad,
): string | null {
  try {
    if ("toDataURL" in canvas) {
      // SignaturePad ou HTMLCanvasElement
      return (canvas as any).toDataURL("image/png");
    }
    return null;
  } catch (error) {
    console.error("captureSignatureAsDataUrl error:", error);
    return null;
  }
}

/**
 * Valide une signature (non vide)
 */
export function isValidSignature(dataUrl: string | null | undefined): boolean {
  if (!dataUrl) return false;
  // Data URL vide = pas de signature
  return dataUrl.length > 100;
}

/**
 * Génère un placeholder de signature vide (pour les PDFs sans signature)
 */
export function getEmptySignaturePlaceholder(): string {
  return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
}
