import {
  avatarRewards,
  frameRewards,
  badges,
  badgeDesigns,
  mysteryDesign,
} from "../data/rewards.js";
import { portraitImages } from "../data/portraits.js";
import { unlocked } from "./achievements.js";
export function createCollections({ root, $, db, profile, save, closeDialog }) {
  const sprite = (id) => portraitImages[id];
  const rewardOpen = (r, p) =>
    r.secret
      ? unlocked(p).includes(r.secret)
      : r.event
        ? (p.events || []).includes(r.key)
        : p.mastered.length >= r.goal;
  function makePortrait(reward, p, frame = null) {
    const wrap = document.createElement("span");
    wrap.className =
      "px-portrait frame-" +
      (frame || p.frame || "plain") +
      (reward?.season ? " season-" + reward.season : "");
    if (reward) {
      const img = document.createElement("img");
      img.src = sprite(reward.id);
      img.alt = reward.name;
      img.onerror = () => {
        img.hidden = true;
        const fallback = document.createElement("span");
        fallback.className = "px-local-avatar-placeholder";
        fallback.textContent = String(reward.id).padStart(3, "0");
        wrap.append(fallback);
      };
      wrap.append(img);
      if (reward.season) {
        const scene = document.createElement("span");
        scene.className = "px-scene";
        scene.setAttribute("aria-hidden", "true");
        ["symbol", "particles", "horizon"].forEach((kind) => {
          const piece = document.createElement("span");
          piece.className = "px-weather-" + kind;
          scene.append(piece);
        });
        wrap.append(scene);
      }
    } else wrap.textContent = db.active ? Array.from(db.active)[0] : "?";
    if (p.badge && unlocked(p).includes(p.badge)) {
      const pin = document.createElement("span");
      pin.className = "px-badge-pin";
      pin.setAttribute("aria-label", badges.find((b) => b.id === p.badge).name + "徽章");
      pin.append(badgeArt(p.badge));
      wrap.append(pin);
    }
    return wrap;
  }
  function paintAvatar() {
    const p = profile(),
      r = avatarRewards.find((r) => r.key === p.avatar && rewardOpen(r, p));
    $("avatar").replaceChildren(makePortrait(r, p));
    $("avatar").setAttribute("aria-label", "更换头像与边框");
    $("equipped-badge").textContent =
      p.badge && unlocked(p).includes(p.badge)
        ? "已佩戴 · " + badges.find((b) => b.id === p.badge).name + "徽章"
        : "";
  }
  function renderBadges() {
    const p = profile(),
      n = p.mastered.length,
      u = unlocked(p);
    $("badges").replaceChildren();
    badges.forEach((b) => {
      const open = u.includes(b.id),
        tile = document.createElement("button");
      tile.type = "button";
      tile.className =
        "px-badge cursor-interaction" +
        (open ? " unlocked" : "") +
        (b.hidden ? " secret" : "") +
        (p.badge === b.id ? " equipped" : "");
      const m = document.createElement("span");
      m.className = "px-medal medal-" + (b.shape || "gem");
      m.append(badgeArt(b.id, b.hidden && !open));
      const title = document.createElement("strong");
      title.textContent = b.hidden && !open ? secretTitle(b) : b.name;
      const sub = document.createElement("p");
      sub.textContent =
        p.badge === b.id
          ? "已佩戴"
          : open
            ? "已获得"
            : b.hidden
              ? ""
              : b.id === "sprint"
                ? "15 题全答对"
                : Math.min(n, b.goal) + " / " + b.goal;
      tile.append(m, title, sub);
      tile.addEventListener("click", () => openBadgeDetail(b));
      $("badges").append(tile);
    });
    renderHomeCollection();
  }
  let collectionTab = "avatars";
  function openCollection(tab = "avatars") {
    $("collection-dialog").hidden = false;
    collectionTab = tab;
    renderCollection();
  }
  function renderCollection() {
    const p = profile();
    ["avatars", "frames", "badges", "seasonal"].forEach((t) =>
      $("tab-" + t).setAttribute("aria-pressed", collectionTab === t),
    );
    $("collection-grid").replaceChildren();
    if (collectionTab === "badges") {
      renderBadgeCollection();
      return;
    }
    const items =
      collectionTab === "frames"
        ? frameRewards
        : avatarRewards.filter((r) => (collectionTab === "seasonal" ? r.event : !r.event));
    items.forEach((r) => {
      const open = rewardOpen(r, p),
        picked = collectionTab === "frames" ? p.frame === r.key : p.avatar === r.key;
      const b = document.createElement("button");
      b.type = "button";
      b.className =
        "px-collection-item cursor-interaction" +
        (open ? " earned" : "") +
        (picked ? " equipped" : "");
      b.setAttribute("aria-label", r.name);
      b.append(
        makePortrait(
          collectionTab === "frames"
            ? avatarRewards.find((a) => a.key === p.avatar) || avatarRewards[0]
            : r,
          p,
          collectionTab === "frames" ? r.key : null,
        ),
      );
      const name = document.createElement("strong");
      name.textContent = r.name;
      const rule = document.createElement("p");
      rule.textContent = r.secret
        ? "解锁「骨头侦探」"
        : r.event
          ? r.rule
          : "掌握 " + r.goal + " 只宝可梦";
      const state = document.createElement("span");
      state.className = "px-reward-state";
      state.textContent = picked ? "已佩戴" : open ? "点击佩戴" : "未解锁";
      b.append(name, rule, state);
      b.addEventListener("click", () => {
        if (!open) {
          $("collection-message").textContent = rule.textContent;
          return;
        }
        if (collectionTab === "frames") p.frame = r.key;
        else p.avatar = r.key;
        save();
        paintAvatar();
        renderCollection();
        $("collection-message").textContent = "已佩戴 · " + r.name;
      });
      $("collection-grid").append(b);
    });
    $("collection-message").textContent =
      collectionTab === "seasonal"
        ? "季节主题为头像装饰概念，不是官方限定宝可梦形态。"
        : "掌握数量按独立答对的不同宝可梦计算，不重复刷题。";
  }
  function secretTitle(b) {
    return (
      "隐藏成就 " +
      ["一", "二", "三", "四", "五"][badges.filter((x) => x.hidden).findIndex((x) => x.id === b.id)]
    );
  }
  function badgeArt(id, concealed = false) {
    const d = concealed ? mysteryDesign : badgeDesigns[id] || mysteryDesign,
      art = document.createElement("span");
    art.className = "px-badge-art";
    art.setAttribute("aria-hidden", "true");
    d.rows.forEach((row) => {
      row = row.replace(/ /g, "").padEnd(9, ".").slice(0, 9);
      for (const char of row) {
        const dot = document.createElement("span");
        const idx = "KABC".indexOf(char);
        if (idx >= 0) dot.style.background = d.colors[idx];
        art.append(dot);
      }
    });
    return art;
  }
  let detailBadge = null;
  function openBadgeDetail(b) {
    detailBadge = b;
    const p = profile(),
      fresh = unlocked(p).includes(b.id),
      equipped = p.badge === b.id;
    $("badge-detail").hidden = false;
    $("badge-detail-title").textContent = b.hidden && !fresh ? secretTitle(b) : b.name;
    $("badge-detail-copy").textContent = b.hidden && !fresh ? "" : b.description;
    $("badge-detail-reward").textContent =
      b.hidden && !fresh
        ? "隐藏奖励 · 达成后揭晓"
        : (b.reward || "训练家荣誉徽章") + " · 可佩戴头像角标";
    $("badge-detail-state").textContent = equipped ? "当前佩戴" : fresh ? "已解锁" : "尚未解锁";
    $("badge-design-note").textContent =
      b.hidden && !fresh ? "图案将在解锁后揭晓。" : badgeDesigns[b.id].meaning;
    $("badge-preview").replaceChildren();
    const art = badgeArt(b.id, b.hidden && !fresh);
    $("badge-preview").append(art);
    if (fresh) {
      const r = avatarRewards.find((r) => r.key === p.avatar);
      $("badge-preview").append(makePortrait(r, { ...p, badge: b.id }));
    }
    $("badge-equip").disabled = !fresh;
    $("badge-equip").textContent = !fresh ? "解锁后可佩戴" : equipped ? "卸下徽章" : "佩戴到头像";
    if (fresh) $("badge-equip").focus();
    else $("badge-detail-close").focus();
  }
  function renderBadgeCollection() {
    const p = profile(),
      u = unlocked(p);
    $("collection-grid").replaceChildren();
    badges.forEach((b) => {
      const open = u.includes(b.id),
        picked = p.badge === b.id,
        item = document.createElement("button");
      item.type = "button";
      item.className =
        "px-collection-item px-badge-collect cursor-interaction" +
        (open ? " earned" : "") +
        (picked ? " equipped" : "");
      item.append(badgeArt(b.id, b.hidden && !open));
      const name = document.createElement("strong");
      name.textContent = b.hidden && !open ? secretTitle(b) : b.name;
      const rule = document.createElement("p");
      rule.textContent = b.hidden && !open ? "" : badgeDesigns[b.id].motif + "徽章";
      const state = document.createElement("span");
      state.className = "px-reward-state";
      state.textContent = picked ? "已佩戴" : open ? "查看 / 佩戴" : "未解锁";
      item.append(name, rule, state);
      item.addEventListener("click", () => openBadgeDetail(b));
      $("collection-grid").append(item);
    });
    $("collection-message").textContent = "可佩戴一枚徽章作为头像右下角的成就角标，随时更换。";
  }
  let homeCollectionTab = "avatars";
  function renderHomeCollection() {
    const p = profile();
    ["avatars", "frames"].forEach((tab) =>
      $("home-" + tab).setAttribute("aria-selected", homeCollectionTab === tab),
    );
    $("reward-preview").setAttribute("aria-labelledby", "px-home-" + homeCollectionTab);
    $("reward-preview").replaceChildren();
    const items =
      homeCollectionTab === "frames" ? frameRewards : avatarRewards.filter((r) => !r.event);
    items.forEach((r) => {
      const open = rewardOpen(r, p),
        item = document.createElement("button");
      item.type = "button";
      item.className = "px-reward-mini cursor-interaction" + (open ? " earned" : "");
      item.setAttribute("aria-label", r.name);
      const face =
        homeCollectionTab === "frames"
          ? avatarRewards.find((a) => a.key === p.avatar) || avatarRewards[0]
          : r;
      item.append(makePortrait(face, p, homeCollectionTab === "frames" ? r.key : "plain"));
      const text = document.createElement("span");
      text.textContent = r.name;
      item.append(text);
      item.addEventListener("click", () => openCollection(homeCollectionTab));
      $("reward-preview").append(item);
    });
  }
  function homeTabKeys(e) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    homeCollectionTab =
      e.key === "Home"
        ? "avatars"
        : e.key === "End"
          ? "frames"
          : homeCollectionTab === "avatars"
            ? "frames"
            : "avatars";
    renderHomeCollection();
    $("home-" + homeCollectionTab).focus();
  }
  $("collection-open").addEventListener("click", () => openCollection(homeCollectionTab));
  $("profile-collection").addEventListener("click", () => {
    closeDialog();
    openCollection();
  });
  $("avatar").addEventListener("click", () => openCollection());
  $("collection-close").addEventListener("click", () => {
    $("collection-dialog").hidden = true;
    $("collection-open").focus();
  });
  ["avatars", "frames", "badges", "seasonal"].forEach((t) =>
    $("tab-" + t).addEventListener("click", () => {
      collectionTab = t;
      renderCollection();
    }),
  );
  $("badge-detail-close").addEventListener("click", () => {
    $("badge-detail").hidden = true;
  });
  $("badge-equip").addEventListener("click", () => {
    if (!detailBadge || !unlocked(profile()).includes(detailBadge.id)) return;
    const p = profile();
    p.badge = p.badge === detailBadge.id ? null : detailBadge.id;
    save();
    paintAvatar();
    renderBadges();
    if (!$("collection-dialog").hidden) renderCollection();
    openBadgeDetail(detailBadge);
  });
  ["avatars", "frames"].forEach((tab) =>
    $("home-" + tab).addEventListener("click", () => {
      homeCollectionTab = tab;
      renderHomeCollection();
    }),
  );
  $("home-avatars").addEventListener("keydown", homeTabKeys);
  $("home-frames").addEventListener("keydown", homeTabKeys);
  return { paintAvatar, renderBadges, openCollection };
}
