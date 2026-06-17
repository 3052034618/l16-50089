import React, { useState, useEffect } from 'react';
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
  const { user, logout } = useAuth();
  const { connected, reconnecting, on, off, emit } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    loadMyRooms();
  }, []);

  useEffect(() => {
    if (!connected || !currentRoom) return;

    const handleNewMessage = (message) => {
      if (message.room_id === currentRoom.id) {
        return;
      }
    };

    const handleMention = ({ message, roomId }) => {
      console.log('收到@通知:', message, roomId);
    };

    on('new_message', handleNewMessage);
    on('mention_notification', handleMention);

    return () => {
      off('new_message', handleNewMessage);
      off('mention_notification', handleMention);
    };
  }, [connected, currentRoom, on, off]);

  const loadMyRooms = async () => {
    try {
      const res = await roomApi.getMyRooms();
      setMyRooms(res.data.rooms);
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
  };

  const handleJoinRoom = (room) => {
    setCurrentRoom(room);
    loadMyRooms();
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: '#f5f5f5'
    }}>
      <Sidebar
        user={user}
        onLogout={handleLogout}
      />
      <RoomList
        myRooms={myRooms}
        currentRoom={currentRoom}
        onSelectRoom={handleSelectRoom}
        onRoomCreated={handleJoinRoom}
        onRefresh={loadMyRooms}
      />
      {currentRoom ? (
        <ChatRoom
          key={currentRoom.id}
          room={currentRoom}
          currentUser={user}
          connected={connected}
        />
      ) : (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#999'
        }}>
          请选择或创建一个聊天室
        </div>
      )}
      <ConnectionStatus connected={connected} reconnecting={reconnecting} />
    </div>
  );
}
