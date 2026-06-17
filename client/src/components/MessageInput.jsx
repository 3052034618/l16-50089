import React, { useState, useRef, useEffect } from 'react';
import { uploadApi } from '../utils/api.js';
import MentionPicker from './MentionPicker.jsx';

export default function MessageInput({ members, currentUser, onSend, onTyping, disabled }) {
  const [text, setText] = useState('');
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionInsertIndex, setMentionInsertIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const handleTextChange = (e) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    setText(newValue);

    const beforeCursor = newValue.substring(0, cursorPos);
    const atMatch = beforeCursor.match(/@([^\s@]*)$/);

    if (atMatch) {
      setShowMentionPicker(true);
      setMentionSearch(atMatch[1]);
      setMentionInsertIndex(cursorPos - atMatch[0].length);
    } else {
      setShowMentionPicker(false);
    }

    if (onTyping) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      onTyping(true);
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    }
  };

  const handleBlur = () => {
    if (onTyping) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      onTyping(false);
    }
    setTimeout(() => setShowMentionPicker(false), 150);
  };

  const handleMentionSelect = (user) => {
    const before = text.substring(0, mentionInsertIndex);
    const after = text.substring(textareaRef.current.selectionStart);
    const mentionText = `@${user.nickname} `;
    const newText = before + mentionText + after;
    setText(newText);
    setShowMentionPicker(false);
    setTimeout(() => {
      if (textareaRef.current) {
        const pos = mentionInsertIndex + mentionText.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pos, pos);
      }
    }, 10);
  };

  const handleSend = () => {
    if (disabled) return;
    const trimmedText = text.trim();
    if (!trimmedText) return;

    const mentionRegex = /@(\S+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(trimmedText)) !== null) {
      const mentionedUser = members.find(m =>
        m.nickname === match[1] && m.id !== currentUser.id
      );
      if (mentionedUser && !mentions.includes(mentionedUser.id)) {
        mentions.push(mentionedUser.id);
      }
    }

    onSend({
      type: 'text',
      content: trimmedText,
      mentions
    });
    setText('');
    if (onTyping) onTyping(false);
  };

  const handleFileUpload = async (e) => {
    if (disabled) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await uploadApi.uploadFile(file);
      onSend({
        type: res.data.type,
        content: res.data.url,
        fileName: res.data.fileName,
        fileSize: res.data.fileSize
      });
    } catch (err) {
      alert('上传失败: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredMembers = members
    .filter(m => m.id !== currentUser.id &&
      m.nickname.toLowerCase().includes(mentionSearch.toLowerCase())
    )
    .slice(0, 8);

  return (
    <div style={{
      padding: '12px 16px',
      background: '#fff',
      borderTop: '1px solid #eee',
      position: 'relative'
    }}>
      {showMentionPicker && filteredMembers.length > 0 && (
        <MentionPicker
          users={filteredMembers}
          onSelect={handleMentionSelect}
        />
      )}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
        <label style={{
          padding: '8px',
          cursor: uploading ? 'wait' : 'pointer',
          color: uploading ? '#ccc' : '#666',
          fontSize: 20
        }}>
          📎
          <input
            type="file"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
            disabled={uploading || disabled}
          />
        </label>
        <label style={{
          padding: '8px',
          cursor: uploading ? 'wait' : 'pointer',
          color: uploading ? '#ccc' : '#666',
          fontSize: 20
        }}>
          🖼️
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
            disabled={uploading || disabled}
          />
        </label>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={disabled ? '正在连接服务器...' : '输入消息，Enter发送，Shift+Enter换行，@提及用户'}
          disabled={disabled}
          rows={1}
          style={{
            flex: 1,
            padding: '10px 14px',
            border: '1px solid #ddd',
            borderRadius: 8,
            resize: 'none',
            fontSize: 14,
            lineHeight: 1.5,
            maxHeight: 120,
            minHeight: 40,
            overflowY: 'auto',
            background: disabled ? '#f5f5f5' : '#fff'
          }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          style={{
            padding: '10px 20px',
            background: (disabled || !text.trim()) ? '#ccc' : '#667eea',
            color: '#fff',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500
          }}
        >
          发送
        </button>
      </div>
      {uploading && (
        <div style={{
          marginTop: 8,
          fontSize: 12,
          color: '#888'
        }}>
          正在上传文件...
        </div>
      )}
    </div>
  );
}
