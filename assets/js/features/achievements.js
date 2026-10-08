import { badges } from "../data/rewards.js";
import { records, aliases, englishNames } from "../data/pokemon.js";
import { norm } from "../utils.js";
export const unlocked = (p) =>
  badges
    .filter((b) => {
      if (b.id === "sprint") return p.best !== null || !!p.sprintAward;
      if (b.id === "bone")
        return (
          (p.confused || []).includes("104-105") &&
          [104, 105].every((id) => (p.boneRecovery || []).includes(id))
        );
      if (b.id === "legends") return [144, 145, 146].every((id) => p.mastered.includes(id));
      if (b.id === "twins") return [29, 32].every((id) => p.mastered.includes(id));
      if (b.id === "streak") return (p.maxStreak || 0) >= 10;
      if (b.id === "evolution") return [1, 2, 3].every((id) => p.mastered.includes(id));
      return p.mastered.length >= b.goal;
    })
    .map((b) => b.id);
export function createAchievementTracker({ profile, save }) {
  function trackWrong(val, id) {
    const pairs = [
      [104, 105],
      [35, 36],
      [39, 40],
      [133, 134],
      [29, 32],
    ];
    for (const pair of pairs) {
      if (!pair.includes(id)) continue;
      const other = pair.find((x) => x !== id);
      if (
        [records[other - 1].name, englishNames[other - 1], ...(aliases[other] || [])].some(
          (n) => norm(n) === val,
        )
      ) {
        const p = profile();
        p.confused = p.confused || [];
        const key = pair.join("-");
        if (!p.confused.includes(key)) p.confused.push(key);
        if (key === "104-105") p.boneRecovery = [];
      }
    }
    profile().streak = 0;
    save();
  }
  function trackCorrect(id) {
    const p = profile();
    if ([104, 105].includes(id) && (p.confused || []).includes("104-105")) {
      p.boneRecovery = p.boneRecovery || [];
      if (!p.boneRecovery.includes(id)) p.boneRecovery.push(id);
    }
    p.streak = (p.streak || 0) + 1;
    p.maxStreak = Math.max(p.maxStreak || 0, p.streak);
    const now = new Date(),
      month = now.getMonth() + 1,
      season =
        month >= 3 && month <= 5
          ? "spring"
          : month >= 6 && month <= 8
            ? "summer"
            : month >= 9 && month <= 11
              ? "autumn"
              : "winter",
      period = now.getHours() >= 6 && now.getHours() < 18 ? "day" : "night";
    p.seasonCounts = p.seasonCounts || {};
    p.events = p.events || [];
    [
      [season, 30],
      [period, 10],
    ].forEach(([key, target]) => {
      const record = now.getFullYear() + "-" + key;
      p.seasonCounts[record] = (p.seasonCounts[record] || 0) + 1;
      if (p.seasonCounts[record] >= target && !p.events.includes(key)) p.events.push(key);
    });
    if (
      ["spring", "summer", "autumn", "winter"].every((k) => p.events.includes(k)) &&
      !p.events.includes("rainbow")
    )
      p.events.push("rainbow");
  }
  return { trackWrong, trackCorrect };
}
