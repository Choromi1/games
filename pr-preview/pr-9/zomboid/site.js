(function () {
  "use strict";

  const config = window.ZOMBOID_CONFIG || {};
  const notices = window.ChoromiNotices;
  if (!notices) return;

  function applySiteConfig() {
    const server = config.server || {};
    document.querySelectorAll("[data-game-version]").forEach((element) => { element.textContent = server.gameVersion || "Build 42"; });
    document.querySelectorAll("[data-player-count]").forEach((element) => { element.textContent = server.playerCount || "4~5명"; });
    document.querySelectorAll("[data-server-status]").forEach((element) => { element.textContent = server.status || "준비 중"; });
    document.querySelectorAll("[data-server-message]").forEach((element) => { element.textContent = server.statusMessage || "서버 준비 중입니다."; });
    document.querySelectorAll("[data-open-date]").forEach((element) => { element.textContent = server.openDate || "오픈일 추후 공지"; });

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
        notices.showToast(disabledTitle);
      });
      return;
    }
    element.href = url;
    element.removeAttribute("aria-disabled");
  }

  function bindCommonUI() {
    applySiteConfig();
    document.querySelectorAll("[data-copy-page]").forEach((button) => {
      button.addEventListener("click", () => notices.copyText(window.location.href.split("#")[0], "페이지 링크를 복사했습니다."));
    });
  }

  window.ZomboidSite = {
    ...notices,
    config: {
      ...config,
      notice: notices.config.notice
    },
    demoNotices: notices.demoNotices.filter((notice) => notice.game_key === "zomboid"),
    siteBaseUrl: () => notices.gameUrl("zomboid").replace(/\/$/, ""),
    noticeUrl: (id) => notices.noticeUrl(id, "zomboid"),
    fetchPublishedNotices: (limit) => notices.fetchPublishedNotices(limit, "zomboid"),
    fetchNotice: (id) => notices.fetchNotice(id, "zomboid"),
    subscribeToNotices: (callback) => notices.subscribeToNotices(callback, "zomboid"),
    applySiteConfig,
    bindCommonUI
  };
})();
