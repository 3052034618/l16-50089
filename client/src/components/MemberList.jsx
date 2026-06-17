import React from 'react';
import Avatar from './Avatar.jsx';
import { formatTime } from '../utils/format.js';
import { roomApi } from '../utils/api.js';

export default function MemberList({ members, currentUserId, room, onStartPrivateChat }) {
  const handleStartPrivateChat = async (user) => {
    if (user.id === currentUserId) return;
    if (onStartPrivateChat) {
      onStartPrivateChat(user);
      return;
    }
    try {
      await roomApi.createPrivateRoom(user.id);
      window.location.reload();
    } catch (e) {
      alert(e.response?.data?.error || '创建私聊失败');
    }
  };

  const sortedMembers = [...members].sort((a, b) => {
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    return a.nickname.localeCompare(b.nickname);
  });

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 10 }}>
        全部成员 ({members.length})
      </div>
      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
        {sortedMembers.map(member => (
          <div
            key={member.id}
            onClick={() => handleStartPrivateChat(member)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 4px',
              cursor: member.id !== currentUserId ? 'pointer' : 'default'
            }}
          >
            <Avatar user={member} size={28} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                {member.nickname}
                {member.id === currentUserId && (
                  <span style={{ fontSize: 10, color: '#999' }}>(我)</span>
                )}
              </div>
              <div style={{ fontSize: 10, color: '#999' }}>
                加入于 {formatTime(member.joined_at)}
              </div>
            </div>
            {member.id !== currentUserId && (
              <span style={{ fontSize: 11, color: '#667eea', flexShrink: 0 }}>💬</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
