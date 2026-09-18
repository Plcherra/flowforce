const EXPORT_SIZE = 512;
const WHITE_THRESHOLD = 248;

export type LogoTransform = {
  zoom: number;
  offsetX: number;
  offsetY: number;
  removeWhite: boolean;
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load the selected image."));
    image.src = src;
  });

export const coverScaleForViewport = (
  width: number,
  height: number,
  viewport: number,
) => Math.max(viewport / width, viewport / height);

const coverScale = (image: HTMLImageElement, viewport: number) =>
  coverScaleForViewport(image.naturalWidth, image.naturalHeight, viewport);

export const offsetToCenterContent = (
  imageWidth: number,
  imageHeight: number,
  contentX: number,
  contentY: number,
  viewport: number,
  zoom: number,
) => {
  const fit = coverScaleForViewport(imageWidth, imageHeight, viewport);
  return {
    x: fit * zoom * (imageWidth / 2 - contentX),
    y: fit * zoom * (imageHeight / 2 - contentY),
  };
};

export async function findLogoContentCenter(sourceUrl: string) {
  const image = await loadImage(sourceUrl);
  const width = image.naturalWidth || 1;
  const height = image.naturalHeight || 1;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return { x: width / 2, y: height / 2, width, height };
  }

  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const alpha = pixels[index + 3];
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      const isWhite =
        red >= WHITE_THRESHOLD &&
        green >= WHITE_THRESHOLD &&
        blue >= WHITE_THRESHOLD;
      if (alpha > 16 && !isWhite) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0 || maxY < 0) {
    return { x: width / 2, y: height / 2, width, height };
  }

  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    width,
    height,
  };
}

const punchWhiteBackground = (ctx: CanvasRenderingContext2D, size: number) => {
  const pixels = ctx.getImageData(0, 0, size, size);
  const data = pixels.data;

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    if (
      red >= WHITE_THRESHOLD &&
      green >= WHITE_THRESHOLD &&
      blue >= WHITE_THRESHOLD
    ) {
      data[index + 3] = 0;
    }
  }

  ctx.putImageData(pixels, 0, 0);
};

export async function exportCompanyLogo(
  sourceUrl: string,
  viewport: number,
  transform: LogoTransform,
): Promise<File> {
  const image = await loadImage(sourceUrl);
  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_SIZE;
  canvas.height = EXPORT_SIZE;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Unable to prepare the logo canvas.");
  }

  const scale = (EXPORT_SIZE / viewport) * coverScale(image, viewport) * transform.zoom;
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const x =
    EXPORT_SIZE / 2 +
    transform.offsetX * (EXPORT_SIZE / viewport) -
    width / 2;
  const y =
    EXPORT_SIZE / 2 +
    transform.offsetY * (EXPORT_SIZE / viewport) -
    height / 2;

  ctx.clearRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);
  ctx.drawImage(image, x, y, width, height);

  if (transform.removeWhite) {
    punchWhiteBackground(ctx, EXPORT_SIZE);
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((next) => {
      if (next) resolve(next);
      else reject(new Error("Unable to export the cropped logo."));
    }, "image/png");
  });

  return new File([blob], "company-logo.png", { type: "image/png" });
}
