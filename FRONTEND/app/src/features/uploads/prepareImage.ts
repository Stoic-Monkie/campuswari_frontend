import { pickedFileProblem, fitWithin, squareCrop } from "../../lib/imageMath";
import { LIMITS } from "../../lib/limits";

export class PrepareError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrepareError";
  }
}

export interface PrepareOptions {
  /** Longest side in pixels. */
  maxSide: number;
  /** Crop to the centred square first (avatars). */
  square?: boolean;
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/**
 * Turn whatever the user picked (JPEG, PNG, WebP, HEIC where the browser can read it ...)
 * into a right-way-up JPEG that fits the API's limits. The API accepts only JPEG and PNG,
 * so converting here makes phone photos work. Transparent areas become white.
 * Browser-only (uses canvas); the maths lives in lib/imageMath.ts and is unit-tested.
 */
export async function prepareImage(file: File, options: PrepareOptions): Promise<Blob> {
  const problem = pickedFileProblem(file);
  if (problem) throw new PrepareError(problem);

  let bitmap: ImageBitmap;
  try {
    // "from-image" applies the camera's rotation, so photos are not sideways.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new PrepareError("This image format isn’t supported here. Try a JPEG or PNG.");
  }

  try {
    const crop = options.square
      ? (() => {
          const c = squareCrop(bitmap.width, bitmap.height);
          return { sx: c.sx, sy: c.sy, sw: c.size, sh: c.size };
        })()
      : { sx: 0, sy: 0, sw: bitmap.width, sh: bitmap.height };
    const { width, height } = fitWithin(crop.sw, crop.sh, options.maxSide);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new PrepareError("Your browser can’t process images.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, width, height);

    for (const quality of [0.85, 0.7, 0.55]) {
      const blob = await toBlob(canvas, quality);
      if (blob && blob.size <= LIMITS.imageBytes) return blob;
    }
    throw new PrepareError("That photo is too large even after shrinking it. Try a smaller one.");
  } finally {
    bitmap.close();
  }
}
