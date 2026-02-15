import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import supabase from "./supabaseClient";

export default function useNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setNotifications(data);
        const unread = data.filter((n) => !n.read).length;
        setNotificationCount(unread);
      }
    };

    fetchNotifications();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("notifications-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new;
          setNotifications((prev) => [newNotif, ...prev]);
          setNotificationCount((prev) => prev + 1);

          toast.info(newNotif.message || "New notification received");
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);

  const markAsRead = async (notifId) => {
    console.log("Notif_id",notifId);
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notifId);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
      );
      setNotificationCount((prev) => Math.max(prev - 1, 0));
    }
  };

  const markAllRead = async () => {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setNotificationCount(0);
    }
  };

  return { notifications, notificationCount, markAsRead, markAllRead };
}
