const fs = require('fs');
const path = require('path');

const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'chat.json');

const defaultData = {
  users: [],
  rooms: [],
  room_members: [],
  messages: []
};

function loadDB() {
  try {
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, JSON.stringify(defaultData, null, 2), 'utf8');
      return JSON.parse(JSON.stringify(defaultData));
    }
    const raw = fs.readFileSync(dbPath, 'utf8');
    const data = JSON.parse(raw);
    for (const key of Object.keys(defaultData)) {
      if (!data[key]) data[key] = [];
    }
    return data;
  } catch (e) {
    console.error('DB load error:', e);
    return JSON.parse(JSON.stringify(defaultData));
  }
}

let dbData = loadDB();
let writeTimer = null;

function saveDB() {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    try {
      fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), 'utf8');
    } catch (e) {
      console.error('DB save error:', e);
    }
  }, 50);
}

module.exports = {
  getData: () => dbData,
  setData: (data) => {
    dbData = data;
    saveDB();
  },
  saveDB
};
