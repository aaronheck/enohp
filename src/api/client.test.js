import { ApiError, getGame, submitTurn } from './client';

function respond(status, body) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  });
}

afterEach(() => {
  delete global.fetch;
});

test('getGame fills in an empty turns list', async () => {
  global.fetch = jest.fn(() => respond(200, { game: { id: 'g1' } }));
  await expect(getGame('g1')).resolves.toEqual({ id: 'g1', turns: [] });
});

test('getGame turns a plain-text 404 into an ApiError', async () => {
  global.fetch = jest.fn(() => respond(404, 'Game not found'));
  await expect(getGame('nope')).rejects.toMatchObject({ name: 'ApiError', status: 404 });
});

test('getGame without an id fails without calling the server', async () => {
  global.fetch = jest.fn();
  await expect(getGame(null)).rejects.toBeInstanceOf(ApiError);
  expect(global.fetch).not.toHaveBeenCalled();
});

test('submitTurn surfaces the consistency-token rejection', async () => {
  global.fetch = jest.fn(() => respond(400, 'Turn key is not right.'));
  await expect(
    submitTurn({ gameId: 'g', consistencyToken: 'x', nickname: 'n', guess: 'g', recording: {} })
  ).rejects.toMatchObject({ status: 400, message: 'Turn key is not right.' });
});

test('submitTurn uploads to the presigned URL', async () => {
  global.fetch = jest
    .fn()
    .mockImplementationOnce(() => respond(200, { url: 'https://s3/put', key: 'k' }))
    .mockImplementationOnce(() => respond(200, ''));
  const recording = { fake: true };
  await submitTurn({ gameId: 'g', consistencyToken: '', nickname: 'n', guess: 'g', recording });
  expect(global.fetch).toHaveBeenLastCalledWith(
    'https://s3/put',
    expect.objectContaining({ method: 'PUT', body: recording })
  );
});
