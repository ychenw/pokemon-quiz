export const blank = () => ({
  mastered: [],
  total: 0,
  best: null,
  history: [],
  session: null,
  sessions: [],
});
export const newSessionId = () =>
  Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
export function loadDatabase() {
  let db = { active: null, profiles: {}, guest: blank() };
  try {
    const raw = localStorage.getItem("pokemon-explore-v1");
    if (raw) db = JSON.parse(raw);
  } catch {}
  if (db.sprintSize !== 15) {
    [db.guest, ...Object.values(db.profiles)].forEach((p) => {
      p.sprintAward = !!p.sprintAward || p.best !== null;
      const valid = p.history.filter(
        (h) => h.mode === "sprint" && h.size === 15 && h.correct === 15,
      );
      p.best = valid.length ? Math.min(...valid.map((h) => h.elapsed)) : null;
    });
    db.sprintSize = 15;
  }
  [db.guest, ...Object.values(db.profiles)].forEach((p) => {
    p.sessions = p.sessions || [];
    if (p.session) {
      p.session.id = p.session.id || newSessionId();
      p.session.createdAt = p.session.createdAt || Date.now();
      if (!p.sessions.some((s) => s.id === p.session.id)) p.sessions.unshift(p.session);
    }
    p.session = p.sessions[0] || null;
  });
  return db;
}
export function saveDatabase(db) {
  try {
    localStorage.setItem("pokemon-explore-v1", JSON.stringify(db));
  } catch {}
}
