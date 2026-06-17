import React, { useState } from 'react';
import Avatar from './Avatar.jsx';
import { formatTime, formatFileSize } from '../utils/format.js';

const RECALL_WINDOW_MS = 2 * 60 * 1000;

export default function MessageItem({ message, isSelf, onRecall }) {
  const [showMenu, setShowMenu] = useState(false);
  const canRecall = isSelf && !message.is_recalled &&
    (Date.now() - message.created_at) < RECALL_WINDOW_MS;

  const renderContent = () => {
    if (message.is_recalled) {
      return (
        <div style={{
          padding: '8px 12px',
          background: isSelf ? '#e8f5e9' : '#f5f5f5',
          borderRadius: 8,
          color: '#888',
          fontSize: 13,
          fontStyle: 'italic'
        }}>
          {isSelf ? '你' : message.sender_nickname} 撤回了一条消息
        </div>
      );
    }

    switch (message.type) {
      case 'image':
        return (
          <a href={message.content} target="_blank" rel="noopener noreferrer">
            <img
              src={message.content}
              alt={message.file_name || 'image'}
              style={{
                maxWidth: 300,
                maxHeight: 300,
                borderRadius: 8,
                display: 'block'
              }}
            />
          </a>
        );
      case 'file':
        return (
          <a
            href={message.content}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '12px 16px',
              background: '#fff',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              textDecoration: 'none',
              color: '#333',
              border: '1px solid #eee',
              minWidth: 200
            }}
          >
            <div style={{
              width: 36, height: 36,
              background: '#667eea',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 16
            }}>
              📄
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, wordBreak: 'break-all' }}>{message.file_name}</div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                {formatFileSize(message.file_size || 0)}
              </div>
            </div>
          </a>
        );
      case 'text':
      default:
        return (
          <div style={{
            padding: '10px 14px',
            background: isSelf ? '#667eea' : '#fff',
            color: isSelf ? '#fff' : '#333',
            borderRadius: 8,
            maxWidth: 500,
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
            fontSize: 14,
            lineHeight: 1.5,
            boxShadow: isSelf ? 'none' : '0 1px 2px rgba(0,0,0,0.05)'
          }}>
            {renderTextWithMentions(message.content, message.mentions)}
          </div>
        );
    }
  };

  const renderTextWithMentions = (text, mentions = []) => {
    if (!mentions || mentions.length === 0) return text;
    const parts = text.split(/(@\S+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} style={{
            background: isSelf ? 'rgba(255,255,255,0.25)' : 'rgba(102,126,234,0.1)',
            padding: '1px 4px',
            borderRadius: 3,
            color: isSelf ? '#fff' : '#667eea',
            fontWeight: 500
          }}>
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        marginBottom: 16,
        justifyContent: isSelf ? 'flex-end' : 'flex-start',
        position: 'relative'
      }}
      onMouseEnter={() => canRecall && setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
    >
      {!isSelf && (
        <Avatar
          user={{ id: message.sender_id, nickname: message.sender_nickname, avatar: message.sender_avatar }}
          size={36}
          style={{ marginRight: 10 }}
        />
      )}
      <div style={{ maxWidth: '70%' }}>
        {!isSelf && (
          <div style={{
            fontSize: 12,
            color: '#888',
            marginBottom: 4,
            paddingLeft: 2
          }}>
            {message.sender_nickname}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          {isSelf && showMenu && canRecall && (
            <button
              onClick={() => {
                setShowMenu(false);
                onRecall(message.id);
              }}
              style={{
                padding: '4px 10px',
                background: '#e74c3c',
                color: '#fff',
                borderRadius: 4,
                fontSize: 12
              }}
            >
              撤回
            </button>
          )}
          {renderContent()}
          {!isSelf && showMenu && canRecall && (
            <button
              onClick={() => {
                setShowMenu(false);
                onRecall(message.id);
              }}
              style={{
                padding: '4px 10px',
                background: '#e74c3c',
                color: '#fff',
                borderRadius: 4,
                fontSize: 12
              }}
            >
              撤回
            </button>
          )}
        </div>
        <div style={{
          fontSize: 10,
          color: '#aaa',
          marginTop: 4,
          textAlign: isSelf ? 'right' : 'left'
        }}>
          {formatTime(message.created_at)}
        </div>
      </div>
      {isSelf && (
        <Avatar
          user={{ id: message.sender_id, nickname: message.sender_nickname, avatar: message.sender_avatar }}
          size={36}
          style={{ marginLeft: 10 }}
        />
      )}
    </div>
  );
}
