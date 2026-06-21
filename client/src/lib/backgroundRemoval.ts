import { removeBackground, type Config } from "@imgly/background-removal";

const IMGLY_PUBLIC_PATH = "/imgly-background-removal/";
const MAX_IMAGE_EDGE = 1600;

export interface InventoryImageAsset {
  blob: Blob;
  objectUrl: string;
  dataUrl: string;
  mimeType: "image/png";
  width: number;
  height: number;
}

export interface InventoryImageProgress {
  stage: "prepare" | "download" | "inference" | "fallback";
  current: number;
  total: number;
  message: string;
}

type NormalizedImageAsset = Omit<InventoryImageAsset, "objectUrl" | "dataUrl">;

const isInventoryImageAsset = (
  value: Blob | InventoryImageAsset
): value is InventoryImageAsset =>
  "dataUrl" in value &&
  "objectUrl" in value &&
  "width" in value &&
  "height" in value;

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Failed to read image data."));
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read image data."));
    reader.readAsDataURL(blob);
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: "image/png"
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error("Failed to encode the image."));
        return;
      }
      resolve(blob);
    }, type);
  });
}

async function loadCanvasSource(blob: Blob): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
}> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(blob);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Fall back to HTMLImageElement below.
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  const image = new Image();
  image.decoding = "async";
  image.src = objectUrl;

  try {
    await image.decode();
  } catch {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Failed to decode the image."));
    });
  }

  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    cleanup: () => URL.revokeObjectURL(objectUrl),
  };
}

async function toInventoryImageAsset(
  normalized: NormalizedImageAsset
): Promise<InventoryImageAsset> {
  return {
    ...normalized,
    objectUrl: URL.createObjectURL(normalized.blob),
    dataUrl: await blobToDataUrl(normalized.blob),
  };
}

function getConfig(
  device: "gpu" | "cpu",
  onProgress?: (progress: InventoryImageProgress) => void
): Config {
  return {
    publicPath: IMGLY_PUBLIC_PATH,
    device,
    proxyToWorker: device === "gpu",
    model: "isnet_quint8",
    output: {
      format: "image/png",
      quality: 1,
    },
    progress: (key, current, total) => {
      const stage = key.startsWith("fetch:")
        ? "download"
        : ("inference" as const);
      const message =
        stage === "download"
          ? "Downloading background-removal assets..."
          : "Removing the background...";

      onProgress?.({ stage, current, total, message });
    },
  };
}

async function runBackgroundRemoval(
  normalized: NormalizedImageAsset,
  onProgress?: (progress: InventoryImageProgress) => void
) {
  try {
    return await removeBackground(
      normalized.blob,
      getConfig("gpu", onProgress)
    );
  } catch (gpuError) {
    onProgress?.({
      stage: "fallback",
      current: 0,
      total: 1,
      message: "WebGPU unavailable. Retrying with CPU...",
    });

    try {
      return await removeBackground(
        normalized.blob,
        getConfig("cpu", onProgress)
      );
    } catch (cpuError) {
      const gpuMessage =
        gpuError instanceof Error ? gpuError.message : String(gpuError);
      const cpuMessage =
        cpuError instanceof Error ? cpuError.message : String(cpuError);

      throw new Error(
        `Background removal failed. GPU: ${gpuMessage}. CPU: ${cpuMessage}.`
      );
    }
  }
}

export async function normalizeInventoryImage(
  source: Blob
): Promise<InventoryImageAsset> {
  const loaded = await loadCanvasSource(source);

  try {
    const longestEdge = Math.max(loaded.width, loaded.height);
    const scale =
      longestEdge > MAX_IMAGE_EDGE ? MAX_IMAGE_EDGE / longestEdge : 1;
    const width = Math.max(1, Math.round(loaded.width * scale));
    const height = Math.max(1, Math.round(loaded.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas is unavailable in this browser.");
    }

    context.drawImage(loaded.source, 0, 0, width, height);

    return toInventoryImageAsset({
      blob: await canvasToBlob(canvas, "image/png"),
      mimeType: "image/png",
      width,
      height,
    });
  } finally {
    loaded.cleanup();
  }
}

export async function prepareInventoryImage(
  source: Blob | InventoryImageAsset,
  onProgress?: (progress: InventoryImageProgress) => void
): Promise<InventoryImageAsset> {
  onProgress?.({
    stage: "prepare",
    current: 0,
    total: 1,
    message: "Preparing image...",
  });

  const normalized = isInventoryImageAsset(source)
    ? {
        blob: source.blob,
        mimeType: source.mimeType,
        width: source.width,
        height: source.height,
      }
    : await normalizeInventoryImage(source);

  const removedBackgroundBlob = await runBackgroundRemoval(
    normalized,
    onProgress
  );

  return toInventoryImageAsset({
    blob: removedBackgroundBlob,
    mimeType: "image/png",
    width: normalized.width,
    height: normalized.height,
  });
}
