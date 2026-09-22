import React, { useState } from "react";
import axios from "axios";

export default function Register({ onLogin, onSwitch }) {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post("http://localhost:5000/api/auth/register", form);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={submit}>
        <h1>Create Account</h1>
        <input placeholder="Username" value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
        <input placeholder="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
        <input placeholder="Password (6+ characters)" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
        {error && <small className="error">{error}</small>}
        <button>Register</button>
        <p>Already have an account? <button type="button" className="link" onClick={onSwitch}>Login</button></p>
      </form>
    </div>
  );
}
