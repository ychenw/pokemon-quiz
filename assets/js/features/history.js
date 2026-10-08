import { modes } from "../data/modes.js";
import { fmt } from "../utils.js";
export function createHistory({ $, profile, save, start, alignPanels }) {
  function renderHistory() {
    const p = profile();
    $("history-list").replaceChildren();
    const entries = [
      ...(p.sessions || []).map((s) => ({
        kind: "pending",
        item: s,
        date: s.updatedAt || s.createdAt || 0,
      })),
      ...p.history.map((h) => ({ kind: "complete", item: h, date: h.date })),
    ].sort((a, b) => b.date - a.date);
    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "px-history-empty";
      empty.textContent = "还没有完成的训练。第一轮，从这里开始。";
      $("history-list").append(empty);
    }
    entries.forEach(({ kind, item: h, date: stamp }) => {
      const row = document.createElement("div");
      row.className = "px-history-row";
      row.dataset.kind = kind;
      if (kind === "pending") row.dataset.sessionId = h.id;
      const info = document.createElement("div");
      info.className = "px-history-info";
      const title = document.createElement("strong");
      title.textContent = modes[h.mode].name;
      const date = document.createElement("small");
      date.textContent =
        kind === "pending"
          ? "进行中 · 已完成 " + h.states.filter((s) => s.done).length + " / " + h.order.length
          : new Date(stamp).toLocaleDateString("zh-CN") +
            (h.mode === "sprint" ? " · " + fmt(h.elapsed) : "");
      info.append(title, date);
      if (kind === "complete") {
        const score = document.createElement("span");
        score.className = "px-history-score";
        score.textContent = h.correct + " / " + h.size + " 独立答对";
        info.append(score);
      }
      const actions = document.createElement("div");
      actions.className = "px-history-actions";
      if (kind === "pending") {
        const resume = document.createElement("button");
        resume.type = "button";
        resume.className = "px-textbtn cursor-interaction";
        resume.textContent = "继续训练";
        resume.addEventListener("click", () => start(h.id));
        actions.append(resume);
      }
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "px-history-delete cursor-interaction";
      remove.textContent = "删除";
      remove.setAttribute(
        "aria-label",
        "删除 " +
          modes[h.mode].name +
          " " +
          (kind === "pending" ? "进行中" : h.correct + " / " + h.size),
      );
      remove.addEventListener("click", () => {
        if (p !== profile()) return;
        if (kind === "pending") {
          p.sessions = p.sessions.filter((s) => s.id !== h.id);
          p.session = p.sessions[0] || null;
        } else {
          const i = p.history.indexOf(h);
          if (i < 0) return;
          p.history.splice(i, 1);
        }
        save();
        renderHistory();
        $("history-message").hidden = false;
        $("history-message").textContent =
          kind === "pending" ? "已删除未完成的训练。" : "已删除训练记录。";
      });
      actions.append(remove);
      row.append(info, actions);
      $("history-list").append(row);
    });
    alignPanels();
  }
  return { renderHistory };
}
