
export type NotificationEvent = 'created' | 'confirmed' | 'canceled' | 'refunded' | 'reminder_24h';

export async function triggerWhatsAppNotification(event: NotificationEvent, appointmentId: string) {
  try {
    const response = await fetch('/api/notifications/trigger-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event,
        appointment_id: appointmentId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.warn('[WhatsApp Notification] Failed:', errorData.error);
    } else {
      console.log(`[WhatsApp Notification] Event '${event}' triggered successfully.`);
    }
  } catch (err) {
    console.error('[WhatsApp Notification] Network Error:', err);
  }
}
