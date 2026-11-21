// Overview filters in the URL (frontend/src/puzzles/listQuery.mjs): reading a
// route query, writing it back, and turning it into API parameters.

const { test, before } = require('node:test');
const assert = require('node:assert/strict');

let lq;
before(async () => {
  lq = await import('../../frontend/src/puzzles/listQuery.mjs');
});

test('a full query survives the round trip', () => {
  const query = {
    q: 'apple', size: '11-15', colors: '2', difficulty: '3', rating: '4',
    author: 'Dora', unsolved: '1', sort: 'avgRating', order: 'desc', page: '3'
  };
  const state = lq.readListQuery(query);
  assert.deepEqual(state, {
    q: 'apple',
    filters: { size: '11-15', colors: 2, difficulty: 3, rating: 4, author: 'Dora', unsolved: true },
    sort: { field: 'avgRating', order: 'desc' },
    page: 3
  });
  assert.deepEqual(lq.toRouteQuery(state), query);
  const { page, ...withoutPage } = query;
  assert.equal(page, '3');
  assert.deepEqual(lq.listContext(query), withoutPage, 'puzzle links carry no page');
});

test('defaults are left out of the URL', () => {
  const state = lq.readListQuery({});
  assert.deepEqual(state.filters, lq.emptyFilters());
  assert.deepEqual(lq.toRouteQuery(state), {});
  assert.deepEqual(lq.toRouteQuery(lq.readListQuery({ sort: 'name', order: 'asc', page: '1' })), { sort: 'name' });
});

test('values that do not fit are dropped, not passed on', () => {
  const state = lq.readListQuery({
    size: '7-9', colors: '9', difficulty: 'x', rating: '5', sort: 'password', order: 'sideways',
    page: '-2', unsolved: 'yes', q: ['first', 'second'], author: 'a'.repeat(300)
  });
  assert.deepEqual(state.filters, { ...lq.emptyFilters(), author: 'a'.repeat(100) });
  assert.deepEqual(state.sort, { field: null, order: 'asc' });
  assert.equal(state.page, 1);
  assert.equal(state.q, 'first');
});

test('the home page search link is read as q', () => {
  assert.equal(lq.readListQuery({ search: ' tree ' }).q, 'tree');
  assert.equal(lq.readListQuery({ search: 'tree', q: 'apple' }).q, 'apple');
});

test('API parameters match what GET /puzzles expects', () => {
  const state = lq.readListQuery({ size: '31-', colors: '4', difficulty: '2', rating: '3', unsolved: '1', sort: 'date', order: 'desc' });
  assert.deepEqual(lq.toApiParams(state, true), {
    q: '', author: '', minSize: '31', maxSize: null, minColors: 4, maxColors: null,
    minDifficulty: 2, maxDifficulty: 2, minRating: 3, status: 'unsolved', sort: 'date', order: 'desc'
  });
  assert.equal(lq.toApiParams(state, false).status, null, 'guests have no solved state');
  const colours2 = lq.toApiParams(lq.readListQuery({ colors: '2', size: '1-10' }), false);
  assert.deepEqual([colours2.minColors, colours2.maxColors, colours2.minSize, colours2.maxSize], [2, 2, '1', '10']);
});

test('sameQuery compares values, not order or types', () => {
  assert.ok(lq.sameQuery({ a: '1', b: 'x' }, { b: 'x', a: 1 }));
  assert.ok(!lq.sameQuery({ a: '1' }, { a: '1', b: 'x' }));
  assert.ok(lq.sameQuery({ a: ['1', '2'] }, { a: '1' }));
});
