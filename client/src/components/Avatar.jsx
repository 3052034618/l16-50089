import React from 'react';
import { generateAvatarColor } from '../utils/format.js';

export default function Avatar({ user, size = 40, style = {} }) {
  if (!user) return null;
  const { avatar, nickname } = user;
  const initial = nickname ? nickname.charAt(0).toUpperCase() : '?';

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: avatar ? 'transparent' : generateAvatarColor(nickname),
        color: '#fff',
        fontWeight: 'bold',
        fontSize: size * 0.4,
        flexShrink: 0,
        ...style
      }}
    >
      {avatar ? (
        <img
          src={avatar}
          alt={nickname}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        initial
      )}
    </div>
  );
}
