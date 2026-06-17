import React from 'react';

export default function ConnectionStatus({ connected, reconnecting }) {
  if (connected) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      background: reconnecting ? '#f39c12' : '#e74c3c',
      color: '#fff',
      padding: '8px 20px',
      textAlign: 'center',
      fontSize: 13,
      zIndex: 9999
    }}>
      {reconnecting ? '🔄 正在尝试重新连接...' : '❌ 已断开连接'}
    </div>
  );
}
