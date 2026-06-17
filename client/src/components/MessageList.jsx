import React from 'react';
import MessageItem from './MessageItem.jsx';
import { formatTime } from '../utils/format.js';

export default function MessageList({
  messages,
  currentUser,
  members,
  onRecall,
  mentionedMessageIds = [],
  highlightedMessageId = null,
  messageRefs = null
}) {
  const renderWithTimeDividers = () => {
    const result = [];
    let lastDate = null;

    messages.forEach((msg, index) => {
      const msgDate = new Date(msg.created_at).toDateString();
      if (msgDate !== lastDate) {
        lastDate = msgDate;
        result.push(
          <div key={`date-${msg.created_at}-${index}`} style={{
            display: 'flex',
            justifyContent: 'center',
            margin: '16px 0'
          }}>
            <span style={{
              padding: '4px 12px',
              background: '#e0e0e0',
              borderRadius: 12,
              fontSize: 11,
              color: '#666'
            }}>
              {formatTime(msg.created_at).split(' ')[0]}
            </span>
          </div>
        );
      }
      const setRef = messageRefs ? (el) => { messageRefs.current[msg.id] = el; } : undefined;
      result.push(
        <div key={msg.id} ref={setRef}>
          <MessageItem
            message={msg}
            isSelf={msg.sender_id === currentUser.id}
            onRecall={onRecall}
            isMentioned={mentionedMessageIds.includes(msg.id)}
            isHighlighted={highlightedMessageId === msg.id}
          />
        </div>
      );
    });

    return result;
  };

  if (messages.length === 0) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#bbb',
        fontSize: 14
      }}>
        暂无消息，说点什么吧～
      </div>
    );
  }

  return <div>{renderWithTimeDividers()}</div>;
}
