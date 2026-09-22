import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Sidebar from "./Sidebar";

export default function Chat({ user, socket, onLogout, API }) {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const bottom = useRef();

  useEffect(() => {
    axios.get(`${API}/api/auth/users`).then(r => setUsers(r.data));
    const receive = msg => {
      if (selected && (msg.sender._id === selected._id || msg.receiver._id === selected._id))
        setMessages(m => [...m, msg]);
    };
    const sent = msg => setMessages(m => [...m, msg]);
    const status = ({ userId, online }) =>
      setUsers(us => us.map(u => u._id === userId ? {...u, online} : u));
    const type = ({ userId }) => {
      if (selected?._id === userId) setTyping(true);
    };
    const stop = ({ userId }) => {
      if (selected?._id === userId) setTyping(false);
    };

    socket.on("receive_message", receive);
    socket.on("message_sent", sent);
    socket.on("user_status", status);
    socket.on("typing", type);
    socket.on("stop_typing", stop);
    return () => {
      socket.off("receive_message", receive);
      socket.off("message_sent", sent);
      socket.off("user_status", status);
      socket.off("typing", type);
      socket.off("stop_typing", stop);
    };
  }, [socket, selected, API]);

  useEffect(() => {
    if (!selected) return;
    axios.get(`${API}/api/messages/${selected._id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    }).then(r => setMessages(r.data));
  }, [selected, API]);

  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  const send = e => {
    e.preventDefault();
    if (!text.trim() || !selected) return;
    socket.emit("send_message", { receiverId: selected._id, text });
    socket.emit("stop_typing", { receiverId: selected._id });
    setText("");
  };

  const change = e => {
    setText(e.target.value);
    if (selected) {
      socket.emit("typing", { receiverId: selected._id });
      clearTimeout(window.chatTypingTimer);
      window.chatTypingTimer = setTimeout(() => socket.emit("stop_typing", { receiverId: selected._id }), 800);
    }
  };

  return (
    <div className="app">
      <Sidebar users={users} currentUser={user} selected={selected} setSelected={setSelected} onLogout={onLogout} />
      <main className="chat">
        {!selected ? (
          <div className="empty"><h2>Welcome to ChatNow 👋</h2><p>Select a user to start chatting.</p></div>
        ) : (
          <>
            <header className="chat-header">
              <div className="avatar">{selected.username[0].toUpperCase()}</div>
              <div><b>{selected.username}</b><span>{selected.online ? "Online" : "Offline"}</span></div>
            </header>
            <section className="messages">
              {messages.map(m => (
                <div key={m._id} className={`message ${m.sender._id === user.id ? "mine" : ""}`}>
                  <div>{m.text}</div>
                  <small>{new Date(m.createdAt).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})}</small>
                </div>
              ))}
              {typing && <div className="typing">{selected.username} is typing...</div>}
              <div ref={bottom} />
            </section>
            <form className="composer" onSubmit={send}>
              <input value={text} onChange={change} placeholder="Type a message..." />
              <button>Send</button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
