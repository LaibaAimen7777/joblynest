import { useNotifications } from "./useNotifications";

function NotificationBell({ userId }) {
  const { notifications } = useNotifications(userId);

  return (
    <div>
      <button>
        🔔 {notifications.filter((n) => !n.read).length}
      </button>
      <ul>
        {notifications.map((n) => (
          <li key={n.id}>{n.message}</li>
        ))}
      </ul>
    </div>
  );
}
