import { message } from 'antd'
import { useEffect } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL TOAST CONSUMER
// Nguồn: STATE_MAPPING.md §5 Notification Store
//
// Notification.store là bridge giữa Axios interceptor (ngoài React)
// và AntD message API (cần React context).
// Component này mount 1 lần tại MainLayout, consume queue và clear.
//
// Trong dự án thực:
//   import { useNotificationStore } from '@/store/notification.store'
//   const { queue, remove } = useNotificationStore()
//
// Đây là stub documentation — replace với Zustand store import thực.
// ─────────────────────────────────────────────────────────────────────────────

// STUB — thay bằng Zustand store import:
// import { useNotificationStore } from '@/store/notification.store'
interface NotificationItem {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

function useNotificationStore() {
  return {
    queue: [] as NotificationItem[],
    remove: (_id: string) => {},
  }
}

function GlobalToastConsumer() {
  const [messageApi, contextHolder] = message.useMessage()
  const { queue, remove } = useNotificationStore()

  useEffect(() => {
    queue.forEach(item => {
      messageApi[item.type](item.message, item.duration ?? 4)
      remove(item.id)
    })
  }, [queue, messageApi, remove])

  return <>{contextHolder}</>
}

export default GlobalToastConsumer
