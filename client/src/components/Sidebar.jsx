import React from 'react';
import Avatar from './Avatar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useState, useEffect } from 'react';
import { authApi } from '../utils/api.js';

export default function Sidebar({ user, onLogout }) {
  const { updateUser } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [newNickname, setNewNickname] = useState(user?.nickname || '');
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setNewNickname(user?.nickname || '');
  }, [user]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await authApi.uploadAvatar(file);
      updateUser(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || '上传失败');
    }
  };

  const handleSaveNickname = async () => {
    try {
      setError('');
      const res = await authApi.updateProfile(newNickname);
      updateUser(res.data.user);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.error || '更新失败');
    }
  };

  return (
    <div style={{
      width: 220,
      background: '#2c3e50',
      color: '#ecf0f1',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ padding: 20, borderBottom: '1px solid #34495e' }}>
        <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>
          💬 聊天室
        </div>
        {user && (
          <div
            onClick={() => setShowProfile(!showProfile)}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <Avatar user={user} size={44} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{user.nickname}</div>
              <div style={{ fontSize: 11, color: '#95a5a6' }}>点击编辑资料</div>
            </div>
          </div>
        )}
      </div>

      {showProfile && user && (
        <div style={{ padding: 15, borderBottom: '1px solid #34495e', fontSize: 13 }}>
          <div style={{ marginBottom: 12, textAlign: 'center' }}>
            <label style={{ cursor: 'pointer' }}>
              <Avatar user={user} size={60} style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: 11, color: '#95a5a6' }}>点击更换头像</div>
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarUpload}
              />
            </label>
          </div>
          {editing ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                style={{ flex: 1, padding: '4px 8px', borderRadius: 4, border: 'none', fontSize: 12 }}
              />
              <button
                onClick={handleSaveNickname}
                style={{ padding: '4px 10px', background: '#3498db', color: '#fff', borderRadius: 4, fontSize: 12 }}
              >
                保存
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              style={{ width: '100%', padding: '6px', background: '#34495e', color: '#fff', borderRadius: 4, fontSize: 12 }}
            >
              修改昵称
            </button>
          )}
          {error && <div style={{ color: '#e74c3c', fontSize: 11, marginTop: 8 }}>{error}</div>}
        </div>
      )}

      <div style={{ flex: 1 }} />

      <button
        onClick={onLogout}
        style={{
          padding: '14px 20px',
          color: '#ecf0f1',
          borderTop: '1px solid #34495e',
          fontSize: 13,
          textAlign: 'left'
        }}
      >
          退出登录
        </button>
      </div>
  );
}
