import React, { useState, useEffect } from 'react';
import { roomApi } from '../utils/api.js';
import { formatTime } from '../utils/format.js';
import CreateRoomModal from './CreateRoomModal.jsx';
import JoinRoomModal from './JoinRoomModal.jsx';
import Avatar from './Avatar.jsx';

export default function RoomList({ myRooms, currentRoom, onSelectRoom, onRoomCreated, onRefresh, roomUnread = {} }) {
  const [publicRooms, setPublicRooms] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [tab, setTab] = useState('my');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tab === 'public') {
      loadPublicRooms();
    }
  }, [tab]);

  const loadPublicRooms = async () => {
    try {
      setLoading(true);
      const res = await roomApi.getPublicRooms();
      setPublicRooms(res.data.rooms);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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

  const getRoomIcon = (room) => {
    if (room.is_private_chat) return null;
    if (room.type === 'private') return '🔒';
    return '👥';
  };

  const getRoomDisplayName = (room) => {
    if (room.is_private_chat && room.other_user) {
      return room.other_user.nickname;
    }
    return room.display_name || room.name;
  };

  const getRoomTypeLabel = (room) => {
    if (room.is_private_chat) return '私聊';
    if (room.type === 'private') return '加密群';
    return '公开群';
  };

  const getRoomTypeColor = (room) => {
    if (room.is_private_chat) return { bg: '#e8f5e9', color: '#27ae60' };
    if (room.type === 'private') return { bg: '#fef3e2', color: '#e67e22' };
    return { bg: '#e3f2fd', color: '#1976d2' };
  };

  const renderRoomItem = (room) => {
    const isMyRoom = myRooms.some(r => r.id === room.id);
    const isActive = currentRoom?.id === room.id;
    const unreadInfo = roomUnread[room.id] || { unread: 0, hasMention: false };
    const typeStyle = getRoomTypeColor(room);
    const icon = getRoomIcon(room);
    const displayName = getRoomDisplayName(room);
    const typeLabel = getRoomTypeLabel(room);

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
          background: isActive ? '#f0f4ff' : isMyRoom ? '#fff' : '#fafafa',
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {room.is_private_chat && room.other_user ? (
            <Avatar
              user={room.other_user}
              size={36}
              style={{ flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: typeStyle.bg,
              color: typeStyle.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              flexShrink: 0
            }}>
              {icon}
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{
                fontWeight: 500,
                fontSize: 14,
                color: '#333',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
                minWidth: 0
              }}>
                {displayName}
              </span>
              {tab === 'public' && !isMyRoom && (
                <span style={{
                  fontSize: 10,
                  padding: '1px 6px',
                  background: typeStyle.bg,
                  color: typeStyle.color,
                  borderRadius: 6,
                  flexShrink: 0
                }}>
                  {typeLabel}
                </span>
              )}
              {tab === 'public' && !isMyRoom && room.type === 'private' && !room.is_private_chat && (
                <span style={{
                  fontSize: 10,
                  padding: '1px 6px',
                  background: '#fef3e2',
                  color: '#e67e22',
                  borderRadius: 6,
                  flexShrink: 0
                }}>
                  需密码
                </span>
              )}
              {isMyRoom && unreadInfo.hasMention && (
                <span style={{
                  background: '#e74c3c',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 'bold',
                  padding: '1px 5px',
                  borderRadius: 8,
                  minWidth: 16,
                  textAlign: 'center',
                  flexShrink: 0
                }}>
                  @
                </span>
              )}
              {isMyRoom && unreadInfo.unread > 0 && !unreadInfo.hasMention && (
                <span style={{
                  background: '#e74c3c',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 'bold',
                  padding: '2px 6px',
                  borderRadius: 10,
                  minWidth: 18,
                  textAlign: 'center',
                  flexShrink: 0
                }}>
                  {unreadInfo.unread > 99 ? '99+' : unreadInfo.unread}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: '#999' }}>
                {isMyRoom
                  ? (room.is_private_chat ? '私聊' : `${room.member_count} 人`)
                  : `未加入 · ${room.member_count} 人`}
              </span>
              <span style={{ fontSize: 11, color: '#ccc' }}>·</span>
              <span style={{ fontSize: 11, color: '#999' }}>
                {formatTime(room.created_at)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#999', fontSize: 13 }}>
            加载中...
          </div>
        ) : displayRooms.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#999', fontSize: 13 }}>
            暂无房间
          </div>
        ) : (
          displayRooms.map(room => renderRoomItem(room))
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
