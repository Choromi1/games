(function () {
  "use strict";

  const site = window.ZomboidSite;
  if (!site) return;

  const featured = document.getElementById("featured-notice");
  const recentContainer = document.getElementById("recent-notices");
  const demoBanner = document.getElementById("supabase-demo-banner");
  const modGrid = document.getElementById("mod-grid");
  const modFilters = document.getElementById("mod-filters");
  const modSearch = document.getElementById("mod-search");
  const modCount = document.getElementById("mod-count");

  let noticeChannel = null;
  let activeModCategory = "전체";

  function noticeBadge(notice) {
    const info = site.categoryInfo(notice.category);
    return `<span class="notice-badge ${site.escapeHTML(info.className)}">${site.escapeHTML(info.label)}</span>`;
  }

  function renderFeatured(notice) {
    if (!featured) return;
    if (!notice) {
      featured.className = "featured-notice";
      featured.innerHTML = `<div class="notice-empty"><strong>등록된 공지가 없습니다.</strong><p>새로운 소식이 등록되면 이곳에 표시됩니다.</p></div>`;
      return;
    }

    const image = notice.cover_image_url
      ? `<div class="featured-notice-image"><img src="${site.escapeHTML(notice.cover_image_url)}" alt="" loading="lazy"></div>`
      : "";

    featured.className = `featured-notice${image ? " has-image" : ""}`;
    featured.innerHTML = `
      <div class="featured-notice-content">
        <div class="notice-topline">
          ${noticeBadge(notice)}
          ${notice.is_pinned ? '<span class="notice-pin">● 상단 고정</span>' : ""}
          <time class="notice-date" datetime="${site.escapeHTML(notice.published_at)}">${site.formatDate(notice.published_at)}</time>
        </div>
        <h3>${site.escapeHTML(notice.title)}</h3>
        <p class="summary">${site.escapeHTML(notice.summary || "자세한 내용은 공지 본문에서 확인해 주세요.")}</p>
        <div class="notice-actions">
          <a class="button primary small" href="${site.noticeUrl(notice.id)}">공지 자세히 보기</a>
          <button class="button secondary small" type="button" data-copy-notice="${site.escapeHTML(notice.id)}">공지 링크 복사</button>
        </div>
      </div>
      ${image}
    `;
  }

  function renderRecent(notices) {
    if (!recentContainer) return;
    const recentCount = Number(site.config.notice?.homeRecentCount || 3);
    const list = notices.slice(1, recentCount + 1);
    if (!list.length) {
      recentContainer.innerHTML = "";
      return;
    }
    recentContainer.innerHTML = list.map((notice) => `
      <a class="notice-card" href="${site.noticeUrl(notice.id)}">
        <div class="notice-topline">
          ${noticeBadge(notice)}
          <time class="notice-date" datetime="${site.escapeHTML(notice.published_at)}">${site.formatDate(notice.published_at)}</time>
        </div>
        <h3>${site.escapeHTML(notice.title)}</h3>
        <p>${site.escapeHTML(notice.summary || notice.content || "")}</p>
        <footer>${site.escapeHTML(notice.author_name || "Choromi")}</footer>
      </a>
    `).join("");
  }

  async function loadNotices() {
    try {
      const notices = await site.fetchPublishedNotices(12);
      renderFeatured(notices[0]);
      renderRecent(notices);
    } catch (error) {
      console.error("공지 로딩 실패", error);
      renderFeatured(site.demoNotices[0]);
      renderRecent(site.demoNotices);
      site.showToast("공지 연결에 실패해 예시 데이터를 표시합니다.");
    }
  }

  function bindNoticeActions() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-copy-notice]");
      if (!button) return;
      site.copyText(site.noticeUrl(button.dataset.copyNotice), "공지 링크를 복사했습니다.");
    });
  }

  function renderModFilters() {
    if (!modFilters) return;
    const mods = Array.isArray(window.ZOMBOID_MODS) ? window.ZOMBOID_MODS : [];
    const categories = ["전체", ...new Set(mods.map((mod) => mod.category))];
    modFilters.innerHTML = categories.map((category) => `
      <button class="filter-chip${category === activeModCategory ? " active" : ""}" type="button" data-mod-category="${site.escapeHTML(category)}">${site.escapeHTML(category)}</button>
    `).join("");
  }

  function filteredMods() {
    const mods = Array.isArray(window.ZOMBOID_MODS) ? window.ZOMBOID_MODS : [];
    const keyword = String(modSearch?.value || "").trim().toLocaleLowerCase("ko-KR");
    return mods.filter((mod) => {
      const categoryMatches = activeModCategory === "전체" || mod.category === activeModCategory;
      const haystack = `${mod.name} ${mod.category} ${mod.description} ${mod.note} ${mod.status}`.toLocaleLowerCase("ko-KR");
      return categoryMatches && (!keyword || haystack.includes(keyword));
    });
  }

  function renderMods() {
    if (!modGrid) return;
    const mods = filteredMods();
    if (modCount) modCount.textContent = String(mods.length);
    if (!mods.length) {
      modGrid.innerHTML = `<div class="notice-empty">조건에 맞는 모드가 없습니다.</div>`;
      return;
    }

    modGrid.innerHTML = mods.map((mod, index) => {
      const workshopLink = mod.workshopUrl
        ? `<a href="${site.escapeHTML(mod.workshopUrl)}" target="_blank" rel="noopener">Workshop 열기 →</a>`
        : `<span class="muted">링크 추후 등록</span>`;
      return `
        <article class="mod-card" data-index="${String(index + 1).padStart(2, "0")}">
          <div class="mod-card-top">
            <span class="mod-tag">${site.escapeHTML(mod.category)}</span>
            <span class="mod-tag ${mod.required ? "required" : ""}">${mod.required ? "필수" : "선택"}</span>
            <span class="mod-tag">${site.escapeHTML(mod.status || "검토 중")}</span>
          </div>
          <h3>${site.escapeHTML(mod.name)}</h3>
          <p>${site.escapeHTML(mod.description)}</p>
          <p class="mod-note">${site.escapeHTML(mod.note || "")}</p>
          <footer>${workshopLink}</footer>
        </article>
      `;
    }).join("");
  }

  function bindModUI() {
    modFilters?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-mod-category]");
      if (!button) return;
      activeModCategory = button.dataset.modCategory;
      renderModFilters();
      renderMods();
    });
    modSearch?.addEventListener("input", renderMods);

    const workshopCopy = document.getElementById("copy-workshop-link");
    workshopCopy?.addEventListener("click", () => {
      const url = site.config.steamCollectionUrl;
      if (!url) {
        site.showToast("Steam 컬렉션 링크가 아직 등록되지 않았습니다.");
        return;
      }
      site.copyText(url, "Steam 컬렉션 링크를 복사했습니다.");
    });
  }

  function bindServerActions() {
    document.getElementById("copy-server-address")?.addEventListener("click", () => {
      const server = site.config.server || {};
      if (!server.address) {
        site.showToast("서버 주소가 아직 공개되지 않았습니다.");
        return;
      }
      const value = server.port ? `${server.address}:${server.port}` : server.address;
      site.copyText(value, "서버 주소를 복사했습니다.");
    });
  }

  async function init() {
    site.bindCommonUI();
    if (!site.isConfigured()) demoBanner?.classList.remove("hidden");
    bindNoticeActions();
    bindModUI();
    bindServerActions();
    renderModFilters();
    renderMods();
    await loadNotices();
    noticeChannel = site.subscribeToNotices(() => loadNotices());
  }

  window.addEventListener("beforeunload", () => site.unsubscribe(noticeChannel));
  init();
})();
