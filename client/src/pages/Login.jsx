import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register(nickname, password);
      } else {
        await login(nickname, password);
      }
      navigate('/chat', { replace: true });
    } catch (e) {
      setError(e.response?.data?.error || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: 20
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: 40,
        width: '100%',
        maxWidth: 400,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: 8, fontSize: 24, color: '#333' }}>
          多房间实时聊天
        </h1>
        <p style={{ textAlign: 'center', color: '#888', marginBottom: 32, fontSize: 14 }}>
          {isRegister ? '创建新账号' : '登录你的账号'}
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#555' }}>
              昵称
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="请输入昵称"
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid #ddd',
                borderRadius: 8,
                fontSize: 14
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#555' }}>
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid #ddd',
                borderRadius: 8,
                fontSize: 14
              }}
            />
          </div>

          {error && (
            <div style={{
              background: '#fee',
              color: '#c33',
              padding: '10px 12px',
              borderRadius: 6,
              fontSize: 13,
              marginBottom: 20
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 500,
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? '处理中...' : (isRegister ? '注册' : '登录')}
          </button>
        </form>

        <div style={{
          marginTop: 20,
          textAlign: 'center',
          fontSize: 13,
          color: '#666'
        }}>
          {isRegister ? '已有账号？' : '没有账号？'}
          <button
            onClick={() => setIsRegister(!isRegister)}
            style={{ color: '#667eea', marginLeft: 4, fontSize: 13 }}
          >
            {isRegister ? '去登录' : '去注册'}
          </button>
        </div>
      </div>
    </div>
  );
}
