//  useRealtimeMessages.js
import { useEffect } from "react";
import { toast } from "react-toastify";
import supabase from "./supabaseClient.js";

export default function useRealtimeMessages(userId) {
  useEffect(() => {
    if (!userId) return;

    const msgChannel = supabase
      .channel("realtime-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${userId}`, 
        },
        (payload) => {
          const msg = payload.new;
          console.log(" New message received:", msg);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
    };
  }, [userId]);
}
