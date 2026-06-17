const { getData, setData, saveDB } = require('./db');

function run(sql, params = []) {
  return new Promise((resolve) => {
    resolve({ lastID: null, changes: 0 });
  });
}

function get(table, where = {}) {
  return new Promise((resolve) => {
    const data = getData();
    const rows = data[table] || [];
    const result = rows.find(row => {
      for (const key of Object.keys(where)) {
        if (row[key] !== where[key]) return false;
      }
      return true;
    });
    resolve(result || null);
  });
}

function all(table, where = {}, options = {}) {
  return new Promise((resolve) => {
    const data = getData();
    let rows = [...(data[table] || [])];

    if (Object.keys(where).length > 0) {
      rows = rows.filter(row => {
        for (const key of Object.keys(where)) {
          if (row[key] !== where[key]) return false;
        }
        return true;
      });
    }

    if (options.orderBy) {
      const [field, direction = 'asc'] = options.orderBy;
      rows.sort((a, b) => {
        const cmp = a[field] < b[field] ? -1 : (a[field] > b[field] ? 1 : 0);
        return direction === 'desc' ? -cmp : cmp;
      });
    }

    if (options.limit) {
      rows = rows.slice(0, options.limit);
    }

    resolve(rows);
  });
}

function insert(table, row) {
  return new Promise((resolve) => {
    const data = getData();
    if (!data[table]) data[table] = [];
    data[table].push(row);
    setData(data);
    resolve(row);
  });
}

function update(table, where, updates) {
  return new Promise((resolve) => {
    const data = getData();
    const rows = data[table] || [];
    let changed = 0;
    rows.forEach(row => {
      let match = true;
      for (const key of Object.keys(where)) {
        if (row[key] !== where[key]) { match = false; break; }
      }
      if (match) {
        for (const key of Object.keys(updates)) {
          row[key] = updates[key];
        }
        changed++;
      }
    });
    if (changed > 0) setData(data);
    resolve({ changes: changed });
  });
}

function remove(table, where) {
  return new Promise((resolve) => {
    const data = getData();
    const rows = data[table] || [];
    const before = rows.length;
    data[table] = rows.filter(row => {
      for (const key of Object.keys(where)) {
        if (row[key] !== where[key]) return true;
      }
      return false;
    });
    const changed = before - data[table].length;
    if (changed > 0) setData(data);
    resolve({ changes: changed });
  });
}

module.exports = { run, get, all, insert, update, remove };
