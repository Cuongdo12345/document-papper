import { useCallback, useRef, useState } from 'react'
import ConfirmModal from './ConfirmModal'; 
import type { ConfirmModalProps, AppModalVariant } from './AppModal.types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConfirmOptions {
  title: string
  description?: React.ReactNode
  variant?: AppModalVariant
  confirmText?: string
  cancelText?: string
  warningText?: string
}

export interface UseConfirmReturn {
  // Gọi để hiển thị dialog — trả về true khi user nhấn Xác nhận, false khi Hủy
  confirm: (options: ConfirmOptions) => Promise<boolean>
  // PHẢI mount trong JSX của component gọi hook này
  ConfirmElement: React.ReactNode
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useConfirm(): UseConfirmReturn {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions>({
    title: '',
  })

  // resolveRef giữ resolve function của Promise hiện tại
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts)
    setOpen(true)

    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
    })
  }, [])

  const handleConfirm = useCallback(() => {
    setOpen(false)
    resolveRef.current?.(true)
    resolveRef.current = null
  }, [])

  const handleCancel = useCallback(() => {
    setOpen(false)
    resolveRef.current?.(false)
    resolveRef.current = null
  }, [])

  const ConfirmElement = (
    <ConfirmModal
      open={open}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      title={options.title}
      description={options.description}
      variant={options.variant}
      confirmText={options.confirmText}
      cancelText={options.cancelText}
      warningText={options.warningText}
    />
  )

  return { confirm, ConfirmElement }
}
