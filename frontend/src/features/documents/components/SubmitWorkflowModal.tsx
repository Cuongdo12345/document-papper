import { useState } from "react";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/shared/LoadingState";
import { useWorkflowTemplates } from "@/features/documents/hooks/useWorkflowTemplates";
import { useSubmitWorkflow } from "@/features/documents/hooks/useSubmitWorkflow";

interface SubmitWorkflowModalProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
}

function SubmitWorkflowModalContent({ open, onClose, documentId }: SubmitWorkflowModalProps) {
  const [templateId, setTemplateId] = useState("");
  const templatesQuery = useWorkflowTemplates();
  const submitMutation = useSubmitWorkflow();

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Submit vào workflow"
      size="sm"
      footer={
        <>
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={submitMutation.isPending}>
            Huỷ
          </Button>
          <Button
            type="button"
            size="sm"
            loading={submitMutation.isPending}
            disabled={!templateId}
            onClick={() => submitMutation.mutate({ documentId, templateId }, { onSuccess: onClose })}
          >
            Submit
          </Button>
        </>
      }
    >
      {templatesQuery.isLoading ? (
        <LoadingState label="Đang tải danh sách template..." />
      ) : (
        <div className="space-y-1.5">
          <label htmlFor="wf-template" className="text-sm font-medium text-foreground">
            Quy trình duyệt
          </label>
          <select
            id="wf-template"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">-- Chọn quy trình --</option>
            {templatesQuery.data?.map((tpl) => (
              <option key={tpl._id} value={tpl._id}>
                {tpl.name} ({tpl.steps.length} bước)
              </option>
            ))}
          </select>
          {templatesQuery.data?.length === 0 && (
            <p className="text-xs text-muted-foreground">Chưa có workflow template nào — liên hệ ADMIN để tạo trước.</p>
          )}
        </div>
      )}
    </AppModal>
  );
}

/** `key={documentId}` ở nơi gọi để reset lựa chọn template khi đổi document. */
export function SubmitWorkflowModal(props: SubmitWorkflowModalProps) {
  return <SubmitWorkflowModalContent {...props} />;
}
