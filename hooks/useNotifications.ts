import { useEffect } from 'react';

import { ensureNotificationPermission } from '@/services/notificationService';

export function useNotifications() {
  useEffect(() => {
    ensureNotificationPermission().catch(() => {
      // Kullanıcı izin vermezse akış kırılmasın.
    });
  }, []);
}
