const crypto = require('crypto');
const { readNotes, mutateNotes, formatDate, randomRotate } = require('../../lib/notes-blob');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const screen = req.query.screen;
    const notes = await readNotes();
    const filtered = screen ? notes.filter((n) => n.screen === screen) : notes;
    return res.status(200).json(filtered);
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    if (!body.screen || !body.type) {
      return res.status(400).json({ error: 'screen, type 값이 필요합니다.' });
    }

    const now = new Date();
    const note = await mutateNotes((notes) => {
      const id = body.id && !notes.some((n) => n.id === body.id) ? body.id : crypto.randomUUID();
      const created = {
        id,
        screen: body.screen,
        type: body.type,
        x: typeof body.x === 'number' ? body.x : 20,
        y: typeof body.y === 'number' ? body.y : 20,
        rotate: typeof body.rotate === 'number' ? body.rotate : randomRotate(),
        content: typeof body.content === 'string' ? body.content : '',
        date: body.date || formatDate(now),
        createdAt: body.createdAt || now.toISOString(),
      };
      notes.push(created);
      return created;
    });

    return res.status(201).json(note);
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method Not Allowed' });
};
