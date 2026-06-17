import React from 'react';
import Avatar from './Avatar.jsx';

export default function MentionPicker({ users, onSelect }) {
  return (
    <div style={{
      position: 'absolute',
      bottom: '100%',
      left: 70,
      right: 100,
      marginBottom: 4,
      background: '#fff',
      border: '1px solid #eee',
      borderRadius: 8,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      maxHeight: 250,
      overflowY: 'auto',
      zIndex: 100
    }}>
      {users.map(user => (
        <div
          key={user.id}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(user);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 12px',
            cursor: 'pointer'
          }}
        >
          <Avatar user={user} size={28} />
          <span style={{ fontSize: 13 }}>{user.nickname}</span>
        </div>
      ))}
    </div>
  );
}
