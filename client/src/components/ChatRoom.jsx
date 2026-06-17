import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext.jsx';
import { roomApi } from '../utils/api.js';
import MessageList from './MessageList.jsx';
import MessageInput from './MessageInput.jsx';
import OnlineUsers from './OnlineUsers.jsx';
import MemberList from './MemberList.jsx';
import MessageSearchModal from './MessageSearchModal.jsx';

export default function ChatRoom({
  room,
  currentUser,
  connected,
  messages,
  setMessages,
  prependMessages,
  addMessage,
  mentionedMessageIds,
  onMarkRead
}) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [members, setMembers] = useState([]);
  const [showMembers, setShowMembers] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [typingUsers, setTypingUsers] = useState([]);
  const [syncingUnread, setSyncingUnread] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const messageRefs = useRef({});
  const joinedRef = useRef(false);
  const lastConnectedRef = useRef(connected);
  const initialLoadedRef = useRef(false);
  const { emit, on, off, wasDisconnected, setWasDisconnected } = useSocket();

  const loadHistory = useCallback(async (before = null) => {
    try {
      setLoadingHistory(true);
      const res = await roomApi.getMessages(room.id, 50, before);
      if (before) {
        prependMessages(res.data.messages);
      } else {
        setMessages(res.data.messages);
        initialLoadedRef.current = true;
      }
      if (res.data.messages.length < 50) {
        setHasMore(false);
      }
    } catch (e) {
      console.error('加载消息失败', e);
    } finally {
      setLoadingHistory(false);
    }
  }, [room.id, prependMessages, setMessages]);

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
    initialLoadedRef.current = false;
    setHasMore(true);
    setHighlightedMessageId(null);
    loadHistory();
    loadMembers();
    onMarkRead();

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
      if (!initialLoadedRef.current) return;
      addMessage(message);
      setTimeout(() => {
        if (messagesContainerRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
          if (scrollHeight - scrollTop - clientHeight < 100) {
            scrollToBottom();
          }
        }
      }, 50);
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
  }, [connected, room, emit, on, off, addMessage, setMessages]);

  useEffect(() => {
    if (!lastConnectedRef.current && connected && room && wasDisconnected) {
      joinedRef.current = false;
      emit('join_room', { roomId: room.id });

      setSyncingUnread(true);
      emit('sync_unread', { rooms: [room.id] }, (res) => {
        setSyncingUnread(false);
        if (res?.success && res.data?.[room.id]) {
          const unreadMsgs = res.data[room.id].messages || [];
          if (unreadMsgs.length > 0 && initialLoadedRef.current) {
            unreadMsgs.forEach(msg => {
              addMessage(msg);
            });
            scrollToBottom();
          }
        }
      });
      loadMembers();
    }
    lastConnectedRef.current = connected;
  }, [connected, room, wasDisconnected, emit, loadMembers, addMessage]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
  };

  const ensureMessageLoaded = async (targetMessage) => {
    const allLoaded = messages;
    if (allLoaded.some(m => m.id === targetMessage.id)) {
      return true;
    }

    const targetTime = targetMessage.created_at;
    const firstMsg = allLoaded[0];
    const lastMsg = allLoaded[allLoaded.length - 1];

    if (firstMsg && targetTime < firstMsg.created_at) {
      let currentBefore = firstMsg.created_at;
      while (currentBefore > targetTime) {
        const res = await roomApi.getMessages(room.id, 50, currentBefore);
        if (res.data.messages.length === 0) break;
        prependMessages(res.data.messages);
        const oldestNew = res.data.messages[0];
        if (!oldestNew || oldestNew.created_at <= targetTime) break;
        currentBefore = oldestNew.created_at;
        if (res.data.messages.length < 50) break;
      }
    } else if (lastMsg && targetTime > lastMsg.created_at) {
      await loadHistory();
    }
    return true;
  };

  const handleJumpToMessage = async (targetMessage) => {
    await ensureMessageLoaded(targetMessage);

    setTimeout(() => {
      setHighlightedMessageId(targetMessage.id);
      const targetEl = messageRefs.current[targetMessage.id];
      if (targetEl && messagesContainerRef.current) {
        const container = messagesContainerRef.current;
        const targetTop = targetEl.offsetTop;
        container.scrollTo({
          top: targetTop - container.clientHeight / 2 + targetEl.offsetHeight / 2,
          behavior: 'smooth'
        });
      }
      setTimeout(() => setHighlightedMessageId(null), 3000);
    }, 100);
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

  const getRoomDisplayName = () => {
    if (room.is_private_chat && room.other_user) {
      return room.other_user.nickname;
    }
    return room.display_name || room.name;
  };

  const getRoomIcon = () => {
    if (room.is_private_chat) return '💬 ';
    if (room.type === 'private') return '🔒 ';
    return '👥 ';
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
            {getRoomIcon()}
            {getRoomDisplayName()}
          </div>
          <div style={{ fontSize: 12, color: '#999' }}>
            {onlineUsers.length} 人在线
          </div>
          {room.type === 'private' && !room.is_private_chat && (
            <span style={{
              fontSize: 10,
              padding: '2px 8px',
              background: '#fef3e2',
              color: '#e67e22',
              borderRadius: 8
            }}>
              加密群
            </span>
          )}
          {room.is_private_chat && (
            <span style={{
              fontSize: 10,
              padding: '2px 8px',
              background: '#e8f5e9',
              color: '#27ae60',
              borderRadius: 8
            }}>
              私聊
            </span>
          )}
          {syncingUnread && (
            <span style={{
              fontSize: 11,
              color: '#667eea',
              background: '#f0f4ff',
              padding: '2px 8px',
              borderRadius: 10
            }}>
              同步中...
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setShowSearch(true)}
            style={{
              padding: '6px 12px',
              background: '#f5f5f5',
              borderRadius: 4,
              fontSize: 12,
              color: '#555'
            }}
          >
            🔍 搜索
          </button>
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
            mentionedMessageIds={mentionedMessageIds}
            highlightedMessageId={highlightedMessageId}
            messageRefs={messageRefs}
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

      {showSearch && (
        <MessageSearchModal
          room={room}
          members={members}
          onClose={() => setShowSearch(false)}
          onJumpToMessage={handleJumpToMessage}
        />
      )}
    </div>
  );
}
