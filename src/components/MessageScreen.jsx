import React, { useEffect, useState,useRef  } from "react";
import { useLocation, useParams } from "react-router-dom";
import supabase from "../supabaseClient";
import "../styles/MessageScreen.css";

const MessageScreen = () => {
  const { id: hireRequestId } = useParams(); 
  const location = useLocation();
  const request = location.state?.request;

  const [taskId, setTaskId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [user, setUser] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
  if (chatEndRef.current) {
    chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }
}, [messages]);


  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        setUser(data.user);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchTaskId = async () => {
      const { data, error } = await supabase
        .from("hire_requests")
        .select("task_id")
        .eq("id", hireRequestId)
        .single();

      if (!error && data) {
        setTaskId(data.task_id);
      } else {
        console.error(" Error fetching task_id:", error?.message);
      }
    };
    fetchTaskId();
  }, [hireRequestId]);

  useEffect(() => {
    if (!taskId || !request || !user) return;

    const otherUserId =
      request.poster_id === user.id ? request.seeker_id : request.poster_id;

    const fetchMessages = async () => {
     const { data, error } = await supabase
  .from("messages")
  .select(`
    *,
    sender:sender_id (id, first_name, last_name, is_active),
    receiver:receiver_id (id, first_name, last_name, is_active)
  `)
  .eq("task_id", taskId)
  .or(
    `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
  )
  .order("created_at", { ascending: true });

if (!error) {
  const activeMessages = data.filter(
    msg => msg.sender?.is_active && msg.receiver?.is_active
  );
  setMessages(activeMessages || []);
} else {
  console.error(" Error fetching messages:", error.message);
}

    };
     
    fetchMessages();
  }, [taskId, request, user]);

  useEffect(() => {
    if (!taskId) return;

    const channel = supabase
      .channel(`messages-task-${taskId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `task_id=eq.${taskId}`,
        },
        (payload) => {
          const newMsg = payload.new;
          console.log("📩 New message received:", newMsg);
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId]);


const sendMessage = async () => {
  if (!newMessage.trim() || !taskId || !user) return;

  const receiverId =
    request.poster_id === user.id ? request.seeker_id : request.poster_id;

  const { data: msgData, error: msgError } = await supabase
    .from("messages")
    .insert([
      {
        task_id: taskId,
        sender_id: user.id,
        receiver_id: receiverId,
        message: newMessage,
      },
    ])
    .select("id, sender_id, receiver_id, message, created_at") 
    .single();

  if (msgError) {
    console.error(" Error sending message:", msgError.message);
    return;
  }

  console.log(" Message inserted:", msgData);

  const { error: notifError } = await supabase.from("notifications").insert([
    {
      user_id: receiverId,
      message: `New message from ${user.email || "a user"}`,
      read: false,
      created_at: new Date().toISOString(),
      related_id: hireRequestId, 
      status: "message",
    },
  ]);

  if (notifError) {
    console.error(" Error creating notification:", notifError.message);
  } else {
    console.log(" Notification saved successfully!");
  }

  setNewMessage("");
};

  return (
    <div className="chat-wrapper">
      <div className="chat-container">
        <div className="chat-header">
          <h2>Task Chat </h2>
        </div>

        <div className="chat-box">
          {messages.length === 0 ? (
            <p className="no-messages">No messages yet. Start the conversation!</p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`message-bubble ${
                  msg.sender_id === user?.id ? "sent" : "received"
                }`}
              >
                <span className="message-text">{msg.message}</span>
                <span className="message-time">
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))
          )}
      <div ref={chatEndRef} />

        </div>

        <div className="chat-input-container">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="chat-input"
          />
          <button
            onClick={sendMessage}
            disabled={!taskId || !user}
            className="chat-send-btn"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageScreen;
