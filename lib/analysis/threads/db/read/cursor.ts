function encodeThreadCursor(sortAtIso: string, id: string) {
  return `${sortAtIso}__${id}`;
}
function decodeThreadCursor(cursor: string) {
  const [sortAtIso, id] = cursor.split('__');
  if (!sortAtIso || !id) return null;

  const sortAt = new Date(sortAtIso);
  if (Number.isNaN(sortAt.getTime())) return null;

  return { sortAt, id };
}

function encodeActivityEventCursor(occurredAtIso: string, eventId: string) {
  return `${occurredAtIso}__${eventId}`;
}

function decodeActivityEventCursor(cursor: string) {
  const [occurredAtIso, eventId] = cursor.split('__');
  if (!occurredAtIso || !eventId) return null;

  const occurredAt = new Date(occurredAtIso);
  if (Number.isNaN(occurredAt.getTime())) return null;

  return { occurredAt, eventId };
}
