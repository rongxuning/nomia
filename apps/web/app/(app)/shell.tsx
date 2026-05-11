"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import { Breadcrumbs } from "@/components/Breadcrumbs";

type MeResponse = { id: string; email: string; display_name: string };

function NavItem({
  href,
  icon,
  label,
  active,
  inset,
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
  inset?: boolean;
}) {
  return (
    <a
      className={
        active
          ? `flex items-center gap-3 ${inset ? "pl-10 pr-3" : "px-3"} py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-50 rounded-md transition-all font-medium text-sm`
          : `flex items-center gap-3 ${inset ? "pl-10 pr-3" : "px-3"} py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-all font-medium text-sm`
      }
      href={href}
    >
      <span
        className={active ? "material-symbols-outlined text-indigo-600" : "material-symbols-outlined text-indigo-600"}
        style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
      >
        {icon}
      </span>
      {label}
    </a>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const token = useMemo(() => getToken(), []);

  const [me, setMe] = useState<MeResponse | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    apiFetch<MeResponse>("/auth/me", { token })
      .then(setMe)
      .catch(() => setMe(null));
  }, [router, token]);

  useEffect(() => {
    if (!userMenuOpen) return;
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [userMenuOpen]);

  const userInitial = (me?.display_name?.trim().slice(0, 1) ?? "?").toUpperCase();

  return (
    <>
      {/* TopAppBar */}
      <header className="fixed top-0 w-full border-b z-50 bg-white/80 backdrop-blur-md border-gray-200">
        <div className="flex justify-between items-center h-14 px-4 w-full">
          <div className="flex items-center gap-3 min-w-0">
            <img alt="Nomia 标志" src="/nomia-logo-mark.png" className="w-6 h-6 object-contain" />
            <span className="text-xl font-bold tracking-tight text-gray-900 font-display">Nomia</span>
            <Breadcrumbs className="hidden sm:block min-w-0 md:pl-container-padding" />
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group hidden sm:block">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <span className="material-symbols-outlined text-[20px]">search</span>
              </span>
              <input
                className="pl-10 pr-4 py-1.5 bg-surface-container-low border-none rounded-xl text-small focus:ring-2 focus:ring-primary/10 w-64"
                placeholder="搜索（⌘K）"
                type="text"
              />
            </div>

            <button
              className="p-2 text-gray-500 hover:bg-gray-50 rounded-md transition-colors duration-200 active:scale-95"
              type="button"
              onClick={() => undefined}
            >
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button
              className="p-2 text-gray-500 hover:bg-gray-50 rounded-md transition-colors duration-200 active:scale-95"
              type="button"
              onClick={() => undefined}
            >
              <span className="material-symbols-outlined">settings</span>
            </button>

            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                onClick={() => setUserMenuOpen((v) => !v)}
                className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
              >
                {userInitial}
              </button>

              {userMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-32 rounded-xl border border-border-subtle bg-surface shadow-sm py-2"
                >
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-small text-text-secondary hover:bg-surface-container-lowest transition-colors"
                    role="menuitem"
                    onClick={() => {
                      setUserMenuOpen(false);
                      clearToken();
                      router.push("/login");
                    }}
                  >
                    退出登录
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* SideNavBar */}
      <aside className="h-screen w-48 border-r fixed left-0 top-14 bg-white border-gray-200 hidden md:block">
        <div className="flex flex-col p-4 space-y-2 h-full">
          <nav className="space-y-1">
            <NavItem
              href="/my/schedule"
              icon="event_note"
              label="我的日程"
              active={pathname.startsWith("/my/schedule")}
            />
            <NavItem
              href="/workspaces"
              icon="grid_view"
              label="工作空间"
              active={pathname === "/workspaces" || pathname.startsWith("/workspace/")}
            />
            <NavItem href="/member" icon="group" label="成员" active={pathname.startsWith("/member")} />
            <div className="pt-1">
              <div className="flex items-center gap-3 px-3 py-2 text-gray-600 rounded-md transition-all font-medium text-sm select-none">
                <span className="material-symbols-outlined text-indigo-600">query_stats</span>
                数据分析
              </div>
              <div className="mt-1 space-y-1">
                {/* reserved for future analytics pages */}
              </div>
            </div>

            <div className="pt-1">
              <Link
                href="/documents"
                className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-all font-medium text-sm select-none"
              >
                <span className="material-symbols-outlined text-indigo-600">description</span>
                文档
              </Link>
              <div className="mt-1 space-y-1">
                <NavItem
                  href="/documents/code"
                  icon="code"
                  label="代码文档"
                  active={pathname.startsWith("/documents/code")}
                  inset
                />
                <NavItem
                  href="/documents/guide"
                  icon="menu_book"
                  label="使用指南"
                  active={pathname.startsWith("/documents/guide")}
                  inset
                />
              </div>
            </div>
          </nav>
        </div>
      </aside>

      {/* Content */}
      <div className="md:ml-48 pt-14 min-h-screen">{children}</div>
    </>
  );
}

