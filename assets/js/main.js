import { records, aliases, englishNames } from "./data/pokemon.js";
import { modes } from "./data/modes.js";
import { badges } from "./data/rewards.js";
import { blank, newSessionId, loadDatabase, saveDatabase } from "./services/storage.js";
import { fmt, norm } from "./utils.js";
import { unlocked, createAchievementTracker } from "./features/achievements.js";
import { createCollections } from "./features/collections.js";
import { createLayout } from "./features/layout.js";
import { createHistory } from "./features/history.js";
import { createI18n } from "./features/i18n.js";
const db = loadDatabase();
const root = document.getElementById("pk-explore"),
  $ = (id) => root.querySelector("#px-" + id);
let selected = "classic",
  session = null,
  clock = null,
  advance = null,
  clockStart = 0,
  lastFocus = null,
  swipeStart = null;
const profile = () => (db.active ? db.profiles[db.active] : db.guest);
const save = () => saveDatabase(db);
function show(id) {
  root.dataset.view = id;
  if (id === "game") scheduleFit();
  ["home", "game", "result"].forEach((x) => ($(x).hidden = x !== id));
}
function home() {
  select(selected);
  show("home");
  const p = profile(),
    n = p.mastered.length,
    u = unlocked(p);
  paintAvatar();
  $("greeting-label").textContent = db.active ? "你好 ·" : "创建你的训练家档案";
  $("greeting-name").textContent = db.active || "";
  $("greeting-name").hidden = !db.active;
  renderBadges();
  $("history-message").hidden = true;
  renderHistory();
}
function select(mode) {
  selected = mode;
  root.querySelectorAll("[data-mode]").forEach((b) => {
    b.setAttribute("aria-pressed", b.dataset.mode === mode);
    b.querySelector(".px-mode-select").setAttribute("aria-pressed", b.dataset.mode === mode);
  });
  root
    .querySelectorAll("[data-start-mode]")
    .forEach((b) => (b.hidden = b.dataset.startMode !== mode));
}
const shuffled = () => {
  const a = records.map((r) => r.id);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
function elapsed() {
  return session.elapsed + (clockStart ? Date.now() - clockStart : 0);
}
function persist() {
  if (!session) return;
  const p = profile(),
    copy = { ...session, elapsed: elapsed(), updatedAt: Date.now() };
  const i = p.sessions.findIndex((s) => s.id === session.id);
  if (i >= 0) p.sessions[i] = copy;
  else p.sessions.unshift(copy);
  p.session = copy;
  save();
}
function stop() {
  if (advance) {
    clearTimeout(advance);
    advance = null;
  }
  if (clock) {
    clearInterval(clock);
    clock = null;
  }
  if (clockStart && session) {
    session.elapsed = elapsed();
    clockStart = 0;
  }
  persist();
}
function start(resume = false) {
  if (session) stop();
  const pending =
    typeof resume === "string"
      ? profile().sessions.find((s) => s.id === resume)
      : resume
        ? profile().session
        : null;
  if (resume && !pending) return;
  session = pending
    ? pending
    : {
        id: newSessionId(),
        createdAt: Date.now(),
        mode: selected,
        order: shuffled().slice(0, modes[selected].size),
        states: Array.from({ length: modes[selected].size }, () => ({
          draft: "",
          done: false,
          correct: false,
          revealed: false,
        })),
        pos: 0,
        elapsed: 0,
        initialBadges: unlocked(profile()),
      };
  show("game");
  root.scrollIntoView({ block: "start", behavior: "instant" });
  scheduleFit();
  clockStart = Date.now();
  clock = setInterval(() => {
    $("timer").textContent = session.mode === "sprint" ? fmt(elapsed()) : "不计时";
  }, 1000);
  $("timer").textContent = session.mode === "sprint" ? fmt(session.elapsed) : "不计时";
  render();
  persist();
}
function render() {
  if (advance) {
    clearTimeout(advance);
    advance = null;
  }
  const s = session.states[session.pos],
    r = records[session.order[session.pos] - 1];
  $("game-mode").textContent = modes[session.mode].name;
  $("question-number").textContent =
    String(session.pos + 1).padStart(2, "0") + " / " + session.order.length;
  const done = session.states.filter((s) => s.done).length;
  $("session-score").textContent = "独立答对 " + session.states.filter((s) => s.correct).length;
  $("fill").style.width = (done / session.order.length) * 100 + "%";
  $("picture").src =
    "https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/versions/generation-iii/emerald/" +
    r.id +
    ".png";
  $("picture").onerror = () => {
    $("picture").onerror = null;
    $("picture").src =
      "https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/" + r.id + ".png";
  };
  $("answer-name").textContent = s.done ? "# " + String(r.id).padStart(3, "0") + " " + r.name : "?";
  $("clue").textContent = s.done ? r.clue : "";
  $("name").value = s.draft;
  $("feedback").textContent = s.correct ? "答对了！" : s.revealed ? "" : "";
  $("confirm").disabled = s.done;
  $("reveal").disabled = s.done;
  $("reveal").textContent = s.correct ? "已成功识别" : s.revealed ? "答案已揭晓" : "不会，揭晓答案";
  $("prev").hidden = session.pos === 0;
  $("next").hidden = !s.done;
  $("next").setAttribute(
    "aria-label",
    session.pos === session.order.length - 1 ? "查看本轮成绩" : "下一题",
  );
}
function move(d) {
  if (d > 0 && !session.states[session.pos].done) return;
  if (session.pos + d < 0) return;
  if (session.pos + d >= session.order.length) {
    finish();
    return;
  }
  session.states[session.pos].draft = $("name").value;
  session.pos += d;
  render();
  persist();
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
    $("front").animate(
      [
        { transform: "translateX(" + d * 24 + "px)", opacity: 0.6 },
        { transform: "translateX(0)", opacity: 1 },
      ],
      { duration: 200, easing: "ease-in-out" },
    );
}
function finish() {
  stop();
  const p = profile(),
    correct = session.states.filter((s) => s.correct).length;
  const h = {
    mode: session.mode,
    size: session.order.length,
    correct,
    elapsed: session.elapsed,
    date: Date.now(),
  };
  if (session.mode === "sprint" && correct === h.size) {
    p.sprintAward = true;
    if (h.size === modes.sprint.size)
      p.best = p.best === null ? session.elapsed : Math.min(p.best, session.elapsed);
  }
  p.history.unshift(h);
  p.sessions = p.sessions.filter((s) => s.id !== session.id);
  p.session = p.sessions[0] || null;
  save();
  show("result");
  $("result-title").textContent =
    correct === h.size ? "全部答对，漂亮！" : "每一次认识，都是进步。";
  $("result-score").textContent = correct + " / " + h.size;
  $("result-detail").textContent =
    "已掌握 " +
    p.mastered.length +
    " / 151 只" +
    (h.mode === "sprint" ? " · 用时 " + fmt(h.elapsed) : "");
  const fresh = unlocked(p).filter((id) => !session.initialBadges.includes(id));
  $("new-badges").textContent = fresh.length
    ? "新成就 · " +
      badges
        .filter((b) => fresh.includes(b.id))
        .map((b) => b.name)
        .join(" / ")
    : "继续训练，点亮下一枚成就。";
  selected = session.mode;
  session = null;
  clockStart = 0;
}
$("form").addEventListener("submit", (e) => {
  e.preventDefault();
  if (e.isComposing || !session) return;
  const s = session.states[session.pos],
    r = records[session.order[session.pos] - 1];
  if (s.done) return;
  const val = norm($("name").value);
  s.draft = $("name").value;
  if (!val) return;
  if (
    [
      r.name,
      englishNames[r.id - 1],
      ...(r.id === 29
        ? ["nidoran female", "nidoran-f"]
        : r.id === 32
          ? ["nidoran male", "nidoran-m"]
          : []),
      ...(aliases[r.id] || []),
    ].some((n) => norm(n) === val)
  ) {
    s.done = true;
    s.correct = true;
    const p = profile();
    p.total++;
    if (!p.mastered.includes(r.id)) p.mastered.push(r.id);
    trackCorrect(r.id);
    $("name").blur();
    render();
    persist();
    const pos = session.pos;
    advance = setTimeout(() => {
      advance = null;
      if (session && session.pos === pos) move(1);
    }, 550);
  } else {
    trackWrong(val, r.id);
    $("feedback").textContent = "还差一点，再想想？";
  }
});
$("name").addEventListener("input", () => {
  if (session) {
    session.states[session.pos].draft = $("name").value;
    persist();
  }
});
$("reveal").addEventListener("click", () => {
  const s = session.states[session.pos];
  if (s.done) return;
  s.done = true;
  s.revealed = true;
  profile().streak = 0;
  $("name").blur();
  render();
  persist();
});
$("prev").addEventListener("click", () => move(-1));
$("next").addEventListener("click", () => move(1));
$("deck").addEventListener("pointerdown", (e) => {
  if (e.target.closest("button")) return;
  swipeStart = { x: e.clientX, y: e.clientY, id: e.pointerId };
});
$("deck").addEventListener("pointerup", (e) => {
  if (!swipeStart || swipeStart.id !== e.pointerId) return;
  const dx = e.clientX - swipeStart.x,
    dy = e.clientY - swipeStart.y;
  swipeStart = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1);
});
$("deck").addEventListener("pointercancel", () => (swipeStart = null));
root.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!$("dialog").hidden) closeDialog();
    $("collection-dialog").hidden = true;
    $("badge-detail").hidden = true;
  }
  if (!session || $("game").hidden || e.target.matches("input")) return;
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    move(-1);
  }
  if (e.key === "ArrowRight") {
    e.preventDefault();
    move(1);
  }
});
root
  .querySelectorAll("[data-mode]")
  .forEach((b) => b.addEventListener("click", () => select(b.dataset.mode)));
root.querySelectorAll("[data-start-mode]").forEach((b) =>
  b.addEventListener("click", (e) => {
    e.stopPropagation();
    select(b.dataset.startMode);
    start();
  }),
);
$("back").addEventListener("click", () => {
  stop();
  session = null;
  home();
});
$("home-btn").addEventListener("click", () => {
  select(selected);
  home();
});
$("again").addEventListener("click", () => start());
function closeDialog() {
  $("dialog").hidden = true;
  lastFocus?.focus();
}
$("account").addEventListener("click", () => {
  lastFocus = document.activeElement;
  $("dialog").hidden = false;
  $("nickname").value = db.active || "";
  $("logout").hidden = !db.active;
  $("profiles").replaceChildren();
  Object.keys(db.profiles).forEach((name) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = name;
    b.className = "cursor-interaction";
    b.addEventListener("click", () => {
      db.active = name;
      save();
      closeDialog();
      home();
    });
    $("profiles").append(b);
  });
  $("login-form").hidden = !!db.active;
  $("profile-actions").hidden = !db.active;
  $("profiles").hidden = !!db.active;
  $("login-title").textContent = db.active ? db.active + " · 训练家档案" : "创建你的训练家档案";
  if (!db.active) $("nickname").focus();
});
$("close").addEventListener("click", closeDialog);
$("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const n = $("nickname").value.trim();
  if (!n) return;
  if (!Object.hasOwn(db.profiles, n)) {
    Object.defineProperty(db.profiles, n, {
      value: db.active ? blank() : JSON.parse(JSON.stringify(db.guest)),
      enumerable: true,
      writable: true,
      configurable: true,
    });
    if (!db.active) db.guest = blank();
  }
  db.active = n;
  save();
  closeDialog();
  home();
});
$("logout").addEventListener("click", () => {
  db.active = null;
  save();
  closeDialog();
  home();
});
const { trackWrong, trackCorrect } = createAchievementTracker({
  profile,
  save,
});
const { paintAvatar, renderBadges, openCollection } = createCollections({
  root,
  $,
  db,
  profile,
  save,
  closeDialog,
});
const { alignPanels, scheduleFit, fitGame } = createLayout({ $ });
const { renderHistory } = createHistory({
  $,
  profile,
  save,
  start,
  alignPanels,
});
const { applyLanguage, translateText } = createI18n({
  root,
  $,
  scheduleFit,
  alignPanels,
});
home();
applyLanguage();
