import React, { useState } from 'react';
import { roomApi } from '../utils/api.js';

export default function JoinRoomModal({ publicRooms, onClose, onJoined }) {
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRoomId) {
      setError('请选择要加入的房间');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await roomApi.joinRoom(selectedRoomId, password);
      onJoined(res.data.room);
    } catch (err) {
      setError(err.response?.data?.error || '加入失败');
      if (password) setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 28,
          width: 400,
          maxWidth: '90vw',
          maxHeight: '80vh',
          overflowY: 'auto'
        }}
      >
        <h3 style={{ marginBottom: 20 }}>加入房间</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>选择房间</label>
            {publicRooms.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 13, border: '1px solid #eee', borderRadius: 6 }}>
                暂无可加入的房间
              </div>
            ) : (
              <div style={{
                border: '1px solid #eee',
                borderRadius: 6,
                maxHeight: 200,
                overflowY: 'auto'
              }}>
                {publicRooms.map(room => (
                  <div
                    key={room.id}
                    onClick={() => {
                      setSelectedRoomId(room.id);
                      setPassword('');
                      setError('');
                    }}
                    style={{
                      padding: '10px 12px',
                      borderBottom: '1px solid #f5f5f5',
                      cursor: 'pointer',
                      background: selectedRoomId === room.id ? '#f0f4ff' : '#fff'
                    }}
                  >
                    <div style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {room.type === 'private' ? '🔒 ' : ''}
                      {room.name}
                      {room.type === 'private' && (
                        <span style={{ fontSize: 10, color: '#e67e22', background: '#fef3e2', padding: '1px 6px', borderRadius: 8 }}>
                          需要密码
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                      {room.member_count} 人
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {selectedRoomId && (() => {
            const room = publicRooms.find(r => r.id === selectedRoomId);
            if (room?.type === 'private') {
              return (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>访问密码</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入房间密码"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: 6,
                      fontSize: 14
                    }}
                  />
                </div>
              );
            }
            return null;
          })()}
          {error && (
            <div style={{
              background: '#ffebee',
              color: '#c62828',
              border: '1px solid #ffcdd2',
              padding: '10px 12px',
              borderRadius: 6,
              fontSize: 13,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <span>❌</span>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                border: '1px solid #ddd',
                borderRadius: 6,
                fontSize: 14
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || !selectedRoomId}
              style={{
                padding: '10px 20px',
                background: '#667eea',
                color: '#fff',
                borderRadius: 6,
                fontSize: 14,
                opacity: (loading || !selectedRoomId) ? 0.7 : 1
              }}
            >
              {loading ? '加入中...' : '加入'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
