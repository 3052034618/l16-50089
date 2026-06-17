import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext.jsx';
import { roomApi } from '../utils/api.js';
import MessageList from './MessageList.jsx';
import MessageInput from './MessageInput.jsx';
import OnlineUsers from './OnlineUsers.jsx';
import MemberList from './MemberList.jsx';

export default function ChatRoom({ room, currentUser, connected }) {
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [members, setMembers] = useState([]);
  const [showMembers, setShowMembers] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [typingUsers, setTypingUsers] = useState([]);
  const [syncingUnread, setSyncingUnread] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const joinedRef = useRef(false);
  const lastConnectedRef = useRef(connected);
  const { emit, on, off, wasDisconnected, setWasDisconnected } = useSocket();

  const loadHistory = useCallback(async (before = null) => {
    try {
      setLoadingHistory(true);
      const res = await roomApi.getMessages(room.id, 50, before);
      if (before) {
        setMessages(prev => [...res.data.messages, ...prev]);
      } else {
        setMessages(res.data.messages);
      }
      if (res.data.messages.length < 50) {
        setHasMore(false);
      }
    } catch (e) {
      console.error('加载消息失败', e);
    } finally {
      setLoadingHistory(false);
    }
  }, [room.id]);

  const loadMembers = useCallback(async () => {
    try {
      const res = await roomApi.getMembers(room.id);
      setMembers(res.data.members);
    } catch (e) {
      console.error(e);
    }
  }, [room.id]);

  useEffect(() => {
    if (!room) return;
    joinedRef.current = false;
    setMessages([]);
    setHasMore(true);
    loadHistory();
    loadMembers();

    return () => {
      if (connected && joinedRef.current) {
        emit('leave_room', { roomId: room.id });
      }
    };
  }, [room]);

  useEffect(() => {
    if (!connected || !room) return;

    const handleJoined = ({ onlineUsers: users }) => {
      setOnlineUsers(users);
    };

    const handleUserOnline = ({ onlineUsers: users }) => {
      setOnlineUsers(users);
    };

    const handleUserOffline = ({ onlineUsers: users }) => {
      setOnlineUsers(users);
    };

    const handleNewMessage = (message) => {
      if (message.room_id !== room.id) return;
      setMessages(prev => {
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
      scrollToBottom();
    };

    const handleMessageRecalled = ({ messageId, message }) => {
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, is_recalled: 1 } : m
      ));
    };

    const handleUserTyping = ({ userId, nickname, isTyping }) => {
      setTypingUsers(prev => {
        const existing = prev.find(u => u.userId === userId);
        if (isTyping) {
          if (existing) return prev;
          return [...prev, { userId, nickname }];
        } else {
          return prev.filter(u => u.userId !== userId);
        }
      });
    };

    if (!joinedRef.current) {
      joinedRef.current = true;
      emit('join_room', { roomId: room.id });
    }

    on('joined_room', handleJoined);
    on('user_online', handleUserOnline);
    on('user_offline', handleUserOffline);
    on('new_message', handleNewMessage);
    on('message_recalled', handleMessageRecalled);
    on('user_typing', handleUserTyping);

    return () => {
      off('joined_room', handleJoined);
      off('user_online', handleUserOnline);
      off('user_offline', handleUserOffline);
      off('new_message', handleNewMessage);
      off('message_recalled', handleMessageRecalled);
      off('user_typing', handleUserTyping);
    };
  }, [connected, room, emit, on, off]);

  useEffect(() => {
    if (!lastConnectedRef.current && connected && room && wasDisconnected) {
      joinedRef.current = false;
      emit('join_room', { roomId: room.id });

      setSyncingUnread(true);
      emit('sync_unread', { rooms: [room.id] }, (res) => {
        setSyncingUnread(false);
        if (res?.success && res.data?.[room.id]) {
          const unreadMsgs = res.data[room.id].messages || [];
          if (unreadMsgs.length > 0) {
            setMessages(prev => {
              const existingIds = new Set(prev.map(m => m.id));
              const newMsgs = unreadMsgs.filter(m => !existingIds.has(m.id));
              return [...prev, ...newMsgs];
            });
            scrollToBottom();
          }
        }
      });
      loadMembers();
    }
    lastConnectedRef.current = connected;
  }, [connected, room, wasDisconnected, emit, loadMembers]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
  };

  const handleScroll = (e) => {
    const { scrollTop } = e.target;
    if (scrollTop === 0 && hasMore && !loadingHistory && messages.length > 0) {
      const firstMessage = messages[0];
      if (firstMessage) {
        loadHistory(firstMessage.created_at);
      }
    }
  };

  const handleSendMessage = ({ type, content, fileName, fileSize, mentions }) => {
    if (!connected) {
      alert('未连接到服务器，请稍后重试');
      return;
    }
    emit('send_message', {
      roomId: room.id,
      type,
      content,
      fileName,
      fileSize,
      mentions
    }, (res) => {
      if (!res?.success) {
        alert(res?.error || '发送失败');
      }
    });
  };

  const handleRecall = (messageId) => {
    emit('recall_message', { messageId, roomId: room.id }, (res) => {
      if (!res?.success) {
        alert(res?.error || '撤回失败');
      }
    });
  };

  const handleTyping = (isTyping) => {
    if (connected) {
      emit('typing', { roomId: room.id, isTyping });
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{
        padding: '14px 20px',
        background: '#fff',
        borderBottom: '1px solid #eee',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 500 }}>
            {room.type === 'private' ? '🔒 ' : ''}
            {room.name}
          </div>
          <div style={{ fontSize: 12, color: '#999' }}>
            {onlineUsers.length} 人在线
          </div>
        </div>
        <button
          onClick={() => setShowMembers(!showMembers)}
          style={{
            padding: '6px 12px',
            background: '#f5f5f5',
            borderRadius: 4,
            fontSize: 12,
            color: '#555'
          }}
        >
          👥 {members.length}
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            background: '#f7f9fc'
          }}
        >
          {loadingHistory && messages.length > 0 && (
            <div style={{ textAlign: 'center', padding: '10px', color: '#999', fontSize: 12 }}>
              加载更多...
            </div>
          )}
          <MessageList
            messages={messages}
            currentUser={currentUser}
            members={members}
            onRecall={handleRecall}
          />
          <div ref={messagesEndRef} />
          {typingUsers.length > 0 && (
            <div style={{
              padding: '8px 12px',
              fontSize: 12,
              color: '#888',
              fontStyle: 'italic'
            }}>
              {typingUsers.map(u => u.nickname).join('、')} 正在输入...
            </div>
          )}
        </div>

        {showMembers && (
          <div style={{ width: 240, borderLeft: '1px solid #eee', background: '#fff' }}>
            <OnlineUsers onlineUsers={onlineUsers} members={members} />
            <MemberList members={members} currentUserId={currentUser.id} room={room} />
          </div>
        )}
      </div>

      <MessageInput
        members={members}
        currentUser={currentUser}
        onSend={handleSendMessage}
        onTyping={handleTyping}
        disabled={!connected}
      />
    </div>
  );
}
