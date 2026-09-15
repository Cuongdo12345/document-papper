import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { useCreatePolicy, useUpdatePolicy } from "@/features/rbac/hooks/usePolicyActions";
import { parseApiError } from "@/utils/parseApiError";
import { toast } from "@/stores/toastStore";
import type { Policy } from "@/types/rbac.types";

/** Khớp `CreatePolicyDTO`/`UpdatePolicyDTO`. */
const policySchema = z.object({
  name: z.string().trim().min(1, "Tên policy không được để trống").max(100),
  resource: z.string().trim().min(1, "Resource không được để trống").max(100),
  action: z.string().trim().min(1, "Action không được để trống").max(100),
  condition: z.string().trim().min(1, "Condition không được để trống").max(1000),
});

type PolicyFormValues = z.infer<typeof policySchema>;

interface PolicyFormModalProps {
  open: boolean;
  onClose: () => void;
  policy?: Policy;
}

export function PolicyFormModal({ open, onClose, policy }: PolicyFormModalProps) {
  const isEdit = !!policy;
  const createMutation = useCreatePolicy();
  const updateMutation = useUpdatePolicy();
  const mutation = isEdit ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PolicyFormValues>({ resolver: zodResolver(policySchema) });

  useEffect(() => {
    if (open) {
      reset({
        name: policy?.name ?? "",
        resource: policy?.resource ?? "",
        action: policy?.action ?? "",
        condition: policy?.condition ?? "",
      });
    }
  }, [open, policy, reset]);

  // Backend validate cú pháp `condition` NGAY LÚC submit (400 nếu sai) — xem `Policycondition.evaluator.ts`.
  const apiError = mutation.error ? parseApiError(mutation.error) : null;

  function onSubmit(values: PolicyFormValues) {
    if (isEdit) {
      updateMutation.mutate(
        { id: policy._id, body: values },
        {
          onSuccess: () => {
            toast.success("Đã cập nhật policy");
            onClose();
          },
        },
      );
    } else {
      createMutation.mutate(values, {
        onSuccess: () => {
          toast.success("Đã tạo policy mới");
          onClose();
        },
      });
    }
  }

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={isEdit ? "Sửa policy" : "Tạo policy"}
      description="Policy (ABAC) chỉ được xét khi RBAC (role) KHÔNG đủ quyền — resource/action phải khớp CHÍNH XÁC với route backend đăng ký (xem middleware `authorizePermission()` của route liên quan)."
      size="lg"
      footer={
        <>
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={mutation.isPending}>
            Huỷ
          </Button>
          <Button type="submit" form="policy-form" size="sm" loading={mutation.isPending}>
            {isEdit ? "Lưu thay đổi" : "Tạo mới"}
          </Button>
        </>
      }
    >
      <form id="policy-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="policy-name" className="text-sm font-medium text-foreground">
            Tên policy
          </label>
          <input
            id="policy-name"
            autoFocus
            placeholder="VD: document-view-detail-same-department"
            aria-invalid={!!errors.name}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("name")}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="policy-resource" className="text-sm font-medium text-foreground">
              Resource
            </label>
            <input
              id="policy-resource"
              placeholder="VD: document"
              aria-invalid={!!errors.resource}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("resource")}
            />
            {errors.resource && <p className="text-xs text-destructive">{errors.resource.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="policy-action" className="text-sm font-medium text-foreground">
              Action
            </label>
            <input
              id="policy-action"
              placeholder="VD: view_detail"
              aria-invalid={!!errors.action}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("action")}
            />
            {errors.action && <p className="text-xs text-destructive">{errors.action.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="policy-condition" className="text-sm font-medium text-foreground">
            Điều kiện (condition)
          </label>
          <textarea
            id="policy-condition"
            rows={3}
            placeholder='VD: resource.pendingApproverRole === user.role.name'
            aria-invalid={!!errors.condition}
            className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("condition")}
          />
          {errors.condition && <p className="text-xs text-destructive">{errors.condition.message}</p>}
          <p className="text-xs text-muted-foreground">
            Chỉ hỗ trợ: truy cập field lồng nhau qua <code className="font-mono">user.*</code> / <code className="font-mono">resource.*</code>,
            so sánh (=== !== &lt; &gt; &lt;= &gt;=), logic (&amp;&amp; || !), chuỗi/số/boolean/null, ngoặc đơn. KHÔNG hỗ trợ gọi hàm (chống RCE).
          </p>
        </div>

        {apiError && (
          <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {apiError.message}
          </p>
        )}
      </form>
    </AppModal>
  );
}
