import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useWatch, type Control, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/shared/LoadingState";
import { AssetPicker } from "@/features/documents/components/AssetPicker";
import { DocumentMetaFields } from "@/features/documents/components/DocumentMetaFields";
import { useCreateDocument } from "@/features/documents/hooks/useCreateDocument";
import { useDepartments } from "@/features/departments/hooks/useDepartments";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/constants/permissions";
import { formValuesToMeta, metaFieldsSchema, type MetaFormValues } from "@/features/documents/utils/documentMeta";
import { parseApiError } from "@/utils/parseApiError";
import { toast } from "@/stores/toastStore";
import { CREATABLE_SUB_TYPES, type DocumentSubType } from "@/types/document.types";

const SUB_TYPE_LABEL: Record<DocumentSubType, string> = {
  PROPOSE_REPAIR: "Đề xuất sửa chữa",
  PROPOSE_INK: "Đề xuất thay mực",
  PROPOSE_PROCUREMENT: "Đề xuất mua sắm/dự trù",
  CHECK_DAMAGE: "Biên bản kiểm tra hư hỏng",
  CONFIRM_STATUS: "Biên bản xác nhận tình trạng",
  MANUAL: "Tài liệu hướng dẫn",
};

/**
 * Khớp `CreateDocumentDTO` — endpoint `/documents/proposal` CHỈ tạo
 * category=PROPOSAL (DOCUMENT_DOMAIN_MAP.md Mục 3). `.merge(metaFieldsSchema)`
 * DÙNG CHUNG đúng 1 schema `meta` với `DocumentEditModal` (xem giải thích ở
 * `documentMeta.ts` — bắt buộc để `DocumentMetaFields` generic type-check được).
 */
const createDocumentSchema = z
  .object({
    subType: z.enum(CREATABLE_SUB_TYPES as [DocumentSubType, ...DocumentSubType[]]),
    title: z.string().trim().min(1, "Tiêu đề không được để trống"),
    department: z.string().min(1, "Vui lòng chọn khoa/phòng"),
    relatedAsset: z.string().optional(),
  })
  .merge(metaFieldsSchema)
  .superRefine((data, ctx) => {
    if (data.subType === "PROPOSE_REPAIR") {
      if (!data.relatedAsset) {
        ctx.addIssue({ code: "custom", path: ["relatedAsset"], message: "Bắt buộc chọn tài sản liên quan" });
      }
      if (!data.issue || data.issue.trim() === "") {
        ctx.addIssue({ code: "custom", path: ["issue"], message: "Vui lòng mô tả sự cố" });
      }
    } else if (!data.items || data.items.length === 0 || data.items.every((i) => !i.name.trim())) {
      ctx.addIssue({ code: "custom", path: ["items"], message: "Cần ít nhất 1 hạng mục" });
    }
  });

type CreateDocumentFormValues = z.infer<typeof createDocumentSchema>;

/** Route `/app/documents/create` (ROUTE_PERMISSION_MAP.md) — trang riêng, KHÔNG phải modal (khác Users/Departments FE-03: Document Create có nhiều field điều kiện theo subType, phù hợp trang riêng hơn AppDrawer). */
export function DocumentCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateDocument();
  const { user, hasPermission } = usePermission();
  // ⚠️ FIX (2026-09-06, user báo lỗi kèm screenshot): role `USER` KHÔNG có
  // `DEPARTMENT_VIEW` (chỉ `IT` có — `rolePermission.map.ts`), nên
  // `GET /departments` trả 403 với MỌI tài khoản USER → dropdown "Khoa/Phòng"
  // luôn trống, không tạo được đề xuất nào (xác nhận qua HTTP thật). Thay vì
  // nới RBAC (cấp `DEPARTMENT_VIEW` cho USER — tác động rộng không cần thiết,
  // Departments là dữ liệu tham chiếu KHÔNG sensitive nhưng vẫn là thay đổi
  // bảo mật), khoá field này về ĐÚNG khoa của chính người tạo (`user.department`,
  // đã có sẵn từ `GET /users/me`, KHÔNG cần gọi thêm API nào) — khớp đúng
  // nghiệp vụ thực tế: nhân viên (USER) chỉ tạo đề xuất cho khoa của MÌNH,
  // còn IT (role duy nhất khác có `DOCUMENT_CREATE`) đã có sẵn `DEPARTMENT_VIEW`
  // vì cần tạo đề xuất/sửa chữa CHO KHOA KHÁC (thiết bị của khoa đó, không
  // phải khoa IT) — giữ nguyên dropdown đầy đủ cho riêng role này.
  const canBrowseDepartments = hasPermission(PERMISSIONS.DEPARTMENT_VIEW);
  const departmentsQuery = useDepartments({ limit: 100 }, { enabled: canBrowseDepartments });
  const [assetLabel, setAssetLabel] = useState<string>();

  const form = useForm<CreateDocumentFormValues>({
    resolver: zodResolver(createDocumentSchema),
    defaultValues: {
      subType: "PROPOSE_REPAIR",
      title: "",
      // `ProtectedRoute` (route cha, guard `DOCUMENT_CREATE`) đã chờ
      // `usePermission().isLoading` xong trước khi render trang này — `user`
      // ở đây LUÔN đã sẵn sàng (không phải `undefined` do race condition).
      department: canBrowseDepartments ? "" : (user?.department?._id ?? ""),
      relatedAsset: undefined,
      issue: "",
      items: [{ name: "", quantity: 1, unitPrice: 0, note: "" }],
    },
  });

  const { register, handleSubmit, control, setValue, formState } = form;
  // `useWatch` (không phải `watch()` gọi trực tiếp lúc render) — tránh cảnh
  // báo oxlint react/incompatible-library (React Compiler không memo hoá được
  // giá trị trả về từ `watch()` gọi trực tiếp).
  const subType = useWatch({ control, name: "subType" });
  const relatedAsset = useWatch({ control, name: "relatedAsset" });
  const apiError = createMutation.error ? parseApiError(createMutation.error) : null;

  function onSubmit(values: CreateDocumentFormValues) {
    const meta = formValuesToMeta(values.subType, values);
    createMutation.mutate(
      {
        category: "PROPOSAL",
        subType: values.subType,
        title: values.title,
        department: values.department,
        meta,
        relatedAsset: values.subType === "PROPOSE_REPAIR" ? values.relatedAsset : undefined,
      },
      {
        onSuccess: (response) => {
          toast.success("Đã tạo tài liệu mới");
          navigate(`/app/documents/${response.data.data._id}`);
        },
      },
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Tạo đề xuất mới" description="Đề xuất sửa chữa / thay mực / mua sắm — cần duyệt qua workflow." />

      {departmentsQuery.isLoading ? (
        <LoadingState label="Đang tải dữ liệu tham chiếu..." />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-2xl space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="doc-subType" className="text-sm font-medium text-foreground">
              Loại đề xuất
            </label>
            <select
              id="doc-subType"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("subType")}
            >
              {CREATABLE_SUB_TYPES.map((st) => (
                <option key={st} value={st}>
                  {SUB_TYPE_LABEL[st]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="doc-title" className="text-sm font-medium text-foreground">
              Tiêu đề
            </label>
            <input
              id="doc-title"
              autoFocus
              aria-invalid={!!formState.errors.title}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("title")}
            />
            {formState.errors.title && <p className="text-xs text-destructive">{formState.errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="doc-department" className="text-sm font-medium text-foreground">
              Khoa/Phòng
            </label>
            {canBrowseDepartments ? (
              <select
                id="doc-department"
                aria-invalid={!!formState.errors.department}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register("department")}
              >
                <option value="">-- Chọn khoa/phòng --</option>
                {departmentsQuery.data?.data.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            ) : user?.department ? (
              // Không có `DEPARTMENT_VIEW` — khoá cứng về khoa của chính người
              // tạo (xem giải thích ở khai báo `canBrowseDepartments` phía trên).
              <>
                <input type="hidden" {...register("department")} />
                <div
                  id="doc-department"
                  className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
                >
                  {user.department.name} ({user.department.code})
                </div>
                <p className="text-xs text-muted-foreground">Đề xuất sẽ được tạo cho khoa/phòng của bạn.</p>
              </>
            ) : (
              <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                Tài khoản của bạn chưa được gán khoa/phòng — vui lòng liên hệ quản trị viên trước khi tạo đề xuất.
              </p>
            )}
            {formState.errors.department && (
              <p className="text-xs text-destructive">{formState.errors.department.message}</p>
            )}
          </div>

          {subType === "PROPOSE_REPAIR" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Tài sản liên quan</label>
              <AssetPicker
                value={relatedAsset}
                selectedLabel={assetLabel}
                onChange={(id, label) => {
                  setValue("relatedAsset", id, { shouldValidate: true });
                  setAssetLabel(label);
                }}
                error={formState.errors.relatedAsset?.message}
              />
              <p className="text-xs text-muted-foreground">
                Chỉ hiện tài sản chưa thanh lý/mất. Tài sản đang có đề xuất sửa chữa khác chưa duyệt xong sẽ bị backend từ chối.
              </p>
            </div>
          )}

          <DocumentMetaFields
            // Cast ranh giới — xem giải thích ở `DocumentMetaFieldsProps` (documentMeta.ts merge).
            register={register as unknown as UseFormRegister<MetaFormValues>}
            control={control as unknown as Control<MetaFormValues>}
            subType={subType}
          />
          {formState.errors.issue && <p className="text-xs text-destructive">{formState.errors.issue.message}</p>}
          {formState.errors.items && <p className="text-xs text-destructive">{formState.errors.items.message as string}</p>}

          {apiError && (
            <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {apiError.message}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => navigate("/app/documents")} disabled={createMutation.isPending}>
              Huỷ
            </Button>
            <Button
              type="submit"
              size="sm"
              loading={createMutation.isPending}
              disabled={!canBrowseDepartments && !user?.department}
            >
              Tạo mới
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
