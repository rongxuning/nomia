"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { setToken } from "@/lib/auth";

type LoginResponse = { access_token: string; token_type: string };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@nomia.com");
  const [password, setPassword] = useState("admin1234");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(res.access_token);
      router.push("/my/schedule");
    } catch (err: any) {
      setError(err?.message ?? "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-container-padding relative overflow-hidden">
      <div className="absolute inset-0 dot-grid opacity-60 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-surface-container-low/50 via-transparent to-primary-container/5 pointer-events-none" />

      <div className="w-full max-w-[440px] relative z-10">
        <div className="mb-8xl flex flex-col items-center">
          <div className="flex items-center gap-2 mb-lg">
            <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-xl">
              <img
                alt="Nomia 标志"
                src="/nomia-logo-mark.png"
                className="w-6 h-6 object-contain"
              />
            </div>
            <span className="font-headline text-subhead tracking-tight text-on-surface">Nomia</span>
          </div>
          <p className="font-body text-text-secondary text-center mt-sm">登录后即可使用工作空间与项目</p>
        </div>

        <div className="bg-surface border border-border-subtle rounded-xl p-3xl shadow-sm hover:shadow-md transition-shadow duration-300">
          <form onSubmit={onSubmit} className="space-y-xl">
            <div className="space-y-xs">
              <label className="font-body text-small font-medium text-on-surface-variant" htmlFor="email">
                邮箱
              </label>
              <div className="relative group">
                <input
                  id="email"
                  className="w-full bg-surface-bright border border-border-subtle rounded-xl px-lg py-md text-body focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="name@company.com"
                  type="email"
                />
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-primary transition-colors">
                  mail
                </span>
              </div>
            </div>

            <div className="space-y-xs">
              <div className="flex justify-between items-center">
                <label className="font-body text-small font-medium text-on-surface-variant" htmlFor="password">
                  密码
                </label>
                <a
                  className="font-small text-primary hover:underline decoration-2 underline-offset-4"
                  href="#"
                >
                  忘记密码？
                </a>
              </div>
              <div className="relative group">
                <input
                  id="password"
                  className="w-full bg-surface-bright border border-border-subtle rounded-xl px-lg py-md text-body focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-primary transition-colors">
                  lock
                </span>
              </div>
            </div>

            {error && <div className="text-small text-error">{error}</div>}

            <button
              type="submit"
              className="w-full bg-primary text-on-primary font-section-heading text-body py-md rounded-xl hover:bg-primary-hover hover:-translate-y-px active:scale-95 transition-all shadow-sm disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "登录中…" : "登录"}
            </button>
          </form>
        </div>
      </div>

      <footer className="fixed bottom-lg w-full px-container-padding flex justify-between items-center text-overline text-outline-variant">
        <span>© 2026 Nomia</span>
        <div className="flex gap-lg">
          <a className="hover:text-text-secondary transition-colors" href="#">
            隐私
          </a>
          <a className="hover:text-text-secondary transition-colors" href="#">
            条款
          </a>
          <a className="hover:text-text-secondary transition-colors" href="#">
            安全
          </a>
        </div>
      </footer>
    </main>
  );
}
