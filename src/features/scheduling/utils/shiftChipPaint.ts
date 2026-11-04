const FALLBACK = "#3b82f6";

function channel(value: number) {
  const scaled = value / 255;
  return scaled <= 0.03928
    ? scaled / 12.92
    : ((scaled + 0.055) / 1.055) ** 2.4;
}

function parseHex(color: string | null | undefined): [number, number, number] {
  const match = /^#([0-9a-f]{6})$/i.exec((color ?? "").trim());
  const hex = match ? match[1] : FALLBACK.slice(1);
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

function luminance(rgb: [number, number, number]) {
  return (
    0.2126 * channel(rgb[0]) +
    0.7152 * channel(rgb[1]) +
    0.0722 * channel(rgb[2])
  );
}

function mix(rgb: [number, number, number], toward: number, amount: number) {
  return rgb.map((value) =>
    Math.round(value * (1 - amount) + toward * amount),
  ) as [number, number, number];
}

function rgb(rgb: [number, number, number]) {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

export interface ShiftChipPaint {
  backgroundColor: string;
  color: string;
  borderLeft: string;
  opaque: boolean;
}

/** Still short of the people this shift needs. Null headcount means one person. */
export function shiftIsOpen(schedule: {
  assignments?: readonly unknown[] | null;
  required_headcount?: number | null;
}): boolean {
  const assigned = schedule.assignments?.length ?? 0;
  const required = Math.max(1, schedule.required_headcount ?? 1);
  return assigned < required;
}

/** Full color block. Assigned stays an opaque fill. Open shifts use a strong wash plus a thick bar. */
export function shiftChipPaint(
  color: string | null | undefined,
  variant: "assigned" | "unassigned",
): ShiftChipPaint {
  const base = parseHex(color);
  const ink = luminance(base) > 0.62 ? "#1f2937" : "#ffffff";
  const accent = rgb(mix(base, 0, 0.28));
  if (variant === "assigned") {
    return {
      backgroundColor: rgb(base),
      color: ink,
      borderLeft: `8px solid ${accent}`,
      opaque: true,
    };
  }
  return {
    backgroundColor: rgb(mix(base, 255, 0.72)),
    color: "#1f2937",
    borderLeft: `8px solid ${rgb(base)}`,
    opaque: false,
  };
}
