import React, { useState } from 'react';
import { roomApi } from '../utils/api.js';

export default function CreateRoomModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('public');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('请输入房间名称');
      return;
    }
    if (type === 'private' && !password) {
      setError('私有房间必须设置密码');
      return;
    }
    setLoading(true);
    try {
      const res = await roomApi.createRoom(name.trim(), type, password);
      onCreated(res.data.room);
    } catch (err) {
      setError(err.response?.data?.error || '创建失败');
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
          maxWidth: '90vw'
        }}
      >
        <h3 style={{ marginBottom: 20 }}>创建房间</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>房间名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入房间名称"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: 6,
                fontSize: 14
              }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>房间类型</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: 6,
                fontSize: 14,
                background: '#fff'
              }}
            >
              <option value="public">公开房间（无需密码）</option>
              <option value="private">私有房间（需要密码）</option>
            </select>
          </div>
          {type === 'private' && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>访问密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请设置访问密码"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  fontSize: 14
                }}
              />
            </div>
          )}
          {error && (
            <div style={{ color: '#c33', fontSize: 13, marginBottom: 16 }}>{error}</div>
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
              disabled={loading}
              style={{
                padding: '10px 20px',
                background: '#667eea',
                color: '#fff',
                borderRadius: 6,
                fontSize: 14,
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
