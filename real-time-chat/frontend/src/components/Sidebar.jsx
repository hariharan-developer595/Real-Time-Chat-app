import React from "react";

export default function Sidebar({
  users,
  currentUser,
  selected,
  setSelected,
  onLogout
}) {
  return (
    <aside className="sidebar">
      <div className="profile">
        <div className="avatar">
          {currentUser.username[0].toUpperCase()}
        </div>

        <div>
          <b>{currentUser.username}</b>
          <span>My account</span>
        </div>

        <button className="logout" onClick={onLogout}>
          Logout
        </button>
      </div>

      <h3>Users</h3>

      {users
        .filter(u => u._id !== currentUser.id)
        .map(u => (
          <div
            key={u._id}
            className={`user ${
              selected?._id === u._id ? "selected" : ""
            }`}
            onClick={() => setSelected(u)}
          >
            <div className="avatar small">
              {u.username[0].toUpperCase()}
            </div>

            <div className="user-info">
              <b>{u.username}</b>
              <span className={u.online ? "online" : ""}>
                {u.online ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        ))}
    </aside>
  );
}