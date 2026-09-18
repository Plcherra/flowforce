const DARK_FOREGROUND = "222.2 47.4% 11.2%";
const LIGHT_FOREGROUND = "210 40% 98%";

type Rgb = { r: number; g: number; b: number };

const parseHex = (value: string): Rgb | null => {
  const hex = value.trim().replace(/^#/, "");
  const normalized =
    hex.length === 3
      ? hex
          .split("")
          .map((part) => part + part)
          .join("")
      : hex;

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
};

const toLinear = (channel: number) => {
  const value = channel / 255;
  return value <= 0.03928
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4;
};

export const hexToHslChannels = (value: string): string | null => {
  const rgb = parseHex(value);
  if (!rgb) return null;

  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;

  if (max !== min) {
    const delta = max - min;
    saturation =
      lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    switch (max) {
      case r:
        hue = (g - b) / delta + (g < b ? 6 : 0);
        break;
      case g:
        hue = (b - r) / delta + 2;
        break;
      default:
        hue = (r - g) / delta + 4;
        break;
    }

    hue /= 6;
  }

  return `${Math.round(hue * 360)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
};

export const hexToForegroundChannels = (value: string): string | null => {
  const rgb = parseHex(value);
  if (!rgb) return null;

  const luminance =
    0.2126 * toLinear(rgb.r) +
    0.7152 * toLinear(rgb.g) +
    0.0722 * toLinear(rgb.b);

  return luminance > 0.45 ? DARK_FOREGROUND : LIGHT_FOREGROUND;
};

export const DEFAULT_LOGO_BACKGROUND = "#ffffff";

export type CompanyBrand = {
  primary?: string | null;
  secondary?: string | null;
  logoBackground?: string | null;
  logoUrl?: string | null;
};

let brand: CompanyBrand = {};
const brandListeners = new Set<() => void>();

export function getCompanyBrand() {
  return brand;
}

export function subscribeCompanyBrand(listener: () => void) {
  brandListeners.add(listener);
  return () => {
    brandListeners.delete(listener);
  };
}

export function setCompanyBrand(next: CompanyBrand) {
  brand = { ...brand, ...next };
  applyCompanyTheme(brand);
  brandListeners.forEach((listener) => listener());
}

export function applyCompanyTheme(colors: {
  primary?: string | null;
  secondary?: string | null;
  logoBackground?: string | null;
}) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const primary = hexToHslChannels(colors.primary ?? "");
  const primaryForeground = hexToForegroundChannels(colors.primary ?? "");
  const secondary = hexToHslChannels(colors.secondary ?? "");
  const secondaryForeground = hexToForegroundChannels(colors.secondary ?? "");
  const logoBackground = colors.logoBackground?.trim() || "";
  const logoForeground = hexToForegroundChannels(logoBackground);

  if (primary) {
    root.style.setProperty("--primary", primary);
    root.style.setProperty("--ring", primary);
    root.style.setProperty("--sidebar-primary", primary);
  }

  if (primaryForeground) {
    root.style.setProperty("--primary-foreground", primaryForeground);
    root.style.setProperty("--sidebar-primary-foreground", primaryForeground);
  }

  if (secondary) {
    root.style.setProperty("--secondary", secondary);
    root.style.setProperty("--brand-secondary", secondary);
  }

  if (secondaryForeground) {
    root.style.setProperty("--secondary-foreground", secondaryForeground);
  }

  if (/^#[0-9a-fA-F]{6}$/.test(logoBackground)) {
    root.style.setProperty("--logo-background", logoBackground);
  }

  if (logoForeground) {
    root.style.setProperty("--logo-foreground", logoForeground);
  }
}
