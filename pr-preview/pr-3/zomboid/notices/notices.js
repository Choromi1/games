(function () {
  "use strict";

  const site = window.ZomboidSite;
  if (!site) return;

  const archiveView = document.getElementById("archive-view");
  const detailView = document.getElementById("detail-view");
  const listElement = document.getElementById("notice-list");
  const pagination = document.getElementById("pagination");
  const filters = document.getElementById("notice-filters");
  const searchInput = document.getElementById("notice-search");
  const demoBanner = document.getElementById("supabase-demo-banner");

  let notices = [];
  let activeCategory = "all";
  let currentPage = 1;
  let channel = null;

  const categories = [
    ["all", "전체"],
    ["important", "중요"],
    ["notice", "공지"],
    ["update", "업데이트"],
    ["maintenance", "점검"],
    ["event", "이벤트"]
  ];

  function badge(notice) {
    const info = site.categoryInfo(notice.category);
    return `<span class="notice-badge ${site.escapeHTML(info.className)}">${site.escapeHTML(info.label)}</span>`;
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
    const pageSize = Number(site.config.notice?.pageSize || 8);
    const list = filteredNotices();
    const pageCount = Math.max(1, Math.ceil(list.length / pageSize));
    currentPage = Math.min(currentPage, pageCount);
    const start = (currentPage - 1) * pageSize;
    const visible = list.slice(start, start + pageSize);

    if (!visible.length) {
      listElement.innerHTML = `<div class="notice-empty"><strong>조건에 맞는 공지가 없습니다.</strong><p>검색어 또는 필터를 변경해 주세요.</p></div>`;
    } else {
      listElement.innerHTML = visible.map((notice) => `
        <a class="archive-card" href="?id=${encodeURIComponent(notice.id)}">
          <time datetime="${site.escapeHTML(notice.published_at)}">${site.formatDate(notice.published_at)}</time>
          <div>
            <div class="notice-topline">${badge(notice)}${notice.is_pinned ? '<span class="notice-pin">● 고정</span>' : ""}</div>
            <h3>${site.escapeHTML(notice.title)}</h3>
            <p>${site.escapeHTML(notice.summary || "자세한 내용은 공지 본문에서 확인해 주세요.")}</p>
          </div>
          <span class="arrow">→</span>
        </a>
      `).join("");
    }

    pagination.innerHTML = pageCount <= 1 ? "" : Array.from({ length: pageCount }, (_, index) => {
      const page = index + 1;
      return `<button type="button" class="${page === currentPage ? "active" : ""}" data-page="${page}" aria-label="${page}페이지">${page}</button>`;
    }).join("");
  }

  async function renderDetail(id) {
    archiveView.classList.add("hidden");
    detailView.classList.remove("hidden");
    detailView.innerHTML = `<div class="notice-skeleton"></div>`;

    try {
      const notice = await site.fetchNotice(id);
      if (!notice) {
        detailView.innerHTML = `
          <div class="notice-empty"><strong>공지를 찾을 수 없습니다.</strong><p>삭제되었거나 공개되지 않은 공지입니다.</p><a class="button primary small" href="./">공지 목록으로</a></div>
        `;
        return;
      }
      document.title = `${notice.title} | Choromi Project Zomboid`;
      detailView.innerHTML = `
        <div class="notice-detail-head">
          <div class="notice-topline">${badge(notice)}${notice.is_pinned ? '<span class="notice-pin">● 상단 고정</span>' : ""}<time class="notice-date" datetime="${site.escapeHTML(notice.published_at)}">${site.formatDate(notice.published_at, true)}</time></div>
          <h1>${site.escapeHTML(notice.title)}</h1>
          ${notice.summary ? `<p class="notice-detail-summary">${site.escapeHTML(notice.summary)}</p>` : ""}
          <p class="notice-date">작성자 ${site.escapeHTML(notice.author_name || "Choromi")}</p>
        </div>
        ${notice.cover_image_url ? `<div class="notice-cover"><img src="${site.escapeHTML(notice.cover_image_url)}" alt="" /></div>` : ""}
        <div class="markdown-body">${site.renderMarkdown(notice.content)}</div>
        <div class="notice-detail-actions">
          <a class="button secondary small" href="./">목록으로</a>
          <button class="button primary small" type="button" id="copy-detail-link">공지 링크 복사</button>
        </div>
      `;
      document.getElementById("copy-detail-link")?.addEventListener("click", () => site.copyText(window.location.href, "공지 링크를 복사했습니다."));
    } catch (error) {
      console.error(error);
      detailView.innerHTML = `<div class="notice-empty"><strong>공지를 불러오지 못했습니다.</strong><p>잠시 후 다시 시도해 주세요.</p><a class="button primary small" href="./">공지 목록으로</a></div>`;
    }
  }

  async function loadNotices() {
    try {
      notices = await site.fetchPublishedNotices(100);
      renderList();
    } catch (error) {
      console.error(error);
      notices = site.demoNotices;
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
    site.bindCommonUI();
    renderFilters();
    bindUI();
    if (!site.isConfigured()) demoBanner.classList.remove("hidden");

    const id = new URLSearchParams(window.location.search).get("id");
    if (id) {
      await renderDetail(id);
    } else {
      await loadNotices();
      channel = site.subscribeToNotices(() => loadNotices());
    }
  }

  window.addEventListener("beforeunload", () => site.unsubscribe(channel));
  init();
})();
