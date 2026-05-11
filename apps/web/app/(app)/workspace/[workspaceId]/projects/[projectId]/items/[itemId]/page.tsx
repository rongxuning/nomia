"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Item = {
  id: string;
  title: string;
  body?: string | null;
  status: string;
  priority?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  version: number;
};

type Comment = {
  id: string;
  author_user_id: string;
  author_display_name?: string;
  body: string;
  created_at: string;
  deleted_at?: string | null;
  parent_comment_id?: string | null;
  completion_status?: string;
};

export default function ItemDetailPage() {
  const router = useRouter();
  const params = useParams<{ workspaceId: string; projectId: string; itemId: string }>();
  const { workspaceId, projectId, itemId } = params;
  const token = useMemo(() => getToken(), []);

  const [item, setItem] = useState<Item | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    if (!token) return;
    const i = await apiFetch<Item>(`/workspaces/${workspaceId}/projects/${projectId}/items/${itemId}`, {
      token,
    });
    const c = await apiFetch<Comment[]>(
      `/workspaces/${workspaceId}/projects/${projectId}/items/${itemId}/comments`,
      { token },
    );
    setItem(i);
    setComments(c.filter((x) => !x.deleted_at));
  }

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    reload().catch((e: any) => setError(e?.message ?? "加载失败"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, workspaceId, projectId, itemId]);

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    try {
      await apiFetch<Comment>(`/workspaces/${workspaceId}/projects/${projectId}/items/${itemId}/comments`, {
        method: "POST",
        token,
        body: JSON.stringify({ body: commentBody }),
      });
      setCommentBody("");
      await reload();
    } catch (e: any) {
      setError(e?.message ?? "评论失败");
    }
  }

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{item?.title ?? "任务"}</h1>
        <a className="underline text-sm" href={`/workspace/${workspaceId}/projects/${projectId}`}>
          返回
        </a>
      </header>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <section className="border rounded p-4 space-y-2">
        <div className="text-sm text-gray-600">状态：{item?.status ?? "-"}</div>
        {item?.body && <div className="text-sm whitespace-pre-wrap">{item.body}</div>}
      </section>

      <section className="space-y-3">
        <div className="font-medium">评论</div>
        <form onSubmit={addComment} className="space-y-2">
          <textarea
            className="w-full border rounded px-3 py-2"
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder="写下你的评论…"
          />
          <button className="rounded bg-black text-white px-3 py-2" type="submit">
            发表评论
          </button>
        </form>

        <ul className="space-y-2">
          {comments.map((c) => (
            <li key={c.id} className="border rounded p-3">
              <div className="text-xs text-gray-600 flex flex-wrap gap-2">
                <span>{new Date(c.created_at).toLocaleString()}</span>
                {c.author_display_name && <span>· {c.author_display_name}</span>}
                {c.completion_status && (
                  <span className="text-gray-500">
                    · {c.completion_status === "done" ? "已完成" : "未完成"}
                  </span>
                )}
              </div>
              <div className="text-sm whitespace-pre-wrap">{c.body}</div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

