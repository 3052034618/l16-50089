import React, { useState } from 'react';
import Avatar from './Avatar.jsx';
import { authApi, roomApi } from '../utils/api.js';
import { useNavigate } from 'react-router-dom';

export default function OnlineUsers({ onlineUsers, members }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await authApi.searchUsers(q);
      setSearchResults(res.data.users.filter(u =>
        !onlineUsers.some(ou => ou.id === u.id)
      ));
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartPrivateChat = async (user) => {
    try {
      const res = await roomApi.createPrivateRoom(user.id);
      window.location.reload();
    } catch (e) {
      alert(e.response?.data?.error || '创建私聊失败');
    }
  };

  const onlineIds = new Set(onlineUsers.map(u => u.id));

  return (
    <div style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 10 }}>
        在线用户 ({onlineUsers.length})
      </div>
      <div style={{ maxHeight: 250, overflowY: 'auto' }}>
        {onlineUsers.map(user => (
          <div
            key={user.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 4px',
              position: 'relative'
            }}
          >
            <div style={{ position: 'relative' }}>
              <Avatar user={user} size={30} />
              <div style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 8,
                height: 8,
                background: '#2ecc71',
                borderRadius: '50%',
                border: '2px solid #fff'
              }} />
            </div>
            <span style={{ fontSize: 13, flex: 1 }}>{user.nickname}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        <button
          onClick={() => setShowSearch(!showSearch)}
          style={{
            width: '100%',
            padding: '8px',
            background: '#f5f5f5',
            borderRadius: 6,
            fontSize: 12,
            color: '#666'
          }}
        >
          {showSearch ? '收起' : '🔍 搜索用户私聊'}
        </button>
        {showSearch && (
          <div style={{ marginTop: 8 }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="输入昵称搜索"
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #ddd',
                borderRadius: 6,
                fontSize: 12
              }}
            />
            {searchResults.length > 0 && (
              <div style={{ marginTop: 8, maxHeight: 200, overflowY: 'auto' }}>
                {searchResults.map(user => (
                  <div
                    key={user.id}
                    onClick={() => handleStartPrivateChat(user)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 4px',
                      cursor: 'pointer'
                    }}
                  >
                    <Avatar user={user} size={28} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13 }}>{user.nickname}</div>
                      <div style={{ fontSize: 10, color: '#999' }}>
                        {onlineIds.has(user.id) ? '在线' : '离线'}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: '#667eea' }}>私聊</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
