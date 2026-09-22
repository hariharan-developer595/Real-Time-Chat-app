import React, { useState, useEffect } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import Login from "./components/Login";
import Register from "./components/Register";
import Chat from "./components/Chat";

const API = "http://localhost:5000";
const socket = io(API, { autoConnect: false });

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "null"));
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    if (!user) return;
    socket.auth = { token: localStorage.getItem("token") };
    socket.connect();
    return () => socket.disconnect();
  }, [user]);

  const logout = async () => {
    socket.disconnect();
    localStorage.clear();
    setUser(null);
  };

  if (!user) {
    return showRegister
      ? <Register onLogin={setUser} onSwitch={() => setShowRegister(false)} />
      : <Login onLogin={setUser} onSwitch={() => setShowRegister(true)} />;
  }

  return <Chat user={user} socket={socket} onLogout={logout} API={API} />;
}

export { axios };
