export function createLayout({ $ }) {
  function alignPanels() {
    const height = $("achievements-panel").offsetHeight;
    if (height > 0) $("history-panel").style.height = height + "px";
  }
  const panelsResize = new ResizeObserver(alignPanels);
  let fitFrame = null;
  function scheduleFit() {
    if (fitFrame !== null) return;
    fitFrame = requestAnimationFrame(() => {
      fitFrame = null;
      fitGame();
    });
  }
  function fitGame() {
    if ($("game").hidden) return;
    const stage = $("gamefit"),
      body = $("gamebody");
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const top = stage.getBoundingClientRect().top;
    const margin = window.innerWidth <= 580 ? 12 : 20;
    const available = Math.max(1, viewportHeight - top - margin);
    const natural = body.offsetHeight;
    const scale = natural ? Math.min(1, available / natural) : 1;
    body.style.setProperty("--px-game-scale", String(scale));
    stage.style.height = Math.ceil(natural * scale) + "px";
  }
  const gameResize = new ResizeObserver(scheduleFit);
  panelsResize.observe($("achievements-panel"));
  window.addEventListener("resize", alignPanels);
  document.fonts?.ready.then(alignPanels);
  gameResize.observe($("gamebody"));
  window.addEventListener("resize", scheduleFit);
  window.visualViewport?.addEventListener("resize", scheduleFit);
  document.fonts?.ready.then(scheduleFit);
  return { alignPanels, scheduleFit, fitGame };
}
