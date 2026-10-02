import { AppDrawer } from "@/components/shared/AppDrawer";
import type { SystemDesignModel, SystemDesignModule, SystemDesignRelationship } from "@/types/systemDesign.types";

export type SystemDesignDrawerState =
  | { kind: "model"; model: SystemDesignModel; outgoingRelations: SystemDesignRelationship[] }
  | { kind: "edge"; relation: SystemDesignRelationship }
  | { kind: "module"; module: SystemDesignModule }
  | null;

interface SystemDesignDetailDrawerProps {
  state: SystemDesignDrawerState;
  onClose: () => void;
}

/** DEV-073/FE-24 — dùng lại `AppDrawer` sẵn có, KHÔNG tự viết panel trượt riêng (Design System Rule). */
export function SystemDesignDetailDrawer({ state, onClose }: SystemDesignDetailDrawerProps) {
  const title =
    state?.kind === "model" ? state.model.name : state?.kind === "edge" ? "Chi tiết quan hệ" : state?.kind === "module" ? state.module.name : "";

  return (
    <AppDrawer open={state !== null} onClose={onClose} title={title} width="sm">
      {state?.kind === "model" && (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Module</p>
            <p className="text-sm text-foreground">{state.model.module}</p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Collection</p>
            <p className="font-mono text-sm text-foreground">{state.model.collection}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Field ({state.model.fields.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {state.model.fields.map((field) => (
                <span key={field} className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                  {field}
                </span>
              ))}
            </div>
          </div>
          {state.outgoingRelations.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Quan hệ ({state.outgoingRelations.length})
              </p>
              <ul className="space-y-1">
                {state.outgoingRelations.map((relation, i) => (
                  <li key={i} className="text-xs text-muted-foreground">
                    <span className="font-mono font-medium text-foreground">{relation.field}</span> → {relation.ref}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {state?.kind === "edge" && (
        <div className="space-y-2 text-sm">
          <p className="text-foreground">
            <span className="font-mono font-semibold">
              {state.relation.model}.{state.relation.field}
            </span>
          </p>
          <p className="text-muted-foreground">
            → tham chiếu tới model <span className="font-semibold text-foreground">{state.relation.ref}</span>
          </p>
        </div>
      )}

      {state?.kind === "module" && (
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Model ({state.module.models.length})</p>
            <div className="flex flex-wrap gap-1">
              {state.module.models.map((modelName) => (
                <span key={modelName} className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                  {modelName}
                </span>
              ))}
            </div>
          </div>

          {state.module.description && (
            <div>
              <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Mô tả</p>
              <p className="text-sm text-foreground">{state.module.description}</p>
            </div>
          )}

          {state.module.features && state.module.features.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Tính năng chính</p>
              <ul className="list-inside list-disc space-y-1 text-sm text-foreground">
                {state.module.features.map((feature, i) => (
                  <li key={i}>{feature}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Tài liệu liên quan ({state.module.relatedDocs.length})
            </p>
            {state.module.relatedDocs.length > 0 ? (
              <ul className="space-y-1">
                {state.module.relatedDocs.map((doc) => (
                  <li key={doc.path}>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary underline-offset-2 hover:underline"
                    >
                      {doc.path}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có task doc nào nhắc tới module này.</p>
            )}
          </div>
        </div>
      )}
    </AppDrawer>
  );
}
