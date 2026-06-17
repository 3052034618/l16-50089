import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import RoomList from '../components/RoomList.jsx';
import ChatRoom from '../components/ChatRoom.jsx';
import Sidebar from '../components/Sidebar.jsx';
import ConnectionStatus from '../components/ConnectionStatus.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { roomApi } from '../utils/api.js';

export default function Chat() {
  const [currentRoom, setCurrentRoom] = useState(null);
  const [myRooms, setMyRooms] = useState([]);
  const [roomsMessages, setRoomsMessages] = useState({});
  const [roomUnread, setRoomUnread] = useState({});
  const [mentionedMessages, setMentionedMessages] = useState({});
  const { user, logout } = useAuth();
  const { connected, reconnecting, on, off, emit, wasDisconnected, setWasDisconnected } = useSocket();
  const navigate = useNavigate();
  const roomsLoadedRef = useRef(false);
  const currentRoomRef = useRef(null);

  const addMessageToCache = useCallback((roomId, message) => {
    setRoomsMessages(prev => {
      const msgs = prev[roomId] || [];
      if (msgs.some(m => m.id === message.id)) return prev;
      return { ...prev, [roomId]: [...msgs, message] };
    });
  }, []);

  const addMessagesToCache = useCallback((roomId, newMessages) => {
    setRoomsMessages(prev => {
      const msgs = prev[roomId] || [];
      const existingIds = new Set(msgs.map(m => m.id));
      const uniqueNew = newMessages.filter(m => !existingIds.has(m.id));
      if (uniqueNew.length === 0) return prev;
      return { ...prev, [roomId]: [...msgs, ...uniqueNew] };
    });
  }, []);

  const setRoomMessages = useCallback((roomId, messages) => {
    setRoomsMessages(prev => {
      const existing = prev[roomId] || [];
      if (existing.length === 0) {
        return { ...prev, [roomId]: messages };
      }
      const existingIds = new Set(existing.map(m => m.id));
      const uniqueNew = messages.filter(m => !existingIds.has(m.id));
      const allIds = new Set(messages.map(m => m.id));
      const uniqueExisting = existing.filter(m => !allIds.has(m.id));
      return { ...prev, [roomId]: [...messages, ...uniqueExisting] };
    });
  }, []);

  const prependMessages = useCallback((roomId, messages) => {
    setRoomsMessages(prev => {
      const existing = prev[roomId] || [];
      const existingIds = new Set(existing.map(m => m.id));
      const uniqueNew = messages.filter(m => !existingIds.has(m.id));
      return { ...prev, [roomId]: [...uniqueNew, ...existing] };
    });
  }, []);

  const clearRoomUnread = useCallback((roomId) => {
    setRoomUnread(prev => ({ ...prev, [roomId]: { unread: 0, hasMention: false } }));
    setMentionedMessages(prev => {
      const next = { ...prev };
      delete next[roomId];
      return next;
    });
  }, []);

  useEffect(() => {
    currentRoomRef.current = currentRoom?.id || null;
  }, [currentRoom]);

  useEffect(() => {
    loadMyRooms();
  }, []);

  useEffect(() => {
    if (!connected) return;

    const handleNewMessage = (message) => {
      addMessageToCache(message.room_id, message);

      if (message.sender_id === user.id) return;

      const activeRoomId = currentRoomRef.current;
      if (message.room_id !== activeRoomId) {
        setRoomUnread(prev => ({
          ...prev,
          [message.room_id]: {
            unread: (prev[message.room_id]?.unread || 0) + 1,
            hasMention: prev[message.room_id]?.hasMention || (message.mentions || []).includes(user.id)
          }
        }));
        if ((message.mentions || []).includes(user.id)) {
          setMentionedMessages(prev => ({
            ...prev,
            [message.room_id]: [...(prev[message.room_id] || []), message.id]
          }));
        }
      } else {
        if ((message.mentions || []).includes(user.id)) {
          setMentionedMessages(prev => ({
            ...prev,
            [message.room_id]: [...(prev[message.room_id] || []), message.id]
          }));
        }
      }
    };

    const handleMessageRecalled = ({ messageId, roomId }) => {
      setRoomsMessages(prev => {
        const msgs = prev[roomId];
        if (!msgs) return prev;
        return { ...prev, [roomId]: msgs.map(m => m.id === messageId ? { ...m, is_recalled: 1 } : m) };
      });
    };

    on('new_message', handleNewMessage);
    on('message_recalled', handleMessageRecalled);

    return () => {
      off('new_message', handleNewMessage);
      off('message_recalled', handleMessageRecalled);
    };
  }, [connected, user.id, on, off, addMessageToCache]);

  useEffect(() => {
    if (!connected || !wasDisconnected || myRooms.length === 0) return;

    setWasDisconnected(false);
    const roomIds = myRooms.map(r => r.id);
    const activeRoomId = currentRoomRef.current;

    emit('sync_unread', { rooms: roomIds }, (res) => {
      if (!res?.success || !res.data) return;
      Object.entries(res.data).forEach(([roomId, data]) => {
        const unreadMsgs = data.messages || [];
        if (unreadMsgs.length === 0) return;

        addMessagesToCache(roomId, unreadMsgs);

        if (roomId !== activeRoomId) {
          const hasMention = unreadMsgs.some(m => (m.mentions || []).includes(user.id));
          setRoomUnread(prev => ({
            ...prev,
            [roomId]: {
              unread: (prev[roomId]?.unread || 0) + unreadMsgs.length,
              hasMention: prev[roomId]?.hasMention || hasMention
            }
          }));
          if (hasMention) {
            const mentionMsgIds = unreadMsgs
              .filter(m => (m.mentions || []).includes(user.id))
              .map(m => m.id);
            setMentionedMessages(prev => ({
              ...prev,
              [roomId]: [...(prev[roomId] || []), ...mentionMsgIds]
            }));
          }
        }
      });
    });
  }, [connected, wasDisconnected, myRooms, user.id, emit, setWasDisconnected, addMessagesToCache]);

  const loadMyRooms = async () => {
    try {
      const res = await roomApi.getMyRooms();
      setMyRooms(res.data.rooms);
      roomsLoadedRef.current = true;
      if (res.data.rooms.length > 0 && !currentRoom) {
        setCurrentRoom(res.data.rooms[0]);
      }
    } catch (e) {
      console.error('加载房间失败', e);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleSelectRoom = (room) => {
    if (currentRoom && connected) {
      emit('leave_room', { roomId: currentRoom.id });
    }
    setCurrentRoom(room);
    clearRoomUnread(room.id);
  };

  const handleJoinRoom = (room) => {
    setCurrentRoom(room);
    loadMyRooms();
  };

  const handleStartPrivateChat = async (targetUser) => {
    try {
      const res = await roomApi.createPrivateRoom(targetUser.id);
      const privateRoom = res.data.room;
      await loadMyRooms();
      if (currentRoom && connected) {
        emit('leave_room', { roomId: currentRoom.id });
      }
      setCurrentRoom(privateRoom);
      clearRoomUnread(privateRoom.id);
    } catch (e) {
      alert(e.response?.data?.error || '创建私聊失败');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f5f5f5' }}>
      <Sidebar user={user} onLogout={handleLogout} />
      <RoomList
        myRooms={myRooms}
        currentRoom={currentRoom}
        onSelectRoom={handleSelectRoom}
        onRoomCreated={handleJoinRoom}
        onRefresh={loadMyRooms}
        roomUnread={roomUnread}
      />
      {currentRoom ? (
        <ChatRoom
          key={currentRoom.id}
          room={currentRoom}
          currentUser={user}
          connected={connected}
          messages={roomsMessages[currentRoom.id] || []}
          setMessages={(msgs) => setRoomMessages(currentRoom.id, msgs)}
          prependMessages={(msgs) => prependMessages(currentRoom.id, msgs)}
          addMessage={(msg) => addMessageToCache(currentRoom.id, msg)}
          mentionedMessageIds={mentionedMessages[currentRoom.id] || []}
          onMarkRead={() => {
            roomApi.markRead(currentRoom.id);
            clearRoomUnread(currentRoom.id);
          }}
          onStartPrivateChat={handleStartPrivateChat}
        />
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
          请选择或创建一个聊天室
        </div>
      )}
      <ConnectionStatus connected={connected} reconnecting={reconnecting} />
    </div>
  );
}
