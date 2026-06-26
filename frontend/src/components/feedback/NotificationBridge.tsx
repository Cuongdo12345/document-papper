// src/components/feedback/NotificationBridge.tsx
import { useEffect } from 'react';
import { App } from 'antd';
import { useNotificationStore } from '../../store/notification.store';

// GlobalToastConsumer — đọc notification.store.queue và hiển thị
// qua AntD message (top-right toast). Mount tại App.tsx root —
// theo AUTH_UI_SPEC.md §8.2 "GlobalToastProvider".

export default function NotificationBridge() {
  const { message } = App.useApp();
  const queue = useNotificationStore((s) => s.queue);
  const remove = useNotificationStore((s) => s.remove);

  useEffect(() => {
    queue.forEach((item) => {
      message.open({
        type: item.type === 'warning' ? 'warning' : item.type,
        content: item.message,
        duration: 5,
        onClose: () => remove(item.id),
      });
      remove(item.id);
    });
  }, [queue, message, remove]);

  return null;
}
