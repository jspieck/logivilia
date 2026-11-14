// Idempotent schema helpers for migrations. Not a migration itself: the
// migrator only loads files that start with a date.

async function tableExists (qi, table) {
  const tables = await qi.showAllTables();
  return tables.some(t => (typeof t === 'string' ? t : t.tableName) === table);
}

async function ensureTable (qi, table, attributes) {
  if (!await tableExists(qi, table)) {
    await qi.createTable(table, attributes);
  }
}

async function ensureColumn (qi, table, column, attribute) {
  const columns = await qi.describeTable(table);
  if (!columns[column]) {
    await qi.addColumn(table, column, attribute);
  }
}

async function removeColumnIfExists (qi, table, column) {
  const columns = await qi.describeTable(table);
  if (columns[column]) {
    await qi.removeColumn(table, column);
  }
}

// Compares by columns, not by name: databases built by sync() may have named
// the same index differently.
async function ensureIndex (qi, table, fields, options = {}) {
  const indexes = await qi.showIndex(table);
  const wanted = fields.join(',');
  const exists = indexes.some(index =>
    (index.fields || []).map(f => f.attribute || f.name).join(',') === wanted &&
    (!options.unique || index.unique));
  if (!exists) {
    await qi.addIndex(table, fields, options);
  }
}

module.exports = { tableExists, ensureTable, ensureColumn, removeColumnIfExists, ensureIndex };
