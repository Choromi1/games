(function () {
  "use strict";

  const config = window.CHOROMI_NOTICE_CONFIG || {};
  const categoryMap = {
    notice: { label: "공지", className: "notice" },
    important: { label: "중요", className: "important" },
    update: { label: "업데이트", className: "update" },
    maintenance: { label: "점검", className: "maintenance" },
    event: { label: "이벤트", className: "event" }
  };
  const fallbackGames = [
    { game_key: "zomboid", name: "Project Zomboid", is_active: true, path: "zomboid/" },
    { game_key: "valheim", name: "Valheim", is_active: true, path: "Valheim/" }
  ];
  const demoNotices = [
    {
      id: "demo-welcome",
      game_key: "zomboid",
      category: "important",
      title: "좀보이드 서버 페이지 구축 안내",
      summary: "공지 시스템 연결 상태를 확인하기 위한 예시 공지입니다.",
      content: "## 서버 페이지 준비 중\n\nSupabase 연결이 완료되면 실제 공개 공지가 표시됩니다.",
      is_pinned: true,
      status: "published",
      published_at: "2026-07-13T09:00:00+09:00",
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

  const client = isConfigured()
    ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
    : null;

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

  async function copyText(value, successMessage = "복사했습니다.") {
    if (!value) {
      showToast("복사할 정보가 없습니다.");
      return false;
    }
    try {
      await navigator.clipboard.writeText(value);
    } catch (error) {
      const area = document.createElement("textarea");
      area.value = value;
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

  function runtimeBasePath() {
    const preview = window.location.pathname.match(/^(.*\/pr-preview\/pr-\d+)\//);
    if (preview) return preview[1];
    if (/^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname)) return "";
    const configuredPath = new URL(String(config.siteBaseUrl || "https://choromi1.github.io/games")).pathname;
    return configuredPath.replace(/\/$/, "");
  }

  function siteUrl(path = "") {
    const normalizedPath = String(path).replace(/^\/+/, "");
    return `${runtimeBasePath()}/${normalizedPath}`;
  }

  function archiveUrl(gameKey = "") {
    const query = gameKey ? `?game=${encodeURIComponent(gameKey)}` : "";
    return siteUrl(`notices/${query}`);
  }

  function noticeUrl(id, gameKey = "") {
    const params = new URLSearchParams();
    if (gameKey) params.set("game", gameKey);
    params.set("id", id);
    return siteUrl(`notices/?${params.toString()}`);
  }

  function getGame(gameKey, games = fallbackGames) {
    return games.find((game) => game.game_key === gameKey) || null;
  }

  function gameUrl(gameKey) {
    const game = getGame(gameKey);
    return game ? siteUrl(game.path) : siteUrl("");
  }

  function normalizeNotice(row) {
    return {
      id: row.id,
      game_key: row.game_key || "zomboid",
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

  async function fetchGames() {
    if (!client) return fallbackGames.slice();
    const { data, error } = await client
      .from("games")
      .select("game_key, name, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (error) throw error;
    return (data || []).map((game) => ({
      ...game,
      path: getGame(game.game_key)?.path || `${game.game_key}/`
    }));
  }

  async function fetchPublishedNotices(limit = 100, gameKey = "") {
    if (!client) {
      return demoNotices
        .filter((notice) => !gameKey || notice.game_key === gameKey)
        .slice(0, limit)
        .map(normalizeNotice);
    }
    let query = client
      .from("notices")
      .select("id, game_key, category, title, summary, content, cover_image_url, is_pinned, status, published_at, created_at, updated_at, author_name")
      .eq("status", "published")
      .lte("published_at", new Date().toISOString());
    if (gameKey) query = query.eq("game_key", gameKey);
    const { data, error } = await query
      .order("is_pinned", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(normalizeNotice);
  }

  async function fetchNotice(id, gameKey = "") {
    if (!id) return null;
    if (!client) {
      const notice = demoNotices.find((item) => item.id === id && (!gameKey || item.game_key === gameKey));
      return notice ? normalizeNotice(notice) : null;
    }
    let query = client
      .from("notices")
      .select("id, game_key, category, title, summary, content, cover_image_url, is_pinned, status, published_at, created_at, updated_at, author_name")
      .eq("id", id)
      .eq("status", "published")
      .lte("published_at", new Date().toISOString());
    if (gameKey) query = query.eq("game_key", gameKey);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data ? normalizeNotice(data) : null;
  }

  function subscribeToNotices(callback, gameKey = "") {
    if (!client || config.notice?.realtime === false) return null;
    const changes = { event: "*", schema: "public", table: "notices" };
    if (gameKey) changes.filter = `game_key=eq.${gameKey}`;
    return client
      .channel(`public-notices-${gameKey || "all"}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", changes, callback)
      .subscribe();
  }

  async function unsubscribe(channel) {
    if (client && channel) await client.removeChannel(channel);
  }

  window.ChoromiNotices = {
    config,
    client,
    categoryMap,
    demoNotices: demoNotices.map(normalizeNotice),
    fallbackGames,
    isConfigured,
    escapeHTML,
    renderMarkdown,
    formatDate,
    categoryInfo,
    showToast,
    copyText,
    runtimeBasePath,
    siteUrl,
    archiveUrl,
    noticeUrl,
    gameUrl,
    getGame,
    normalizeNotice,
    fetchGames,
    fetchPublishedNotices,
    fetchNotice,
    subscribeToNotices,
    unsubscribe
  };
})();
