"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Member = {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  role: string;
  status: string;
};

export default function ProjectMembersPage() {
  const router = useRouter();
  const params = useParams<{ workspaceId: string; projectId: string }>();
  const { workspaceId, projectId } = params;
  const token = useMemo(() => getToken(), []);

  const [workspaceMembers, setWorkspaceMembers] = useState<Member[]>([]);
  const [projectMembers, setProjectMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function reload() {
    if (!token) return;
    const [wm, pm] = await Promise.all([
      apiFetch<Member[]>(`/workspaces/${workspaceId}/members`, { token }),
      apiFetch<Member[]>(`/workspaces/${workspaceId}/projects/${projectId}/members`, { token }),
    ]);
    setWorkspaceMembers(wm.filter((m) => m.status === "active"));
    setProjectMembers(pm.filter((m) => m.status === "active"));
  }

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    setError(null);
    reload().catch((e: any) => setError(e?.message ?? "加载失败"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, workspaceId, projectId]);

  const projectUserIds = new Set(projectMembers.map((m) => m.user_id));

  async function addToProject(userId: string) {
    if (!token) return;
    if (projectUserIds.has(userId)) return;
    setSaving(true);
    setError(null);
    try {
      const created = await apiFetch<Member>(`/workspaces/${workspaceId}/projects/${projectId}/members`, {
        method: "POST",
        token,
        body: JSON.stringify({ user_id: userId, role: "member" }),
      });
      setProjectMembers((prev) => [created, ...prev]);
    } catch (e: any) {
      setError(e?.message ?? "添加失败（需 Owner/Admin）");
    } finally {
      setSaving(false);
    }
  }

  async function removeFromProject(userId: string) {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch<void>(`/workspaces/${workspaceId}/projects/${projectId}/members/${userId}`, {
        method: "DELETE",
        token,
      });
      setProjectMembers((prev) => prev.filter((m) => m.user_id !== userId));
    } catch (e: any) {
      setError(e?.message ?? "移除失败（需 Owner/Admin）");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="pt-8 pb-12 px-container-padding">
      <div className="max-w-container-max mx-auto space-y-3xl">
        <section className="flex items-center justify-between">
          <div className="space-y-xs">
            <div className="text-overline text-zinc-400">项目成员</div>
            <h1 className="font-subhead text-subhead text-text-primary">成员管理</h1>
            <p className="text-small text-text-secondary">从左侧拖拽到右侧即可添加成员。仅 Owner/Admin 可修改。</p>
          </div>
          <a
            className="px-lg py-sm rounded-xl border border-zinc-200 text-sm font-medium text-text-primary hover:bg-zinc-50 transition-all flex items-center gap-2"
            href={`/workspace/${workspaceId}/projects/${projectId}`}
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            返回项目
          </a>
        </section>

        {error && (
          <div className="rounded-xl border border-error-container bg-error-container/10 p-4 text-small text-error">
            {error}
          </div>
        )}

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
          <div className="bg-white rounded-xl border border-border-subtle p-xl space-y-lg">
            <div className="flex items-center justify-between">
              <h2 className="font-subhead text-lg text-text-primary">工作空间成员</h2>
              <span className="text-small text-text-secondary">{workspaceMembers.length}</span>
            </div>

            <ul className="space-y-sm">
              {workspaceMembers.map((m) => {
                const added = projectUserIds.has(m.user_id);
                return (
                  <li
                    key={m.id}
                    draggable={!added && !saving}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", m.user_id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    className={[
                      "rounded-xl border border-border-subtle p-4 flex items-center justify-between",
                      added ? "opacity-50 bg-surface-container-lowest" : "bg-white hover:shadow-sm",
                      "transition-all",
                    ].join(" ")}
                    title={added ? "已在项目中" : "拖拽以添加"}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-sm font-semibold text-text-primary">
                        {(m.display_name?.trim().slice(0, 1) || m.email.trim().slice(0, 1)).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-small font-semibold text-text-primary truncate">{m.display_name || m.email}</div>
                        <div className="text-caption text-neutral-muted truncate">{m.email}</div>
                      </div>
                    </div>
                    <span className="text-overline text-zinc-400">{added ? "已添加" : "拖拽"}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div
            className="bg-white rounded-xl border border-border-subtle p-xl space-y-lg"
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
              e.preventDefault();
              const userId = e.dataTransfer.getData("text/plain");
              if (userId) addToProject(userId);
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-subhead text-lg text-text-primary">项目成员</h2>
              <span className="text-small text-text-secondary">{projectMembers.length}</span>
            </div>

            {projectMembers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-subtle p-6 text-small text-text-secondary">
                将工作空间成员拖到这里，即可加入到该项目。
              </div>
            ) : (
              <ul className="space-y-sm">
                {projectMembers.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-xl border border-border-subtle p-4 flex items-center justify-between bg-white hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-sm font-semibold text-text-primary">
                        {(m.display_name?.trim().slice(0, 1) || m.email.trim().slice(0, 1)).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-small font-semibold text-text-primary truncate">{m.display_name || m.email}</div>
                        <div className="text-caption text-neutral-muted truncate">{m.email}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="w-10 h-10 flex items-center justify-center border border-border-subtle rounded-xl hover:bg-red-50 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                      title="移除"
                      disabled={saving}
                      onClick={() => removeFromProject(m.user_id)}
                    >
                      <span className="material-symbols-outlined text-[18px] text-gray-400 group-hover:text-red-600">
                        delete
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

