"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

function titleCase(input: string) {
  return input
    .split(" ")
    .filter(Boolean)
    .map((w) => w.slice(0, 1).toUpperCase() + w.slice(1))
    .join(" ");
}

function humanizeSegment(segment: string, labelBySegment: Record<string, string>) {
  const mapped = labelBySegment[segment];
  if (mapped) return mapped;

  // likely UUID / opaque ids: show short but stable label
  if (/^[0-9a-f]{8,}$/i.test(segment)) return segment.slice(0, 8);

  return titleCase(segment.replace(/[-_]+/g, " "));
}

export type Breadcrumb = { href: string; label: string };

type ResolvedName = { label: string };

const workspaceNameCache = new Map<string, ResolvedName>();
const projectNameCache = new Map<string, ResolvedName>();

export function Breadcrumbs({
  className,
  labelBySegment,
  rootHrefOverrides,
  hideOnPaths,
}: {
  className?: string;
  labelBySegment?: Record<string, string>;
  rootHrefOverrides?: Record<string, string>;
  hideOnPaths?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [workspaceLabels, setWorkspaceLabels] = useState<Record<string, string>>({});
  const [projectLabels, setProjectLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!pathname) return;

    const segments = pathname.split("/").filter(Boolean);
    const workspaceIdx = segments.findIndex((s) => s === "workspace");
    const workspaceId = workspaceIdx >= 0 ? segments[workspaceIdx + 1] : undefined;
    const projectsIdx = segments.findIndex((s) => s === "projects");
    const projectId = projectsIdx >= 0 ? segments[projectsIdx + 1] : undefined;

    const token = getToken();
    if (!token) return;

    let cancelled = false;

    if (workspaceId) {
      const cached = workspaceNameCache.get(workspaceId);
      if (cached) {
        setWorkspaceLabels((prev) => (prev[workspaceId] ? prev : { ...prev, [workspaceId]: cached.label }));
      } else {
        apiFetch<{ id: string; name: string }>(`/workspaces/${workspaceId}`, { token })
          .then((w) => {
            if (cancelled) return;
            workspaceNameCache.set(workspaceId, { label: w.name });
            setWorkspaceLabels((prev) => ({ ...prev, [workspaceId]: w.name }));
          })
          .catch(() => {
            // ignore: keep fallback label
          });
      }
    }

    if (workspaceId && projectId) {
      const key = `${workspaceId}:${projectId}`;
      const cached = projectNameCache.get(key);
      if (cached) {
        setProjectLabels((prev) =>
          prev[key] || prev[projectId] ? prev : { ...prev, [key]: cached.label, [projectId]: cached.label },
        );
      } else {
        apiFetch<{ id: string; name: string }>(`/workspaces/${workspaceId}/projects/${projectId}`, { token })
          .then((p) => {
            if (cancelled) return;
            projectNameCache.set(key, { label: p.name });
            // Store both keyed by workspace+project and by projectId alone
            // so breadcrumb rendering remains robust even if path parsing changes.
            setProjectLabels((prev) => ({ ...prev, [key]: p.name, [projectId]: p.name }));
          })
          .catch(() => {
            // ignore: keep fallback label
          });
      }
    }

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const crumbs = useMemo<Array<Breadcrumb>>(() => {
    if (!pathname) return [];
    if (hideOnPaths?.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return [];

    const defaultLabelBySegment: Record<string, string> = {
      workspaces: "工作空间",
      workspace: "工作空间",
      projects: "项目",
      project: "项目",
      items: "任务",
      item: "任务",
      activity: "活动",
      settings: "设置",
      members: "成员",
      documents: "文档",
      code: "代码文档",
      guide: "使用指南",
      database: "数据库结构",
      my: "我的",
      schedule: "日程",
    };

    const labels = { ...defaultLabelBySegment, ...(labelBySegment ?? {}) };
    const overrides = rootHrefOverrides ?? {
      documents: "/documents",
      workspace: "/workspaces",
    };

    const segments = pathname.split("/").filter(Boolean);
    const out: Array<Breadcrumb> = [];
    let href = "";
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const prev = segments[i - 1];

      // For project detail paths like /workspace/:wid/projects/:pid, hide the "projects" segment.
      if (segment === "projects" && segments[i - 1] && segments[i + 1]) {
        // Still advance href so the next segment keeps the correct URL.
        href += `/${segment}`;
        continue;
      }

      // For /my/schedule, collapse the "my" + "schedule" pair into a single "我的日程" crumb.
      if (segment === "my" && segments[i + 1] === "schedule") {
        href += `/${segment}`;
        continue;
      }
      if (segment === "schedule" && prev === "my") {
        href += `/${segment}`;
        out.push({ href, label: "我的日程" });
        continue;
      }

      href += `/${segment}`;
      const resolvedWorkspace =
        prev === "workspace" && workspaceLabels[segment] ? workspaceLabels[segment] : undefined;
      const resolvedProject =
        // /workspace/:wid/projects/:pid  -> i points at :pid, prev is "projects", wid is segments[i-2]
        prev === "projects" && segments[i - 3] === "workspace"
          ? projectLabels[segment] ?? projectLabels[`${segments[i - 2]}:${segment}`]
          : undefined;

      out.push({
        href: overrides[segment] ?? href,
        label: resolvedProject ?? resolvedWorkspace ?? humanizeSegment(segment, labels),
      });
    }
    return out;
  }, [hideOnPaths, labelBySegment, pathname, projectLabels, rootHrefOverrides, workspaceLabels]);

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="面包屑导航" className={className}>
      <ol className="flex items-center gap-1 text-sm text-gray-500 min-w-0">
        {crumbs.map((c, idx) => {
          const isLast = idx === crumbs.length - 1;
          return (
            <li key={c.href} className="flex items-center gap-1 min-w-0">
              {idx > 0 && <span className="text-gray-300 select-none">/</span>}
              {isLast ? (
                <button
                  type="button"
                  className="text-gray-700 font-medium truncate hover:text-gray-900"
                  onClick={() => {
                    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
                    router.refresh();
                  }}
                  aria-label={`刷新 ${c.label}`}
                >
                  {c.label}
                </button>
              ) : (
                <Link className="hover:text-gray-700 truncate" href={c.href}>
                  {c.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

