import { useOruga } from '@oruga-ui/oruga-next'

export function useNotification() {
  const oruga = useOruga()

  const showNotification = ({ message, type = 'info', duration = 3000 }) => {
    oruga.notification.open({
      message,
      duration,
      position: 'top-right',
      variant: type,
      closable: true
    })
  }

  return {
    showNotification
  }
} 