"use client";

import { useEffect, useMemo, useState } from "react";

export default function DatabaseDiagramPage() {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const diagram = useMemo(
    () => `erDiagram
      USERS {
        uuid id PK
        datetime created_at
        datetime updated_at
        string email
        string password_hash
        string display_name
        string status
      }

      WORKSPACES {
        uuid id PK
        datetime created_at
        datetime updated_at
        string name
        uuid created_by_user_id FK
      }

      WORKSPACE_MEMBERS {
        uuid id PK
        datetime created_at
        datetime updated_at
        uuid workspace_id FK
        uuid user_id FK
        string role
        string status
      }

      PROJECTS {
        uuid id PK
        datetime created_at
        datetime updated_at
        uuid workspace_id FK
        string name
        string description
        bool archived
      }

      ITEMS {
        uuid id PK
        datetime created_at
        datetime updated_at
        uuid workspace_id FK
        uuid project_id FK
        string title
        string body
        string status
        string priority
        datetime start_at
        datetime end_at
        string details
        int version
      }

      COMMENTS {
        uuid id PK
        datetime created_at
        datetime updated_at
        uuid workspace_id FK
        uuid item_id FK
        uuid author_user_id FK
        string body
        datetime deleted_at
      }

      ACTIVITY_LOG {
        uuid id PK
        datetime created_at
        datetime updated_at
        uuid workspace_id FK
        uuid actor_user_id FK
        string entity_type
        uuid entity_id
        string action
        jsonb metadata
      }

      USERS ||--o{ WORKSPACES : creates
      WORKSPACES ||--o{ WORKSPACE_MEMBERS : has
      USERS ||--o{ WORKSPACE_MEMBERS : joins
      WORKSPACES ||--o{ PROJECTS : contains
      WORKSPACES ||--o{ ITEMS : contains
      PROJECTS ||--o{ ITEMS : contains
      WORKSPACES ||--o{ COMMENTS : contains
      ITEMS ||--o{ COMMENTS : has
      USERS ||--o{ COMMENTS : writes
      WORKSPACES ||--o{ ACTIVITY_LOG : records
      USERS ||--o{ ACTIVITY_LOG : acts
    `,
    [],
  );

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "neutral",
          securityLevel: "strict",
        });
        const { svg } = await mermaid.render("nomia-db-er", diagram);
        if (!cancelled) setSvg(svg);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "渲染失败");
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [diagram]);

  return (
    <main className="min-h-screen px-container-padding py-8">
      <div className="max-w-container-max mx-auto space-y-4xl">
        <div className="space-y-xs">
          <h1 className="font-section-heading text-section-heading text-text-primary">数据库结构</h1>
          <p className="text-body text-text-secondary">
            从迁移文件（`0001_init_schema`、`0002_add_item_schedule_fields`）推断的表结构、字段与关联关系。
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-error-container bg-error-container/10 p-4 text-small text-error">
            {error}
          </div>
        ) : svg ? (
          <div className="rounded-xl border border-border-subtle bg-surface p-3xl overflow-auto">
            {/* mermaid returns a full SVG string */}
            <div dangerouslySetInnerHTML={{ __html: svg }} />
          </div>
        ) : (
          <div className="text-small text-text-secondary">渲染中…</div>
        )}
      </div>
    </main>
  );
}

