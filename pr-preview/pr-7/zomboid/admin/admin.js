(function () {
  "use strict";

  const site = window.ZomboidSite;
  if (!site) return;
  const client = site.client;

  const loginView = document.getElementById("login-view");
  const dashboardView = document.getElementById("dashboard-view");
  const loginForm = document.getElementById("login-form");
  const loginEmail = document.getElementById("login-email");
  const loginPassword = document.getElementById("login-password");
  const loginButton = document.getElementById("login-button");
  const loginError = document.getElementById("login-error");

  const noticeForm = document.getElementById("notice-form");
  const noticeId = document.getElementById("notice-id");
  const noticeCategory = document.getElementById("notice-category");
  const noticeStatus = document.getElementById("notice-status");
  const noticeTitle = document.getElementById("notice-title");
  const noticeSummary = document.getElementById("notice-summary");
  const noticePublishedAt = document.getElementById("notice-published-at");
  const noticeImage = document.getElementById("notice-image");
  const noticePinned = document.getElementById("notice-pinned");
  const noticeContent = document.getElementById("notice-content");
  const editorPreview = document.getElementById("editor-preview");
  const coverPreview = document.getElementById("cover-preview");
  const coverPreviewImage = document.getElementById("cover-preview-image");
  const removeCoverButton = document.getElementById("remove-cover-button");
  const saveButton = document.getElementById("save-button");
  const saveDraftButton = document.getElementById("save-draft-button");
  const deleteCurrentButton = document.getElementById("delete-current-button");
  const formSuccess = document.getElementById("form-success");
  const formError = document.getElementById("form-error");
  const editorTitle = document.getElementById("editor-title");

  const adminList = document.getElementById("admin-notice-list");
  const adminSearch = document.getElementById("admin-search");
  const adminCategory = document.getElementById("admin-category");
  const adminStatus = document.getElementById("admin-status");
  const resultCount = document.getElementById("notice-result-count");

  let currentUser = null;
  let adminProfile = null;
  let notices = [];
  let currentCoverUrl = "";
  let removeCurrentCover = false;
  let channel = null;

  function setLoading(button, loading, loadingText = "처리 중...") {
    if (!button) return;
    if (loading) {
      button.dataset.originalText = button.textContent;
      button.textContent = loadingText;
      button.disabled = true;
    } else {
      button.textContent = button.dataset.originalText || button.textContent;
      button.disabled = false;
    }
  }

  function nowInputValue() {
    return new Date().toLocaleString("sv-SE", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).replace(" ", "T").slice(0, 16);
  }

  function inputValueFromISO(value) {
    if (!value) return nowInputValue();
    return new Date(value).toLocaleString("sv-SE", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).replace(" ", "T").slice(0, 16);
  }

  function inputValueToISO(value) {
    if (!value) return new Date().toISOString();
    return new Date(`${value}:00+09:00`).toISOString();
  }

  function statusInfo(notice) {
    if (notice.status !== "published") return { value: "draft", label: "임시 저장" };
    const scheduled = new Date(notice.published_at).getTime() > Date.now();
    return scheduled ? { value: "scheduled", label: "예약 공개" } : { value: "published", label: "공개 중" };
  }

  function clearMessages() {
    formSuccess.textContent = "";
    formError.textContent = "";
  }

  function setCoverPreview(url) {
    if (url) {
      coverPreviewImage.src = url;
      coverPreview.classList.add("show");
    } else {
      coverPreviewImage.removeAttribute("src");
      coverPreview.classList.remove("show");
    }
  }

  function resetForm() {
    noticeForm.reset();
    noticeId.value = "";
    noticeCategory.value = "notice";
    noticeStatus.value = "draft";
    noticePublishedAt.value = nowInputValue();
    currentCoverUrl = "";
    removeCurrentCover = false;
    setCoverPreview("");
    editorTitle.textContent = "새 공지 작성";
    deleteCurrentButton.classList.add("hidden");
    switchEditorTab("write");
    clearMessages();
  }

  function switchEditorTab(tab) {
    document.querySelectorAll("[data-editor-tab]").forEach((button) => {
      button.classList.toggle("active", button.dataset.editorTab === tab);
    });
    const previewing = tab === "preview";
    noticeContent.classList.toggle("hidden", previewing);
    editorPreview.classList.toggle("hidden", !previewing);
    if (previewing) editorPreview.innerHTML = site.renderMarkdown(noticeContent.value || "미리보기할 본문이 없습니다.");
  }

  async function verifyAdmin(session) {
    currentUser = session?.user || null;
    if (!currentUser) return false;

    const { data, error } = await client.rpc("is_admin");
    if (error) throw error;
    if (!data) {
      await client.auth.signOut();
      currentUser = null;
      throw new Error("관리자 권한이 없는 계정입니다.");
    }

    const { data: profile, error: profileError } = await client
      .from("admin_users")
      .select("user_id, display_name")
      .eq("user_id", currentUser.id)
      .single();
    if (profileError) throw profileError;
    adminProfile = profile;
    document.getElementById("admin-name").textContent = profile.display_name || currentUser.email || "관리자";
    return true;
  }

  function showDashboard() {
    loginView.classList.add("hidden");
    dashboardView.classList.remove("hidden");
  }

  function showLogin(message = "") {
    dashboardView.classList.add("hidden");
    loginView.classList.remove("hidden");
    loginError.textContent = message;
  }

  async function loadNotices() {
    if (!client || !currentUser) return;
    const { data, error } = await client
      .from("notices")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    notices = (data || []).map(site.normalizeNotice);
    renderStats();
    renderAdminList();
  }

  function renderStats() {
    const states = notices.map(statusInfo);
    document.getElementById("stat-total").textContent = String(notices.length);
    document.getElementById("stat-published").textContent = String(states.filter((item) => item.value === "published").length);
    document.getElementById("stat-scheduled").textContent = String(states.filter((item) => item.value === "scheduled").length);
    document.getElementById("stat-draft").textContent = String(states.filter((item) => item.value === "draft").length);
  }

  function filteredAdminNotices() {
    const keyword = String(adminSearch.value || "").trim().toLocaleLowerCase("ko-KR");
    return notices.filter((notice) => {
      const state = statusInfo(notice).value;
      const categoryMatch = adminCategory.value === "all" || notice.category === adminCategory.value;
      const statusMatch = adminStatus.value === "all" || state === adminStatus.value;
      const haystack = `${notice.title} ${notice.summary} ${notice.content}`.toLocaleLowerCase("ko-KR");
      return categoryMatch && statusMatch && (!keyword || haystack.includes(keyword));
    });
  }

  function renderAdminList() {
    const list = filteredAdminNotices();
    resultCount.textContent = `${list.length}개`;
    if (!list.length) {
      adminList.innerHTML = `<div class="notice-empty">조건에 맞는 공지가 없습니다.</div>`;
      return;
    }
    adminList.innerHTML = list.map((notice) => {
      const category = site.categoryInfo(notice.category);
      const state = statusInfo(notice);
      const canView = state.value === "published";
      return `
        <article class="admin-notice-item">
          <div class="admin-notice-item-top">
            <div>
              <div class="notice-topline">
                <span class="notice-badge ${site.escapeHTML(category.className)}">${site.escapeHTML(category.label)}</span>
                <span class="status-badge ${state.value}">${state.label}</span>
                ${notice.is_pinned ? '<span class="notice-pin">● 고정</span>' : ""}
              </div>
              <h3>${site.escapeHTML(notice.title)}</h3>
              <p>${site.escapeHTML(notice.summary || "요약 없음")}</p>
            </div>
            <time class="notice-date">${site.formatDate(notice.published_at, true)}</time>
          </div>
          <footer>
            <button class="button secondary small" type="button" data-edit-id="${site.escapeHTML(notice.id)}">수정</button>
            <button class="button danger small" type="button" data-delete-id="${site.escapeHTML(notice.id)}">삭제</button>
            ${canView ? `<a class="button ghost small" href="${site.noticeUrl(notice.id)}" target="_blank" rel="noopener">공개 화면</a>` : ""}
          </footer>
        </article>
      `;
    }).join("");
  }

  function editNotice(id) {
    const notice = notices.find((item) => item.id === id);
    if (!notice) return;
    noticeId.value = notice.id;
    noticeCategory.value = notice.category;
    noticeStatus.value = notice.status;
    noticeTitle.value = notice.title;
    noticeSummary.value = notice.summary;
    noticePublishedAt.value = inputValueFromISO(notice.published_at);
    noticePinned.checked = notice.is_pinned;
    noticeContent.value = notice.content;
    currentCoverUrl = notice.cover_image_url || "";
    removeCurrentCover = false;
    noticeImage.value = "";
    setCoverPreview(currentCoverUrl);
    editorTitle.textContent = "공지 수정";
    deleteCurrentButton.classList.remove("hidden");
    switchEditorTab("write");
    clearMessages();
    document.getElementById("editor-panel").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function storagePathFromPublicUrl(url) {
    if (!url) return "";
    const marker = "/storage/v1/object/public/notice-images/";
    const index = url.indexOf(marker);
    return index >= 0 ? decodeURIComponent(url.slice(index + marker.length)) : "";
  }

  async function removeStoredImage(url) {
    const path = storagePathFromPublicUrl(url);
    if (!path) return;
    const { error } = await client.storage.from("notice-images").remove([path]);
    if (error) console.warn("이미지 삭제 실패", error);
  }

  async function uploadCover(file) {
    if (!file) return currentCoverUrl;
    if (!file.type.startsWith("image/")) throw new Error("이미지 파일만 업로드할 수 있습니다.");
    if (file.size > 5 * 1024 * 1024) throw new Error("대표 이미지는 5MB 이하만 업로드할 수 있습니다.");

    const extension = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const random = window.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
    const path = `${currentUser.id}/${Date.now()}-${random}.${extension}`;
    const { error } = await client.storage.from("notice-images").upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) throw error;
    const { data } = client.storage.from("notice-images").getPublicUrl(path);
    return data.publicUrl;
  }

  async function saveNotice(forcedStatus = null) {
    clearMessages();
    if (!noticeTitle.value.trim()) {
      formError.textContent = "제목을 입력해 주세요.";
      noticeTitle.focus();
      return;
    }
    if (!noticeContent.value.trim()) {
      formError.textContent = "본문을 입력해 주세요.";
      noticeContent.focus();
      return;
    }

    const status = forcedStatus || noticeStatus.value;
    setLoading(saveButton, true, "저장 중...");
    saveDraftButton.disabled = true;
    try {
      const selectedFile = noticeImage.files?.[0] || null;
      let coverUrl = currentCoverUrl;
      let oldCoverToDelete = "";
      let newlyUploadedCover = "";
      if (selectedFile) {
        newlyUploadedCover = await uploadCover(selectedFile);
        coverUrl = newlyUploadedCover;
        if (currentCoverUrl && currentCoverUrl !== coverUrl) oldCoverToDelete = currentCoverUrl;
      } else if (removeCurrentCover && currentCoverUrl) {
        oldCoverToDelete = currentCoverUrl;
        coverUrl = "";
      }

      const payload = {
        category: noticeCategory.value,
        title: noticeTitle.value.trim(),
        summary: noticeSummary.value.trim(),
        content: noticeContent.value.trim(),
        cover_image_url: coverUrl,
        is_pinned: noticePinned.checked,
        status,
        published_at: inputValueToISO(noticePublishedAt.value),
        author_id: currentUser.id,
        author_name: adminProfile?.display_name || currentUser.email || "Choromi"
      };

      let error;
      if (noticeId.value) {
        ({ error } = await client.from("notices").update(payload).eq("id", noticeId.value));
      } else {
        ({ error } = await client.from("notices").insert(payload));
      }
      if (error) {
        if (newlyUploadedCover) await removeStoredImage(newlyUploadedCover);
        throw error;
      }
      if (oldCoverToDelete) await removeStoredImage(oldCoverToDelete);

      formSuccess.textContent = status === "draft" ? "임시 저장했습니다." : "공지를 저장했습니다.";
      site.showToast(formSuccess.textContent);
      await loadNotices();
      resetForm();
    } catch (error) {
      console.error(error);
      formError.textContent = error.message || "공지 저장에 실패했습니다.";
    } finally {
      setLoading(saveButton, false);
      saveDraftButton.disabled = false;
    }
  }

  async function deleteNotice(id) {
    const notice = notices.find((item) => item.id === id);
    if (!notice) return;
    if (!window.confirm(`‘${notice.title}’ 공지를 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return;

    const { error } = await client.from("notices").delete().eq("id", id);
    if (error) {
      site.showToast("공지 삭제에 실패했습니다.");
      console.error(error);
      return;
    }
    if (notice.cover_image_url) await removeStoredImage(notice.cover_image_url);
    if (noticeId.value === id) resetForm();
    await loadNotices();
    site.showToast("공지를 삭제했습니다.");
  }

  function bindEvents() {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      loginError.textContent = "";
      if (!client) {
        loginError.textContent = "config.js에 Supabase URL과 anon key를 먼저 입력해 주세요.";
        return;
      }
      setLoading(loginButton, true, "로그인 중...");
      try {
        const { data, error } = await client.auth.signInWithPassword({ email: loginEmail.value.trim(), password: loginPassword.value });
        if (error) throw error;
        await verifyAdmin(data.session);
        showDashboard();
        resetForm();
        await loadNotices();
        channel = site.subscribeToNotices(() => loadNotices());
      } catch (error) {
        loginError.textContent = error.message || "로그인에 실패했습니다.";
      } finally {
        setLoading(loginButton, false);
      }
    });

    document.getElementById("logout-button").addEventListener("click", async () => {
      await site.unsubscribe(channel);
      channel = null;
      await client.auth.signOut();
      currentUser = null;
      adminProfile = null;
      showLogin("로그아웃했습니다.");
    });

    document.getElementById("refresh-button").addEventListener("click", async () => {
      await loadNotices();
      site.showToast("목록을 새로고침했습니다.");
    });
    document.getElementById("new-notice-button").addEventListener("click", resetForm);
    noticeForm.addEventListener("submit", (event) => { event.preventDefault(); saveNotice(); });
    saveDraftButton.addEventListener("click", () => saveNotice("draft"));
    deleteCurrentButton.addEventListener("click", () => deleteNotice(noticeId.value));

    document.querySelectorAll("[data-editor-tab]").forEach((button) => button.addEventListener("click", () => switchEditorTab(button.dataset.editorTab)));
    noticeContent.addEventListener("input", () => {
      if (!editorPreview.classList.contains("hidden")) editorPreview.innerHTML = site.renderMarkdown(noticeContent.value);
    });

    noticeImage.addEventListener("change", () => {
      const file = noticeImage.files?.[0];
      if (!file) {
        setCoverPreview(removeCurrentCover ? "" : currentCoverUrl);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        formError.textContent = "대표 이미지는 5MB 이하만 업로드할 수 있습니다.";
        noticeImage.value = "";
        return;
      }
      const url = URL.createObjectURL(file);
      setCoverPreview(url);
      removeCurrentCover = false;
    });

    removeCoverButton.addEventListener("click", () => {
      noticeImage.value = "";
      removeCurrentCover = true;
      setCoverPreview("");
    });

    adminList.addEventListener("click", (event) => {
      const editButton = event.target.closest("[data-edit-id]");
      const deleteButton = event.target.closest("[data-delete-id]");
      if (editButton) editNotice(editButton.dataset.editId);
      if (deleteButton) deleteNotice(deleteButton.dataset.deleteId);
    });

    [adminSearch, adminCategory, adminStatus].forEach((element) => element.addEventListener("input", renderAdminList));
  }

  async function init() {
    bindEvents();
    resetForm();

    if (!site.isConfigured()) {
      showLogin("config.js에 Supabase URL과 anon key를 입력한 뒤 이용할 수 있습니다.");
      loginButton.disabled = true;
      return;
    }

    try {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (!data.session) {
        showLogin();
        return;
      }
      await verifyAdmin(data.session);
      showDashboard();
      await loadNotices();
      channel = site.subscribeToNotices(() => loadNotices());
    } catch (error) {
      console.error(error);
      showLogin(error.message || "관리자 세션을 확인하지 못했습니다.");
    }
  }

  window.addEventListener("beforeunload", () => site.unsubscribe(channel));
  init();
})();
