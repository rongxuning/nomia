"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type UserRow = {
  id: string;
  email: string;
  display_name: string;
  status: string;
  workspace_count: number;
};

type UserWorkspace = {
  workspace: { id: string; name: string; description?: string | null };
  membership: { id: string; role: string; status: string };
  projects: { id: string; name: string; description?: string | null; archived: boolean }[];
};

export default function MemberPage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [detailsByUserId, setDetailsByUserId] = useState<Record<string, UserWorkspace[] | undefined>>({});
  const [detailsLoadingUserId, setDetailsLoadingUserId] = useState<string | null>(null);
  const [detailsErrorByUserId, setDetailsErrorByUserId] = useState<Record<string, string | undefined>>({});

  const [copyStateByUserId, setCopyStateByUserId] = useState<Record<string, "idle" | "success" | "error">>({});
  const copyResetTimersRef = useRef<Record<string, number | undefined>>({});

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    setLoading(true);
    setError(null);
    apiFetch<UserRow[]>("/users", { token })
      .then(setUsers)
      .catch((e: any) => setError(e?.message ?? "加载失败"))
      .finally(() => setLoading(false));
  }, [router, token]);

  useEffect(() => {
    return () => {
      for (const timerId of Object.values(copyResetTimersRef.current)) {
        if (timerId) window.clearTimeout(timerId);
      }
    };
  }, []);

  async function toggleUser(userId: string) {
    if (!token) return;
    const nextExpanded = expandedUserId === userId ? null : userId;
    setExpandedUserId(nextExpanded);
    if (!nextExpanded) return;

    if (detailsByUserId[userId]) return;

    setDetailsLoadingUserId(userId);
    setDetailsErrorByUserId((prev) => ({ ...prev, [userId]: undefined }));
    try {
      const details = await apiFetch<UserWorkspace[]>(`/users/${userId}/workspaces`, { token });
      setDetailsByUserId((prev) => ({ ...prev, [userId]: details }));
    } catch (e: any) {
      setDetailsErrorByUserId((prev) => ({ ...prev, [userId]: e?.message ?? "加载失败" }));
    } finally {
      setDetailsLoadingUserId(null);
    }
  }

  function setCopyState(userId: string, state: "idle" | "success" | "error") {
    setCopyStateByUserId((prev) => ({ ...prev, [userId]: state }));
    const existing = copyResetTimersRef.current[userId];
    if (existing) window.clearTimeout(existing);
    if (state === "idle") return;
    copyResetTimersRef.current[userId] = window.setTimeout(() => {
      setCopyStateByUserId((prev) => ({ ...prev, [userId]: "idle" }));
    }, 1000);
  }

  async function writeClipboardWithFallback(text: string) {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    if (!ok) throw new Error("copy_failed");
  }

  async function handleCopyEmail(e: React.MouseEvent, userId: string, email: string) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await writeClipboardWithFallback(email);
      setCopyState(userId, "success");
    } catch {
      setCopyState(userId, "error");
    }
  }

  return (
    <main className="pt-4 pb-12 px-container-padding">
      <div className="max-w-container-max mx-auto space-y-3xl">
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-lg">
          <div className="space-y-xs">
            <div className="flex items-center gap-2">
              <h1 className="font-subhead text-subhead text-text-primary">成员</h1>
              <span className="text-small text-text-secondary">· 共 {users.length} 人</span>
            </div>
            <div className="text-small text-text-secondary">全局用户列表，以及他们所属的工作空间。</div>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-error-container bg-error-container/10 p-4 text-small text-error">{error}</div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl border border-border-subtle p-xl text-small text-text-secondary">加载中…</div>
        ) : users.length === 0 ? (
          <div className="bg-white rounded-xl border border-border-subtle p-xl text-small text-text-secondary">暂无用户。</div>
        ) : (
          <ul className="space-y-sm">
            {users.map((u) => {
              const expanded = expandedUserId === u.id;
              const details = detailsByUserId[u.id];
              const detailsLoading = detailsLoadingUserId === u.id;
              const detailsError = detailsErrorByUserId[u.id];
              const copyState = copyStateByUserId[u.id] ?? "idle";

              return (
                <li key={u.id} className="bg-white rounded-xl border border-border-subtle p-xl hover:shadow-md transition-all">
                  <div
                    role="button"
                    tabIndex={0}
                    className="w-full text-left cursor-pointer"
                    onClick={() => toggleUser(u.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleUser(u.id);
                      }
                    }}
                    aria-expanded={expanded}
                  >
                    <div className="flex items-start justify-between gap-lg">
                      <div className="space-y-1 min-w-0">
                        <div className="font-subhead text-lg text-text-primary truncate">
                          {u.display_name || u.email}
                        </div>
                        <div className="flex items-center gap-2 text-small text-text-secondary min-w-0">
                          <span className="font-body truncate">({u.email})</span>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-md border border-border-subtle bg-white px-2 py-1 text-text-secondary hover:text-text-primary hover:bg-gray-50 transition-colors"
                            onClick={(e) => handleCopyEmail(e, u.id, u.email)}
                            aria-label={`复制邮箱 ${u.email}`}
                            title={copyState === "success" ? "已复制" : copyState === "error" ? "复制失败" : "复制邮箱"}
                          >
                            <span className="material-symbols-outlined text-[18px] leading-none">
                              {copyState === "success" ? "done" : copyState === "error" ? "error" : "content_copy"}
                            </span>
                          </button>
                        </div>
                        <div className="text-small text-text-secondary">
                          状态：<span className="font-semibold text-text-primary">{u.status}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-overline uppercase tracking-widest">
                          {u.workspace_count} 个工作空间
                        </span>
                        <span className="material-symbols-outlined text-indigo-600">
                          {expanded ? "expand_less" : "expand_more"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {expanded && (
                    <div className="mt-lg border-t border-gray-50 pt-lg space-y-md">
                      {detailsLoading && (
                        <div className="text-small text-text-secondary flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
                          加载中...
                        </div>
                      )}
                      {detailsError && (
                        <div className="text-small text-error rounded-xl border border-error-container bg-error-container/10 p-3">
                          {detailsError}
                        </div>
                      )}

                      {!detailsLoading && !detailsError && details && details.length === 0 && (
                        <div className="text-small text-text-secondary">暂无 workspace 归属。</div>
                      )}

                      {!detailsLoading && !detailsError && details && details.length > 0 && (
                        <div className="space-y-sm">
                          {details.map((d) => (
                            <div key={d.membership.id} className="rounded-xl border border-border-subtle p-lg">
                              <div className="flex items-start justify-between gap-lg">
                                <div className="space-y-1">
                                  <div className="font-subhead text-base text-text-primary">{d.workspace.name}</div>
                                  <div className="text-small text-text-secondary">
                                    角色：<span className="font-semibold text-text-primary">{d.membership.role}</span> ·
                                    状态：{" "}
                                    <span className="font-semibold text-text-primary">{d.membership.status}</span>
                                  </div>
                                </div>
                                <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-overline uppercase tracking-widest">
                                  {d.projects.length} 个项目
                                </span>
                              </div>

                              {d.projects.length > 0 && (
                                <ul className="mt-md space-y-2">
                                  {d.projects.map((p) => (
                                    <li key={p.id} className="flex items-center justify-between gap-3 text-small">
                                      <div className="text-text-primary truncate">{p.name}</div>
                                      {p.archived && (
                                        <span className="text-[11px] font-semibold text-text-secondary bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                                          已归档
                                        </span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}

