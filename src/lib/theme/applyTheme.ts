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

export function resolveThemeName(value: string | null | undefined): ThemeName {
  if (value === "flowforce" || value === "light" || value === "dark") {
    return value;
  }
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
  function applyTheme(value){
    var theme=value==="flowforce"||value==="light"||value==="dark"?value:"flowforce";
    var root=document.documentElement;
    root.setAttribute("data-theme",theme);
    root.classList.remove("dark");
    if(theme==="dark") root.classList.add("dark");
    var color=theme==="dark"?"#020817":"#ffffff";
    var meta=document.querySelector('meta[name="theme-color"]');
    if(meta) meta.setAttribute("content",color);
  }
  try { applyTheme(localStorage.getItem(key)); }
  catch(e) { applyTheme(null); }
})();`;
