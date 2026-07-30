(() => {
  const mount = document.querySelector("#typing-race");
  if (!mount) return;

  const text =
    "The quick brown fox jumps over the lazy dog. Programming is the art of telling another human what one wants the computer to do. Practice makes perfect when learning new skills.";
  const targetWpm = Number(mount.dataset.targetWpm || 77);
  let leaderboard = { entries: [] };

  try {
    leaderboard = JSON.parse(mount.dataset.leaderboard || '{"entries":[]}');
  } catch {
    // Keep an empty board if build-time content is malformed.
  }

  const state = {
    status: "waiting",
    input: "",
    startedAt: 0,
    countdownTimer: 0,
    animationFrame: 0,
    scrollFrame: 0,
    result: null,
  };

  const escapeHtml = (value = "") =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  mount.innerHTML = `
    <div class="race-card">
      <div class="race-toolbar">
        <span data-race-status>Ready when you are</span>
        <div class="race-actions">
          <button type="button" data-race-reset hidden>Reset</button>
          <button type="button" data-race-leaders>Leaderboard</button>
        </div>
      </div>
      <div class="race-stage" data-race-stage>
        <div class="race-text" data-race-text aria-live="polite"></div>
        <div class="ai-progress" aria-label="Opponent progress"><span data-ai-progress></span></div>
        <p class="race-hint">Your cursor is yellow. The line shows the opponent’s progress.</p>
        <button class="button primary race-start" type="button" data-race-start>Start race</button>
        <textarea class="race-input" data-race-input aria-label="Type the race text" autocomplete="off" autocapitalize="off" spellcheck="false"></textarea>
        <div data-countdown></div>
      </div>
    </div>
    <div data-race-dialog></div>`;

  const elements = {
    status: mount.querySelector("[data-race-status]"),
    reset: mount.querySelector("[data-race-reset]"),
    leaders: mount.querySelector("[data-race-leaders]"),
    stage: mount.querySelector("[data-race-stage]"),
    text: mount.querySelector("[data-race-text]"),
    progress: mount.querySelector("[data-ai-progress]"),
    start: mount.querySelector("[data-race-start]"),
    input: mount.querySelector("[data-race-input]"),
    countdown: mount.querySelector("[data-countdown]"),
    dialog: mount.querySelector("[data-race-dialog]"),
  };

  function smoothScrollTo(target) {
    cancelAnimationFrame(state.scrollFrame);
    const start = elements.text.scrollLeft;
    const distance = target - start;
    if (Math.abs(distance) < 1) return;

    const startedAt = performance.now();
    const duration = 260;
    const step = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      elements.text.scrollLeft = start + distance * eased;
      if (progress < 1) state.scrollFrame = requestAnimationFrame(step);
    };
    state.scrollFrame = requestAnimationFrame(step);
  }

  function renderText() {
    if (elements.text.childElementCount !== text.length) {
      const characters = [...text].map((character) => {
        const span = document.createElement("span");
        span.textContent = character === " " ? "\u00a0" : character;
        return span;
      });
      elements.text.replaceChildren(...characters);
    }

    const characters = elements.text.children;
    for (let index = 0; index < characters.length; index += 1) {
      let className = "";
      if (index < state.input.length) {
        className = state.input[index] === text[index] ? "correct" : "incorrect";
      } else if (index === state.input.length && state.status === "racing") {
        className = "current";
      }
      characters[index].className = className;
    }

    if (state.status === "racing") {
      const cursor = elements.text.querySelector(".current");
      if (cursor) {
        const desired = cursor.offsetLeft - elements.text.clientWidth * 0.32;
        const maximum = elements.text.scrollWidth - elements.text.clientWidth;
        smoothScrollTo(Math.min(Math.max(0, desired), maximum));
      }
    } else if (state.status === "waiting") {
      cancelAnimationFrame(state.scrollFrame);
      elements.text.scrollLeft = 0;
    }
  }

  function elapsedMinutes() {
    return Math.max((performance.now() - state.startedAt) / 60000, 1 / 60000);
  }

  function getTopPercentile(score) {
    const bins = [
      { min: 0, max: 9, count: 131 },
      { min: 10, max: 19, count: 1342 },
      { min: 20, max: 29, count: 6281 },
      { min: 30, max: 39, count: 17908 },
      { min: 40, max: 49, count: 33854 },
      { min: 50, max: 59, count: 47847 },
      { min: 60, max: 69, count: 55820 },
      { min: 70, max: 79, count: 55417 },
      { min: 80, max: 89, count: 48560 },
      { min: 90, max: 99, count: 39255 },
      { min: 100, max: 109, count: 31469 },
      { min: 110, max: 119, count: 20420 },
      { min: 120, max: 129, count: 13466 },
      { min: 130, max: 139, count: 7794 },
      { min: 140, max: 149, count: 4554 },
      { min: 150, max: 159, count: 2518 },
      { min: 160, max: 169, count: 1278 },
      { min: 170, max: 179, count: 606 },
      { min: 180, max: 189, count: 291 },
      { min: 190, max: 199, count: 134 },
      { min: 200, max: 209, count: 81 },
      { min: 210, max: 219, count: 25 },
      { min: 220, max: 229, count: 23 },
      { min: 230, max: 239, count: 7 },
      { min: 240, max: 249, count: 8 },
      { min: 250, max: 259, count: 4 },
      { min: 260, max: 269, count: 3 },
      { min: 270, max: 279, count: 3 },
    ];
    const total = bins.reduce((sum, bin) => sum + bin.count, 0);
    let countAbove = 0;
    for (const bin of bins) {
      if (score < bin.min) countAbove += bin.count;
      else if (score <= bin.max) {
        countAbove += (bin.count * (bin.max - score)) / (bin.max - bin.min + 1);
      }
    }
    return Math.round((countAbove / total) * 10000) / 100;
  }

  function calculateResult() {
    const userWpm = Math.round(state.input.length / 5 / elapsedMinutes());
    const mistakes = [...state.input].reduce(
      (total, character, index) => total + Number(character !== text[index]),
      0,
    );
    const accuracy = state.input.length
      ? Math.round(((state.input.length - mistakes) / state.input.length) * 100)
      : 0;
    return {
      userWpm,
      aiWpm: targetWpm,
      mistakes,
      accuracy,
      percentile: getTopPercentile(userWpm),
      winner: userWpm > targetWpm ? "user" : userWpm < targetWpm ? "ai" : "tie",
    };
  }

  function updateFrame(now) {
    if (state.status !== "racing") return;
    const elapsedMinutesValue = Math.max((now - state.startedAt) / 60000, 0);
    const aiCharacters = Math.min(text.length, elapsedMinutesValue * targetWpm * 5);
    elements.progress.style.width = `${(aiCharacters / text.length) * 100}%`;

    if (aiCharacters >= text.length) {
      finish();
      return;
    }
    state.animationFrame = requestAnimationFrame(updateFrame);
  }

  function start() {
    reset(false);
    state.status = "countdown";
    elements.start.hidden = true;
    elements.reset.hidden = false;
    elements.status.textContent = "Get ready";
    let count = 3;
    elements.countdown.innerHTML = `<div class="countdown">${count}</div>`;

    state.countdownTimer = window.setInterval(() => {
      count -= 1;
      if (count > 0) {
        elements.countdown.innerHTML = `<div class="countdown">${count}</div>`;
        return;
      }

      clearInterval(state.countdownTimer);
      elements.countdown.innerHTML = "";
      state.status = "racing";
      state.startedAt = performance.now();
      elements.status.textContent = "0 words · racing";
      elements.input.disabled = false;
      elements.input.focus();
      renderText();
      state.animationFrame = requestAnimationFrame(updateFrame);
    }, 850);
  }

  function finish() {
    if (state.status !== "racing") return;
    state.status = "finished";
    cancelAnimationFrame(state.animationFrame);
    cancelAnimationFrame(state.scrollFrame);
    elements.input.disabled = true;
    state.result = calculateResult();
    renderText();
    elements.status.textContent =
      state.result.winner === "user" ? "You won the race" : "Race finished";
    showResults();
  }

  function reset(showButton = true) {
    clearInterval(state.countdownTimer);
    cancelAnimationFrame(state.animationFrame);
    cancelAnimationFrame(state.scrollFrame);
    state.status = "waiting";
    state.input = "";
    state.result = null;
    elements.input.value = "";
    elements.input.disabled = true;
    elements.progress.style.width = "0";
    elements.countdown.innerHTML = "";
    elements.dialog.innerHTML = "";
    elements.start.hidden = !showButton;
    elements.reset.hidden = true;
    elements.status.textContent = "Ready when you are";
    renderText();
  }

  function closeDialog() {
    elements.dialog.innerHTML = "";
    if (state.status === "racing") elements.input.focus();
  }

  function dialog(content) {
    elements.dialog.innerHTML = `<div class="dialog-backdrop" data-dialog-backdrop>
      <section class="dialog" role="dialog" aria-modal="true">${content}</section>
    </div>`;
    elements.dialog.querySelector("[data-dialog-close]")?.addEventListener("click", closeDialog);
    elements.dialog.querySelector("[data-dialog-backdrop]")?.addEventListener("click", (event) => {
      if (event.target === event.currentTarget) closeDialog();
    });
  }

  function showResults() {
    const result = state.result;
    const eligible = result.winner === "user" && result.accuracy === 100;
    const headline =
      result.winner === "user" ? "You beat me." : result.winner === "tie" ? "Dead heat." : "Not this time.";
    dialog(`<div class="dialog-header">
        <div><p class="section-kicker">Race result</p><h3>${headline}</h3></div>
        <button class="dialog-close" type="button" data-dialog-close aria-label="Close">×</button>
      </div>
      <p>${eligible ? "Perfect run. Add your score to the leaderboard." : "Win with 100% accuracy to submit a score."}</p>
      <div class="result-grid">
        <div><span>Your speed</span><strong>${result.userWpm} WPM</strong></div>
        <div><span>Accuracy</span><strong>${result.accuracy}%</strong></div>
        <div><span>Mistakes</span><strong>${result.mistakes}</strong></div>
      </div>
      <p class="form-status">Top ${result.percentile}% percentile on MonkeyType.</p>
      ${eligible ? `<form class="submit-score" data-score-form>
        <input maxlength="30" name="name" placeholder="Your name" aria-label="Your name" required>
        <button type="submit">Submit score</button>
      </form><p class="form-status" data-form-status></p>` : ""}
      <div class="result-actions">
        <button class="button primary" type="button" data-race-again>Race again</button>
        <button class="button quiet" type="button" data-show-leaders>Leaderboard</button>
      </div>`);

    elements.dialog.querySelector("[data-race-again]")?.addEventListener("click", () => {
      closeDialog();
      start();
    });
    elements.dialog.querySelector("[data-show-leaders]")?.addEventListener("click", showLeaderboard);
    elements.dialog.querySelector("[data-score-form]")?.addEventListener("submit", submitScore);
  }

  async function submitScore(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button");
    const status = elements.dialog.querySelector("[data-form-status]");
    const name = new FormData(form).get("name")?.toString().trim();
    if (!name) return;

    button.disabled = true;
    button.textContent = "Submitting…";
    status.textContent = "";

    try {
      const response = await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ Name: name, WPM: state.result.userWpm }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not submit score");
      status.textContent = "Score submitted. Nice run.";
      button.textContent = "Submitted";
      leaderboard.entries.push({
        rank: leaderboard.entries.length + 1,
        Name: name,
        WPM: state.result.userWpm,
        Date: "Now",
      });
    } catch (error) {
      status.textContent = error.message;
      button.disabled = false;
      button.textContent = "Try again";
    }
  }

  function showLeaderboard() {
    const entries = [...(leaderboard.entries || [])].sort(
      (a, b) => Number(b.WPM) - Number(a.WPM),
    );
    dialog(`<div class="dialog-header">
        <div><p class="section-kicker">Fast hands</p><h3>Leaderboard</h3></div>
        <button class="dialog-close" type="button" data-dialog-close aria-label="Close">×</button>
      </div>
      <ol class="leaderboard">${entries.length
        ? entries.map((entry, index) => `<li>
            <span class="leaderboard-rank">${String(index + 1).padStart(2, "0")}</span>
            <strong>${escapeHtml(entry.Name)}</strong>
            <span><b>${escapeHtml(entry.WPM)} WPM</b><small class="leaderboard-date">${escapeHtml(entry.Date || "")}</small></span>
          </li>`).join("")
        : "<li>No scores yet. Set the first one.</li>"}
      </ol>`);
  }

  elements.input.addEventListener("input", () => {
    if (state.status !== "racing") return;
    state.input = elements.input.value.slice(0, text.length);
    elements.input.value = state.input;
    const words = state.input.trim() ? state.input.trim().split(/\s+/).length : 0;
    elements.status.textContent = `${words} words · racing`;
    renderText();
    if (state.input.length === text.length) finish();
  });

  elements.input.addEventListener("paste", (event) => {
    event.preventDefault();
    elements.status.textContent = "No pasting — nice try";
  });
  elements.input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") reset();
  });
  elements.stage.addEventListener("click", () => {
    if (state.status === "racing") elements.input.focus();
  });
  elements.start.addEventListener("click", start);
  elements.reset.addEventListener("click", () => reset());
  elements.leaders.addEventListener("click", showLeaderboard);

  reset();
})();
