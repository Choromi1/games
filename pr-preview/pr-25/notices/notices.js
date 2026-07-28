(function () {
  "use strict";

  const site = window.ChoromiNotices;
  if (!site) return;

  const params = new URLSearchParams(window.location.search);
  const requestedGameKey = String(params.get("game") || "").trim().toLowerCase();
  const noticeId = params.get("id");
  const archiveView = document.getElementById("archive-view");
  const detailView = document.getElementById("detail-view");
  const listElement = document.getElementById("notice-list");
  const pagination = document.getElementById("pagination");
  const filters = document.getElementById("notice-filters");
  const searchInput = document.getElementById("notice-search");
  const demoBanner = document.getElementById("supabase-demo-banner");
  const invalidBanner = document.getElementById("invalid-game-banner");
  const gameSwitch = document.getElementById("game-switch");
  const gamePageLink = document.getElementById("selected-game-link");

  let games = site.fallbackGames.slice();
  let selectedGame = null;
  let notices = [];
  let activeCategory = "all";
  let currentPage = 1;
  let channel = null;
  let invalidGame = false;

  const categories = [
    ["all", "전체"],
    ["important", "중요"],
    ["notice", "공지"],
    ["update", "업데이트"],
    ["maintenance", "점검"],
    ["event", "이벤트"]
  ];

  function categoryBadge(notice) {
    const info = site.categoryInfo(notice.category);
    return `<span class="notice-badge ${site.escapeHTML(info.className)}">${site.escapeHTML(info.label)}</span>`;
  }

  function gameBadge(notice) {
    const game = site.getGame(notice.game_key, games);
    return `<span class="game-badge ${site.escapeHTML(notice.game_key)}">${site.escapeHTML(game?.name || notice.game_key)}</span>`;
  }

  function queryUrl(id = "") {
    const query = new URLSearchParams();
    if (requestedGameKey && !invalidGame) query.set("game", requestedGameKey);
    if (id) query.set("id", id);
    const value = query.toString();
    return value ? `?${value}` : "./";
  }

  function configureGameContext() {
    selectedGame = requestedGameKey ? site.getGame(requestedGameKey, games) : null;
    invalidGame = Boolean(requestedGameKey && !selectedGame);
    const title = document.getElementById("archive-title");
    const description = document.getElementById("archive-description");

    gameSwitch.innerHTML = [
      `<a class="game-chip${requestedGameKey ? "" : " active"}" href="./">전체 게임</a>`,
      ...games.map((game) => `<a class="game-chip${selectedGame?.game_key === game.game_key ? " active" : ""}" href="?game=${encodeURIComponent(game.game_key)}">${site.escapeHTML(game.name)}</a>`)
    ].join("");

    if (invalidGame) {
      title.textContent = "잘못된 게임 주소";
      description.textContent = "등록되지 않은 게임 키로 접근했습니다.";
      invalidBanner.textContent = `‘${requestedGameKey}’ 게임은 공지 대상에 등록되어 있지 않습니다. 위에서 올바른 게임을 선택해 주세요.`;
      invalidBanner.classList.remove("hidden");
      gamePageLink.classList.add("hidden");
      document.title = "잘못된 게임 주소 | Choromi 공지";
      return;
    }

    if (selectedGame) {
      title.textContent = `${selectedGame.name} 공지`;
      description.textContent = `${selectedGame.name} 서버의 점검, 업데이트, 이벤트와 운영 안내입니다.`;
      gamePageLink.href = site.gameUrl(selectedGame.game_key);
      gamePageLink.textContent = `${selectedGame.name} 페이지`;
      document.title = `${selectedGame.name} 공지 | Choromi`;
    } else {
      title.textContent = "게임 서버 공지";
      description.textContent = "게임별 점검, 업데이트, 이벤트와 주요 운영 안내를 확인할 수 있습니다.";
      gamePageLink.href = site.siteUrl("");
      gamePageLink.textContent = "게임 선택 화면";
    }
  }

  function renderFilters() {
    filters.innerHTML = categories.map(([value, label]) => `
      <button class="filter-chip${activeCategory === value ? " active" : ""}" type="button" data-category="${value}">${label}</button>
    `).join("");
  }

  function filteredNotices() {
    const keyword = String(searchInput.value || "").trim().toLocaleLowerCase("ko-KR");
    return notices.filter((notice) => {
      const categoryMatches = activeCategory === "all" || notice.category === activeCategory;
      const haystack = `${notice.title} ${notice.summary} ${notice.content}`.toLocaleLowerCase("ko-KR");
      return categoryMatches && (!keyword || haystack.includes(keyword));
    });
  }

  function renderList() {
    if (invalidGame) {
      listElement.innerHTML = "";
      pagination.innerHTML = "";
      return;
    }
    const pageSize = Number(site.config.notice?.pageSize || 8);
    const list = filteredNotices();
    const pageCount = Math.max(1, Math.ceil(list.length / pageSize));
    currentPage = Math.min(currentPage, pageCount);
    const start = (currentPage - 1) * pageSize;
    const visible = list.slice(start, start + pageSize);

    listElement.innerHTML = visible.length
      ? visible.map((notice) => `
        <a class="archive-card" href="${queryUrl(notice.id)}">
          <time datetime="${site.escapeHTML(notice.published_at)}">${site.formatDate(notice.published_at)}</time>
          <div>
            <div class="notice-topline">
              ${gameBadge(notice)}
              ${categoryBadge(notice)}
              ${notice.is_pinned ? '<span class="notice-pin">● 고정</span>' : ""}
            </div>
            <h3>${site.escapeHTML(notice.title)}</h3>
            <p>${site.escapeHTML(notice.summary || "자세한 내용은 공지 본문에서 확인해 주세요.")}</p>
          </div>
          <span class="arrow">→</span>
        </a>
      `).join("")
      : `<div class="notice-empty"><strong>조건에 맞는 공지가 없습니다.</strong><p>검색어 또는 필터를 변경해 주세요.</p></div>`;

    pagination.innerHTML = pageCount <= 1 ? "" : Array.from({ length: pageCount }, (_, index) => {
      const page = index + 1;
      return `<button type="button" class="${page === currentPage ? "active" : ""}" data-page="${page}" aria-label="${page}페이지">${page}</button>`;
    }).join("");
  }

  async function renderDetail(id) {
    archiveView.classList.add("hidden");
    detailView.classList.remove("hidden");
    detailView.innerHTML = `<div class="notice-skeleton"></div>`;

    if (invalidGame) {
      detailView.innerHTML = `<div class="notice-empty"><strong>잘못된 게임 주소입니다.</strong><p>등록된 게임을 선택해 주세요.</p><a class="button primary small" href="./">전체 공지로</a></div>`;
      return;
    }

    try {
      const notice = await site.fetchNotice(id, selectedGame?.game_key || "");
      if (!notice) {
        detailView.innerHTML = `<div class="notice-empty"><strong>공지를 찾을 수 없습니다.</strong><p>삭제되었거나 공개되지 않은 공지입니다.</p><a class="button primary small" href="${queryUrl()}">공지 목록으로</a></div>`;
        return;
      }
      const noticeGame = site.getGame(notice.game_key, games);
      document.title = `${notice.title} | ${noticeGame?.name || "Choromi"}`;
      detailView.innerHTML = `
        <div class="notice-detail-head">
          <div class="notice-topline">
            ${gameBadge(notice)}
            ${categoryBadge(notice)}
            ${notice.is_pinned ? '<span class="notice-pin">● 상단 고정</span>' : ""}
            <time class="notice-date" datetime="${site.escapeHTML(notice.published_at)}">${site.formatDate(notice.published_at, true)}</time>
          </div>
          <h1>${site.escapeHTML(notice.title)}</h1>
          ${notice.summary ? `<p class="notice-detail-summary">${site.escapeHTML(notice.summary)}</p>` : ""}
          <p class="notice-date">작성자 ${site.escapeHTML(notice.author_name || "Choromi")}</p>
        </div>
        ${notice.cover_image_url ? `<div class="notice-cover"><img src="${site.escapeHTML(notice.cover_image_url)}" alt="" /></div>` : ""}
        <div class="markdown-body">${site.renderMarkdown(notice.content)}</div>
        <div class="notice-detail-actions">
          <a class="button secondary small" href="${queryUrl()}">목록으로</a>
          <a class="button secondary small" href="${site.gameUrl(notice.game_key)}">${site.escapeHTML(noticeGame?.name || notice.game_key)} 페이지</a>
          <button class="button primary small" type="button" id="copy-detail-link">공지 링크 복사</button>
        </div>
      `;
      document.getElementById("copy-detail-link")?.addEventListener("click", () => site.copyText(window.location.href, "공지 링크를 복사했습니다."));
    } catch (error) {
      console.error(error);
      detailView.innerHTML = `<div class="notice-empty"><strong>공지를 불러오지 못했습니다.</strong><p>잠시 후 다시 시도해 주세요.</p><a class="button primary small" href="${queryUrl()}">공지 목록으로</a></div>`;
    }
  }

  async function loadNotices() {
    if (invalidGame) {
      renderList();
      return;
    }
    try {
      notices = await site.fetchPublishedNotices(100, selectedGame?.game_key || "");
      renderList();
    } catch (error) {
      console.error(error);
      notices = site.demoNotices.filter((notice) => !selectedGame || notice.game_key === selectedGame.game_key);
      renderList();
      site.showToast("공지 연결에 실패해 예시 데이터를 표시합니다.");
    }
  }

  function bindUI() {
    filters.addEventListener("click", (event) => {
      const button = event.target.closest("[data-category]");
      if (!button) return;
      activeCategory = button.dataset.category;
      currentPage = 1;
      renderFilters();
      renderList();
    });
    searchInput.addEventListener("input", () => {
      currentPage = 1;
      renderList();
    });
    pagination.addEventListener("click", (event) => {
      const button = event.target.closest("[data-page]");
      if (!button) return;
      currentPage = Number(button.dataset.page);
      renderList();
      archiveView.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function init() {
    if (!site.isConfigured()) demoBanner.classList.remove("hidden");
    try {
      games = await site.fetchGames();
    } catch (error) {
      console.warn("게임 목록을 불러오지 못해 기본 목록을 사용합니다.", error);
    }
    configureGameContext();
    renderFilters();
    bindUI();
    if (noticeId) {
      await renderDetail(noticeId);
    } else {
      await loadNotices();
      if (!invalidGame) channel = site.subscribeToNotices(loadNotices, selectedGame?.game_key || "");
    }
  }

  window.addEventListener("beforeunload", () => site.unsubscribe(channel));
  init();
})();
