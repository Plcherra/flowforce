export const THEME_STORAGE_KEY = "flowforce-theme";

export const THEME_NAMES = ["flowforce", "light", "dark"] as const;

export type ThemeName = (typeof THEME_NAMES)[number];

const THEME_COLOR: Record<ThemeName, string> = {
  flowforce: "#ffffff",
  light: "#ffffff",
  dark: "#020817",
};

type ThemeRoot = {
  classList: {
    add: (token: string) => void;
    remove: (token: string) => void;
  };
  setAttribute: (name: string, value: string) => void;
};

export function resolveThemeName(_value: string | null | undefined): ThemeName {
  return "flowforce";
}

export function themeClassList(theme: ThemeName): readonly string[] {
  return theme === "dark" ? ["dark"] : [];
}

export function themeColor(theme: ThemeName): string {
  return THEME_COLOR[theme];
}

export function applyTheme(
  value: string | null | undefined,
  root?: ThemeRoot,
): ThemeName {
  const theme = resolveThemeName(value);
  const target =
    root ??
    (typeof document !== "undefined" ? document.documentElement : undefined);

  if (target) {
    target.setAttribute("data-theme", theme);
    target.classList.remove("dark");
    for (const token of themeClassList(theme)) {
      target.classList.add(token);
    }
  }

  if (typeof document !== "undefined") {
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute("content", themeColor(theme));
  }

  return theme;
}

export const themeBootScript = `(function(){
  var key="flowforce-theme";
  var root=document.documentElement;
  root.setAttribute("data-theme","flowforce");
  root.classList.remove("dark");
  var meta=document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute("content","#ffffff");
  try { localStorage.setItem(key,"flowforce"); } catch(e) {}
})();`;
