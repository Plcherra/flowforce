"use client";

import React, { useCallback, useEffect, useMemo } from "react";
import NextLink from "next/link";
import {
  usePathname,
  useRouter,
  useSearchParams as useNextSearchParams,
  useParams as useNextParams,
} from "next/navigation";

type LinkProps = React.PropsWithChildren<
  {
    to: string;
    replace?: boolean;
    prefetch?: boolean;
    className?: string | ((state: { isActive: boolean }) => string);
  } & Omit<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    "className" | "href"
  >
>;

type NavLinkProps = LinkProps & { end?: boolean };

export function Link({
  to,
  replace,
  prefetch = true,
  className,
  children,
  ...rest
}: LinkProps) {
  const pathname = usePathname();
  const isActive = !!pathname && pathname === to;
  const computedClass =
    typeof className === "function" ? className({ isActive }) : className;

  return (
    <NextLink
      href={to}
      replace={replace}
      prefetch={prefetch}
      className={computedClass}
      {...rest}
    >
      {children}
    </NextLink>
  );
}

export function NavLink({ to, className, end, ...rest }: NavLinkProps) {
  const pathname = usePathname() ?? "";
  const isActive = end ? pathname === to : pathname.startsWith(to);
  const computedClass =
    typeof className === "function" ? className({ isActive }) : className;

  return <NextLink href={to} className={computedClass} {...rest} />;
}

export function useNavigate() {
  const router = useRouter();
  return useCallback(
    (to: string | number, options?: { replace?: boolean; state?: unknown }) => {
      if (typeof to === "number") {
        if (to === -1) {
          router.back();
          return;
        }
        if (to === 0) {
          router.refresh();
          return;
        }
        window.history.go(to);
        return;
      }

      if (options?.replace) {
        router.replace(to);
      } else {
        router.push(to);
      }
    },
    [router],
  );
}

export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (replace) {
      router.replace(to);
    } else {
      router.push(to);
    }
  }, [router, to, replace]);

  return null;
}

export function useParams<
  T extends Record<string, any> = Record<string, string>,
>() {
  const params = useNextParams() || {};
  const normalized: Record<string, any> = { ...params };

  // Support optional catch-all segments named "wildcard" to mimic react-router's "*"
  if (Array.isArray((params as any).wildcard)) {
    normalized["*"] = (params as any).wildcard.join("/");
  }

  if (Array.isArray((params as any).slug)) {
    const slug = (params as any).slug as string[];
    normalized.path = normalized.path ?? slug[0];
    normalized["*"] = slug.slice(1).join("/");
  }

  return normalized as T;
}

export function useSearchParams(): [
  URLSearchParams,
  (
    nextInit:
      | URLSearchParams
      | string
      | Record<string, string>
      | ((prev: URLSearchParams) => URLSearchParams),
  ) => void,
] {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useNextSearchParams();

  const setSearchParams = useCallback(
    (
      nextInit:
        | URLSearchParams
        | string
        | Record<string, string>
        | ((prev: URLSearchParams) => URLSearchParams),
    ) => {
      let next: string;

      if (typeof nextInit === "string") {
        next = nextInit.startsWith("?") ? nextInit : `?${nextInit}`;
      } else if (typeof nextInit === "function") {
        next = `?${nextInit(new URLSearchParams(searchParams?.toString() ?? "")).toString()}`;
      } else if (nextInit instanceof URLSearchParams) {
        next = `?${nextInit.toString()}`;
      } else {
        next = `?${new URLSearchParams(nextInit).toString()}`;
      }

      router.push(`${pathname}${next}`);
    },
    [pathname, router, searchParams],
  );

  return [
    searchParams
      ? new URLSearchParams(searchParams.toString())
      : new URLSearchParams(),
    setSearchParams,
  ];
}

export function useLocation() {
  const pathname = usePathname() ?? "";
  const searchParams = useNextSearchParams();

  return useMemo(
    () => ({
      pathname,
      search: searchParams ? `?${searchParams.toString()}` : "",
      hash: "",
      state: null,
      key: "next",
    }),
    [pathname, searchParams],
  );
}

export function Outlet() {
  return null;
}

export function ScrollRestoration() {
  const pathname = usePathname();
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0 });
    }
  }, [pathname]);
  return null;
}

export function Routes({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export function Route({ element }: { element?: React.ReactNode }) {
  return <>{element ?? null}</>;
}

export function useNavigation() {
  return { state: "idle" as "idle" | "loading" | "submitting" };
}

export function RouterProvider({ children }: { children?: React.ReactNode }) {
  return <>{children ?? null}</>;
}

export function MemoryRouter({ children }: { children?: React.ReactNode }) {
  return <>{children ?? null}</>;
}

export function createBrowserRouter() {
  return {};
}
