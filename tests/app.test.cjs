const fs = require("fs"),
  vm = require("vm"),
  assert = require("assert"),
  path = require("path");
(async () => {
  const project = path.resolve(__dirname, ".."),
    html = fs.readFileSync(path.join(project, "index.html"), "utf8");

  class Node {
    constructor() {
      this.hidden = false;
      this.value = "";
      this.dataset = {};
      this.style = {
        setProperty(k, v) {
          this[k] = v;
        },
      };
      this.offsetHeight = 800;
      this.handlers = {};
      this.children = [];
      this.attrs = {};
      this.disabled = false;
      this.innerHTML = "";
      this.textContent = "";
    }
    addEventListener(k, f) {
      this.handlers[k] = f;
    }
    setAttribute(k, v) {
      this.attrs[k] = v;
    }
    append(...x) {
      this.children.push(...x);
    }
    replaceChildren(...x) {
      this.children = x;
    }
    getBoundingClientRect() {
      return { top: 140 };
    }
    scrollIntoView() {}
    focus() {}
    blur() {}
    animate() {}
    querySelector() {
      return new Node();
    }
  }
  const nodes = {};
  for (const m of html.matchAll(/id="([^"]+)"/g)) nodes[m[1]] = new Node();
  const root = nodes["pk-explore"];
  const modeNodes = ["classic", "sprint", "advanced"].map((mode) => {
    const n = new Node();
    n.dataset.mode = mode;
    return n;
  });
  root.querySelector = (s) => {
    assert(nodes[s.slice(1)], s);
    return nodes[s.slice(1)];
  };
  const modeStart = ["classic", "sprint", "advanced"].map((mode) => {
    const n = new Node();
    n.dataset.startMode = mode;
    return n;
  });
  root.querySelectorAll = (s) =>
    s === "[data-start-mode]" ? modeStart : s === "[data-mode]" ? modeNodes : [];
  const texts = [
    "开始训练",
    "你好 ·",
    "15 题全答对",
    "# 092 鬼斯",
    "背上长着一颗种子的绿色四足宝可梦",
  ].map((nodeValue) => ({ nodeValue, parentElement: { closest: () => false } }));
  const frames = [];
  const win = { innerHeight: 700, innerWidth: 1024, addEventListener() {} };
  const testAccess = {};
  let stored = {},
    tasks = new Map(),
    serial = 0;
  const context = vm.createContext({
    testAccess,
    document: {
      getElementById: (id) => nodes[id],
      createElement: () => new Node(),
      activeElement: new Node(),
      createTreeWalker() {
        let i = 0;
        return { nextNode: () => texts[i++] || null };
      },
    },
    window: win,
    requestAnimationFrame: (f) => {
      frames.push(f);
      return frames.length;
    },
    ResizeObserver: class {
      observe() {}
    },
    NodeFilter: { SHOW_TEXT: 4 },
    MutationObserver: class {
      disconnect() {}
      observe() {}
    },
    localStorage: { getItem: (k) => stored[k], setItem: (k, v) => (stored[k] = v) },
    matchMedia: () => ({ matches: true }),
    setTimeout: (f) => {
      tasks.set(++serial, f);
      return serial;
    },
    clearTimeout: (k) => tasks.delete(k),
    setInterval: () => ++serial,
    clearInterval() {},
  });
  const cache = new Map();
  function loadModule(file) {
    if (cache.has(file)) return cache.get(file);
    let source = fs.readFileSync(file, "utf8");
    if (file.endsWith("/main.js"))
      source +=
        "\ntestAccess.records=records;testAccess.profile=profile;testAccess.unlocked=unlocked;testAccess.trackWrong=trackWrong;testAccess.trackCorrect=trackCorrect;testAccess.translateText=translateText;testAccess.fitGame=fitGame;";
    const m = new vm.SourceTextModule(source, { context, identifier: file });
    cache.set(file, m);
    return m;
  }
  const main = loadModule(path.join(project, "assets/js/main.js"));
  await main.link((specifier, parent) =>
    loadModule(path.resolve(path.dirname(parent.identifier), specifier)),
  );
  await main.evaluate();

  const $ = (x) => nodes["px-" + x],
    click = (x) => $(x).handlers.click(),
    submit = (x) => $(x).handlers.submit({ preventDefault() {} }),
    tick = () => {
      const a = [...tasks.values()];
      tasks.clear();
      a.forEach((f) => f());
    };
  const records = testAccess.records;
  assert.equal($("badges").children.length, 10);
  for (let i = 5; i < 10; i++) {
    assert.equal(
      $("badges").children[i].children[1].textContent,
      "隐藏成就 " + ["一", "二", "三", "四", "五"][i - 5],
    );
    assert.equal($("badges").children[i].children[2].textContent, "");
  }
  assert.equal($("history-panel").style.height, "800px");
  assert.equal($("lang-zh").attrs["aria-pressed"], true);
  click("lang-en");
  assert.equal($("lang-en").attrs["aria-pressed"], true);
  assert.equal(texts[0].nodeValue, "Start training");
  click("lang-zh");
  assert.equal(texts[0].nodeValue, "开始训练");
  modeStart[1].handlers.click({ stopPropagation() {} });
  let p = testAccess.profile();
  const first = p.session.id;
  click("reveal");
  click("next");
  $("name").value = "暂存答案";
  $("name").handlers.input();
  click("back");
  assert.equal(p.sessions.length, 1);
  assert.equal($("history-list").children[0].dataset.kind, "pending");
  modeStart[0].handlers.click({ stopPropagation() {} });
  const second = p.session.id;
  assert.notEqual(second, first);
  click("back");
  assert.equal(p.sessions.length, 2);
  assert.equal($("history-list").children.length, 2);
  let old = $("history-list").children.find((r) => r.dataset.sessionId === first);
  old.children[1].children[0].handlers.click();
  assert.equal($("question-number").textContent, "02 / 15");
  assert.equal($("name").value, "暂存答案");
  click("back");
  assert.equal(p.sessions.length, 2);
  old = $("history-list").children.find((r) => r.dataset.sessionId === second);
  old.children[1].children[1].handlers.click();
  assert.equal(p.sessions.length, 1);
  assert.equal(p.sessions[0].id, first);
  assert.equal(JSON.parse(stored["pokemon-explore-v1"]).guest.sessions.length, 1);
  old = $("history-list").children.find((r) => r.dataset.sessionId === first);
  old.children[1].children[0].handlers.click();
  for (let i = 1; i < 15; i++) {
    const id = +$("picture").src.match(/\/(\d+)\.png$/)[1];
    $("name").value = records[id - 1].name;
    submit("form");
    tick();
  }
  assert.equal($("result-score").textContent, "14 / 15");
  assert.equal(p.sessions.length, 0);
  assert.equal(p.history.length, 1);
  click("home-btn");
  const mastered = p.mastered.length;
  $("history-list").children[0].children[1].children[0].handlers.click();
  assert.equal(p.history.length, 0);
  assert.equal(p.mastered.length, mastered);
  modeStart[1].handlers.click({ stopPropagation() {} });
  for (let i = 0; i < 15; i++) {
    const id = +$("picture").src.match(/\/(\d+)\.png$/)[1];
    $("name").value = records[id - 1].name;
    submit("form");
    tick();
  }
  assert.equal($("result-score").textContent, "15 / 15");
  assert(testAccess.unlocked(p).includes("sprint"));
  click("home-btn");
  click("account");
  $("nickname").value = "测试训练家";
  submit("login-form");
  p = testAccess.profile();
  assert.equal(p.history.length, 1);
  assert.equal($("greeting-name").textContent, "测试训练家");
  p.mastered = [...new Set([...p.mastered, 144, 145, 146])];
  assert(testAccess.unlocked(p).includes("legends"));
  click("collection-open");
  click("tab-badges");
  assert.equal($("collection-grid").children.length, 10);
  $("collection-grid").children[9].handlers.click();
  assert.equal($("badge-detail-title").textContent, "传说寻踪");
  click("badge-equip");
  assert.equal(p.badge, "legends");
  assert($("avatar").children[0].children.some((x) => x.className === "px-badge-pin"));
  click("home-frames");
  assert.equal($("reward-preview").children.length, 4);
  click("home-avatars");
  assert.equal($("reward-preview").children.length, 6);
  console.log(
    "PASS: 10 badges and 5 numbered secrets without hints; matching panel height; EN/中 selected state; multiple saved rounds, independent resume/drafts, persistent deletion; 15-question scoring, guest transfer, legendary-bird badge equip, collection tabs.",
  );

  // Creating a second nickname profile starts with an initialized session collection.
  click("collection-close");
  click("badge-detail-close");
  click("account");
  $("nickname").value = "第二位训练家";
  submit("login-form");
  const secondProfile = testAccess.profile();
  assert.equal(secondProfile.sessions.length, 0);
  modeStart[1].handlers.click({ stopPropagation() {} });
  assert.equal(secondProfile.sessions.length, 1);
  click("back");
  assert.equal(secondProfile.mastered.length, 0);
  console.log(
    "PASS: ES module imports, new-profile session initialization, and retained existing gameplay behavior.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
