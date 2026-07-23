(function () {
  "use strict";

  const config = window.ZOMBOID_CONFIG || {};
  const categoryMap = {
    notice: { label: "공지", className: "notice" },
    important: { label: "중요", className: "important" },
    update: { label: "업데이트", className: "update" },
    maintenance: { label: "점검", className: "maintenance" },
    event: { label: "이벤트", className: "event" }
  };

  const demoNotices = [
    {
      id: "demo-welcome",
      category: "important",
      title: "좀보이드 서버 페이지 구축 안내",
      summary: "현재 페이지와 Supabase 공지 시스템을 구축하고 있습니다. 연결이 완료되면 관리자 화면에서 작성한 공지가 즉시 표시됩니다.",
      content: "## 서버 페이지 준비 중\n\n현재 **공지 작성·수정·삭제**, 상단 고정, 공개·비공개, 이미지 첨부 기능을 포함한 관리 시스템을 준비하고 있습니다.\n\n- 일반 방문자: 공개 공지 조회\n- 관리자: 로그인 후 공지 작성 및 관리\n- 오픈 이후: 서버 점검·업데이트·이벤트 공지 게시",
      is_pinned: true,
      status: "published",
      published_at: "2026-07-13T09:00:00+09:00",
      author_name: "Choromi",
      cover_image_url: ""
    },
    {
      id: "demo-modpack",
      category: "update",
      title: "Steam 모드팩 구성 예정",
      summary: "확정된 모드는 Steam 창작마당 컬렉션으로 묶어 한 번에 구독할 수 있도록 제공할 예정입니다.",
      content: "모드 목록이 확정되면 컬렉션 링크와 필수 설치 여부를 안내합니다.",
      is_pinned: false,
      status: "published",
      published_at: "2026-07-12T20:00:00+09:00",
      author_name: "Choromi",
      cover_image_url: ""
    },
    {
      id: "demo-campaign",
      category: "notice",
      title: "서버 진행 방향 안내",
      summary: "초기 생존부터 거점 성장, 특수 지역 탐사, 최종 탈출 작전까지 단계적으로 진행합니다.",
      content: "단순 생존이 아닌 캠페인형 진행을 목표로 합니다.",
      is_pinned: false,
      status: "published",
      published_at: "2026-07-11T19:00:00+09:00",
      author_name: "Choromi",
      cover_image_url: ""
    },
    {
      id: "demo-test",
      category: "maintenance",
      title: "서버 테스트 일정은 추후 공지",
      summary: "모드 목록과 서버 설정이 확정된 뒤 접속 테스트 일정을 안내합니다.",
      content: "테스트 일정은 디스코드와 이 페이지에서 확인할 수 있습니다.",
      is_pinned: false,
      status: "published",
      published_at: "2026-07-10T18:00:00+09:00",
      author_name: "Choromi",
      cover_image_url: ""
    }
  ];

  function isConfigured() {
    const url = String(config.supabaseUrl || "");
    const key = String(config.supabaseAnonKey || "");
    return Boolean(
      window.supabase &&
      /^https:\/\/.+\.supabase\.co$/i.test(url) &&
      key.length > 40 &&
      !url.includes("YOUR_PROJECT") &&
      !key.includes("YOUR_SUPABASE")
    );
  }

  let client = null;
  if (isConfigured()) {
    client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderMarkdown(value) {
    const source = String(value || "");
    if (window.marked && window.DOMPurify) {
      const raw = window.marked.parse(source, { breaks: true, gfm: true });
      return window.DOMPurify.sanitize(raw, {
        USE_PROFILES: { html: true },
        ADD_ATTR: ["target", "rel"]
      });
    }
    return `<p>${escapeHTML(source).replaceAll("\n", "<br>")}</p>`;
  }

  function formatDate(value, includeTime = false) {
    if (!value) return "날짜 미정";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "날짜 미정";
    const options = includeTime
      ? { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul" }
      : { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Seoul" };
    return new Intl.DateTimeFormat("ko-KR", options).format(date);
  }

  function categoryInfo(category) {
    return categoryMap[category] || categoryMap.notice;
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 1800);
  }

  async function copyText(text, successMessage = "복사했습니다.") {
    if (!text) {
      showToast("복사할 정보가 없습니다.");
      return false;
    }
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.focus();
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    showToast(successMessage);
    return true;
  }

  function siteBaseUrl() {
    return String(config.siteBaseUrl || "https://choromi1.github.io/games/zomboid").replace(/\/$/, "");
  }

  function noticeUrl(id) {
    return `${siteBaseUrl()}/notices/?id=${encodeURIComponent(id)}`;
  }

  function normalizeNotice(row) {
    return {
      id: row.id,
      category: row.category || "notice",
      title: row.title || "제목 없음",
      summary: row.summary || "",
      content: row.content || "",
      cover_image_url: row.cover_image_url || "",
      is_pinned: Boolean(row.is_pinned),
      status: row.status || "draft",
      published_at: row.published_at || row.created_at || new Date().toISOString(),
      created_at: row.created_at || null,
      updated_at: row.updated_at || null,
      author_id: row.author_id || null,
      author_name: row.author_name || "Choromi"
    };
  }

  async function fetchPublishedNotices(limit = 100) {
    if (!client) return demoNotices.slice(0, limit).map(normalizeNotice);
    const { data, error } = await client
      .from("notices")
      .select("id, category, title, summary, content, cover_image_url, is_pinned, status, published_at, created_at, updated_at, author_name")
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .order("is_pinned", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(normalizeNotice);
  }

  async function fetchNotice(id) {
    if (!id) return null;
    if (!client) return demoNotices.find((notice) => notice.id === id) || null;
    const { data, error } = await client
      .from("notices")
      .select("id, category, title, summary, content, cover_image_url, is_pinned, status, published_at, created_at, updated_at, author_name")
      .eq("id", id)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return normalizeNotice(data);
  }

  function subscribeToNotices(callback) {
    if (!client || config.notice?.realtime === false) return null;
    return client
      .channel(`public-notices-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notices" }, callback)
      .subscribe();
  }

  async function unsubscribe(channel) {
    if (client && channel) await client.removeChannel(channel);
  }

  function applySiteConfig() {
    const server = config.server || {};
    document.querySelectorAll("[data-game-version]").forEach((el) => { el.textContent = server.gameVersion || "Build 42"; });
    document.querySelectorAll("[data-player-count]").forEach((el) => { el.textContent = server.playerCount || "4~5명"; });
    document.querySelectorAll("[data-server-status]").forEach((el) => { el.textContent = server.status || "준비 중"; });
    document.querySelectorAll("[data-server-message]").forEach((el) => { el.textContent = server.statusMessage || "서버 준비 중입니다."; });
    document.querySelectorAll("[data-open-date]").forEach((el) => { el.textContent = server.openDate || "오픈일 추후 공지"; });
    document.querySelectorAll("[data-current-year]").forEach((el) => { el.textContent = String(new Date().getFullYear()); });

    const address = document.getElementById("server-address");
    const port = document.getElementById("server-port");
    const password = document.getElementById("server-password");
    if (address) address.textContent = server.address || "추후 공개";
    if (port) port.textContent = server.port || "16261";
    if (password) password.textContent = server.passwordLabel || "참가자 별도 안내";

    configureLink(document.getElementById("discord-link"), config.discordInviteUrl, "디스코드 링크 준비 중");
    configureLink(document.getElementById("workshop-link"), config.steamCollectionUrl, "Steam 컬렉션 준비 중");
  }

  function configureLink(element, url, disabledTitle) {
    if (!element) return;
    if (!url || url === "#") {
      element.setAttribute("aria-disabled", "true");
      element.setAttribute("title", disabledTitle);
      element.addEventListener("click", (event) => {
        event.preventDefault();
        showToast(disabledTitle);
      });
      return;
    }
    element.href = url;
    element.removeAttribute("aria-disabled");
  }

  function bindCommonUI() {
    applySiteConfig();

    document.querySelectorAll("[data-copy-page]").forEach((button) => {
      button.addEventListener("click", () => copyText(window.location.href.split("#")[0], "페이지 링크를 복사했습니다."));
    });

    const menuButton = document.querySelector(".mobile-menu-button");
    const navPanel = document.getElementById("nav-panel");
    menuButton?.addEventListener("click", () => {
      const open = navPanel?.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(Boolean(open)));
    });
    navPanel?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
      navPanel.classList.remove("open");
      menuButton?.setAttribute("aria-expanded", "false");
    }));
  }

  window.ZomboidSite = {
    config,
    client,
    categoryMap,
    demoNotices: demoNotices.map(normalizeNotice),
    isConfigured,
    escapeHTML,
    renderMarkdown,
    formatDate,
    categoryInfo,
    showToast,
    copyText,
    siteBaseUrl,
    noticeUrl,
    normalizeNotice,
    fetchPublishedNotices,
    fetchNotice,
    subscribeToNotices,
    unsubscribe,
    applySiteConfig,
    bindCommonUI
  };
})();
