import React, { useState, useEffect, useRef } from 'react';
import { roomApi } from '../utils/api.js';
import { formatTime } from '../utils/format.js';
import Avatar from './Avatar.jsx';

export default function MessageSearchModal({ room, members, onClose, onJumpToMessage }) {
  const [keyword, setKeyword] = useState('');
  const [senderId, setSenderId] = useState('');
  const [type, setType] = useState('all');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const searchTimerRef = useRef(null);

  const doSearch = async () => {
    if (!room) return;
    setLoading(true);
    try {
      const res = await roomApi.searchMessages(room.id, { keyword, senderId, type });
      setResults(res.data.messages || []);
    } catch (e) {
      console.error('搜索失败', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      doSearch();
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [keyword, senderId, type, room?.id]);

  const getTypeLabel = (msgType) => {
    switch (msgType) {
      case 'image': return '🖼️ 图片';
      case 'file': return '📄 文件';
      default: return '💬 文字';
    }
  };

  const renderMessagePreview = (msg) => {
    if (msg.is_recalled) {
      return <span style={{ color: '#aaa', fontStyle: 'italic' }}>已撤回</span>;
    }
    if (msg.type === 'text') {
      const content = msg.content || '';
      return content.length > 80 ? content.substring(0, 80) + '...' : content;
    }
    if (msg.type === 'image') {
      return <span style={{ color: '#667eea' }}>{getTypeLabel(msg.type)}</span>;
    }
    if (msg.type === 'file') {
      return <span style={{ color: '#667eea' }}>{getTypeLabel(msg.type)}: {msg.file_name}</span>;
    }
    return msg.content;
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
          padding: 24,
          width: 560,
          maxWidth: '90vw',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0 }}>搜索消息</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: '#999'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="输入关键词搜索..."
            style={{
              flex: 1,
              minWidth: 180,
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: 6,
              fontSize: 13
            }}
          />
          <select
            value={senderId}
            onChange={(e) => setSenderId(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: 6,
              fontSize: 13,
              background: '#fff'
            }}
          >
            <option value="">全部发送人</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.nickname}</option>
            ))}
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: 6,
              fontSize: 13,
              background: '#fff'
            }}
          >
            <option value="all">全部类型</option>
            <option value="text">文字</option>
            <option value="image">图片</option>
            <option value="file">文件</option>
          </select>
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          border: '1px solid #eee',
          borderRadius: 8,
          minHeight: 200
        }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#999', fontSize: 13 }}>
              搜索中...
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#999', fontSize: 13 }}>
              {keyword || senderId || type !== 'all' ? '没有找到匹配的消息' : '输入关键词开始搜索'}
            </div>
          ) : (
            results.map(msg => (
              <div
                key={msg.id}
                onClick={() => {
                  onJumpToMessage(msg);
                  onClose();
                }}
                style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid #f5f5f5',
                  cursor: 'pointer',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start'
                }}
              >
                <Avatar
                  user={{ id: msg.sender_id, nickname: msg.sender_nickname, avatar: msg.sender_avatar }}
                  size={32}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>
                      {msg.sender_nickname}
                    </span>
                    <span style={{ fontSize: 11, color: '#999' }}>
                      {formatTime(msg.created_at)}
                    </span>
                    <span style={{
                      fontSize: 10,
                      padding: '1px 6px',
                      background: '#f0f0f0',
                      color: '#666',
                      borderRadius: 4
                    }}>
                      {getTypeLabel(msg.type)}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#555', wordBreak: 'break-word', lineHeight: 1.5 }}>
                    {renderMessagePreview(msg)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: '#999', textAlign: 'right' }}>
          共 {results.length} 条结果
        </div>
      </div>
    </div>
  );
}
