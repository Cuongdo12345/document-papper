import { useForm, type Control, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { DocumentMetaFields } from "@/features/documents/components/DocumentMetaFields";
import { useUpdateDocument } from "@/features/documents/hooks/useUpdateDocument";
import { formValuesToMeta, metaFieldsSchema, metaToFormValues, type MetaFormValues } from "@/features/documents/utils/documentMeta";
import { parseApiError } from "@/utils/parseApiError";
import { toast } from "@/stores/toastStore";
import type { Document } from "@/types/document.types";

/** `.merge(metaFieldsSchema)` DÙNG CHUNG đúng 1 schema `meta` với `DocumentCreatePage` — xem giải thích ở `documentMeta.ts`. */
const editDocumentSchema = z
  .object({
    title: z.string().trim().min(1, "Tiêu đề không được để trống"),
  })
  .merge(metaFieldsSchema);

type EditDocumentFormValues = z.infer<typeof editDocumentSchema>;

interface DocumentEditModalProps {
  open: boolean;
  onClose: () => void;
  document: Document;
}

/**
 * `PUT /documents/:id` — CHỈ `title`/`meta` (`DOCUMENT_UPDATE_WHITELIST`),
 * `subType`/`category`/`department` KHÔNG hiển thị ở đây (backend từ chối
 * field khác 400 "Field không hợp lệ" — DOCUMENT_DOMAIN_MAP.md Mục 2).
 * `key={document._id}` ở nơi gọi đảm bảo remount khi đổi document đang sửa
 * (tránh cần `useEffect` reset — cùng pattern `AssignRoleModal`/FE-03).
 */
export function DocumentEditModal({ open, onClose, document }: DocumentEditModalProps) {
  const updateMutation = useUpdateDocument();
  const metaDefaults = metaToFormValues(document.subType, document.meta);

  const form = useForm<EditDocumentFormValues>({
    resolver: zodResolver(editDocumentSchema),
    defaultValues: { title: document.title, ...metaDefaults },
  });

  const { register, handleSubmit, control, formState } = form;
  const apiError = updateMutation.error ? parseApiError(updateMutation.error) : null;

  function onSubmit(values: EditDocumentFormValues) {
    const meta = formValuesToMeta(document.subType, values);
    updateMutation.mutate(
      { id: document._id, body: { title: values.title, meta } },
      {
        onSuccess: () => {
          toast.success("Đã cập nhật tài liệu");
          onClose();
        },
      },
    );
  }

  return (
    <AppModal open={open} onClose={onClose} title="Sửa tài liệu" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="edit-doc-title" className="text-sm font-medium text-foreground">
            Tiêu đề
          </label>
          <input
            id="edit-doc-title"
            autoFocus
            aria-invalid={!!formState.errors.title}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("title")}
          />
          {formState.errors.title && <p className="text-xs text-destructive">{formState.errors.title.message}</p>}
        </div>

        <DocumentMetaFields
          register={register as unknown as UseFormRegister<MetaFormValues>}
          control={control as unknown as Control<MetaFormValues>}
          subType={document.subType}
        />

        {apiError && (
          <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {apiError.message}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={updateMutation.isPending}>
            Huỷ
          </Button>
          <Button type="submit" size="sm" loading={updateMutation.isPending}>
            Lưu thay đổi
          </Button>
        </div>
      </form>
    </AppModal>
  );
}
