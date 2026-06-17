import React, { useState, useEffect } from 'react';
import { roomApi } from '../utils/api.js';
import { formatTime } from '../utils/format.js';
import CreateRoomModal from './CreateRoomModal.jsx';
import JoinRoomModal from './JoinRoomModal.jsx';

export default function RoomList({ myRooms, currentRoom, onSelectRoom, onRoomCreated, onRefresh }) {
  const [publicRooms, setPublicRooms] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [tab, setTab] = useState('my');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPublicRooms();
  }, []);

  const loadPublicRooms = async () => {
    try {
      const res = await roomApi.getPublicRooms();
      setPublicRooms(res.data.rooms);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreated = (room) => {
    setShowCreate(false);
    onRoomCreated(room);
    loadPublicRooms();
  };

  const handleJoined = (room) => {
    setShowJoin(false);
    onRoomCreated(room);
    loadPublicRooms();
  };

  const displayRooms = tab === 'my' ? myRooms : publicRooms;

  return (
    <div style={{
      width: 280,
      background: '#fff',
      borderRight: '1px solid #eee',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #eee',
        display: 'flex',
        gap: 8
      }}>
        <button
          onClick={() => setTab('my')}
          style={{
            flex: 1,
            padding: '8px',
            background: tab === 'my' ? '#667eea' : '#f5f5f5',
            color: tab === 'my' ? '#fff' : '#555',
            borderRadius: 6,
            fontSize: 13
          }}
        >
          我的房间
        </button>
        <button
          onClick={() => setTab('public')}
          style={{
            flex: 1,
            padding: '8px',
            background: tab === 'public' ? '#667eea' : '#f5f5f5',
            color: tab === 'public' ? '#fff' : '#555',
            borderRadius: 6,
            fontSize: 13
          }}
        >
          公开房间
        </button>
      </div>

      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #eee',
        display: 'flex',
        gap: 8
      }}>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            flex: 1,
            padding: '8px',
            background: '#27ae60',
            color: '#fff',
            borderRadius: 6,
            fontSize: 13
          }}
        >
          + 创建房间
        </button>
        {tab === 'public' && (
          <button
            onClick={() => setShowJoin(true)}
            style={{
              flex: 1,
              padding: '8px',
              background: '#3498db',
              color: '#fff',
              borderRadius: 6,
              fontSize: 13
            }}
          >
            加入房间
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {displayRooms.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#999', fontSize: 13 }}>
            暂无房间
          </div>
        ) : (
          displayRooms.map(room => {
            const isMyRoom = myRooms.some(r => r.id === room.id);
            const isActive = currentRoom?.id === room.id;
            return (
              <div
                key={room.id}
                onClick={() => {
                  if (isMyRoom) {
                    onSelectRoom(room);
                  } else {
                    setShowJoin(true);
                  }
                }}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #f5f5f5',
                  cursor: 'pointer',
                  background: isActive ? '#f0f4ff' : isMyRoom ? '#fff' : '#fafafa'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 500, fontSize: 14, color: '#333' }}>
                    {room.type === 'private' ? '🔒 ' : ''}
                    {room.name}
                  </div>
                  {!isMyRoom && (
                    <span style={{ fontSize: 11, color: '#999' }}>未加入</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                  {room.member_count} 人 · {formatTime(room.created_at)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {showCreate && (
        <CreateRoomModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
      {showJoin && (
        <JoinRoomModal
          publicRooms={publicRooms.filter(r => !myRooms.some(mr => mr.id === r.id))}
          onClose={() => setShowJoin(false)}
          onJoined={handleJoined}
        />
      )}
    </div>
  );
}
