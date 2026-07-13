const mods = [
      { name: "BepInExPack Valheim", group: "Dependency", icon: "BE", desc: "발헤임 모드 로더", tags: ["필수"] },
      { name: "Jotunn", group: "Dependency", icon: "JO", desc: "다수 모드의 공통 라이브러리", tags: ["필수"] },
      { name: "YamlDotNet", group: "Dependency", icon: "YA", desc: "YAML 설정 파일 처리용 의존성", tags: ["필수"] },
      { name: "Zen ModLib", group: "Dependency", icon: "ZE", desc: "ZenRaids 계열 공통 라이브러리", tags: ["필수"] },

      { name: "AzuCraftyBoxes", group: "Craft & Storage", icon: "CB", desc: "상자 안 재료로 제작/건축", tags: ["공통"] },
      { name: "AzuAutoStore", group: "Craft & Storage", icon: "AS", desc: "주변 상자로 자동 보관", tags: ["공통"] },
      { name: "Quick Stack Store Sort Trash Restock", group: "Craft & Storage", icon: "QS", desc: "수동 정리, 정렬, 보충, 폐기", tags: ["편의"] },
      { name: "Recycle N Reclaim", group: "Craft & Storage", icon: "RR", desc: "제작 아이템 회수/분해", tags: ["공통"] },
      { name: "AzuAreaRepair", group: "Craft & Storage", icon: "AR", desc: "망치 범위 수리", tags: ["편의"] },

      { name: "AzuExtendedPlayerInventory", group: "Inventory", icon: "EI", desc: "인벤 확장, 장비 슬롯, 퀵슬롯", tags: ["공통"] },
      { name: "ItemStacksItemWeights", group: "Inventory", icon: "SW", desc: "아이템 스택/무게 조정", tags: ["공통"] },
      { name: "SkilledCarryWeight", group: "Inventory", icon: "CW", desc: "스킬 기반 소지 무게 증가", tags: ["편의"] },

      { name: "TeleportEverything", group: "Travel & Map", icon: "TE", desc: "광석, 주괴, 수레, 동물 포탈 이동", tags: ["공통"] },
      { name: "FastTeleport", group: "Travel & Map", icon: "FT", desc: "포탈 이동 시간 단축", tags: ["편의"] },
      { name: "DiscoveryPins", group: "Travel & Map", icon: "DP", desc: "발견 대상 자동 지도 핀", tags: ["지도"] },
      { name: "Where You At", group: "Travel & Map", icon: "WY", desc: "지도 위치 공유 강제", tags: ["공통"] },

      { name: "SleepSkip", group: "Server Rules", icon: "SS", desc: "수면 투표와 밤 스킵", tags: ["공통"] },
      { name: "ZenRaids", group: "Server Rules", icon: "ZR", desc: "레이드 인원 조건과 빈도 제어", tags: ["공통"] },

      { name: "PlantEverything", group: "Building & World", icon: "PE", desc: "식물, 베리, 버섯, 장식 재배 확장", tags: ["건축"] },
      { name: "FloorsAreRoofs", group: "Building & World", icon: "FR", desc: "바닥을 지붕처럼 판정", tags: ["건축"] },
      { name: "Seasonality", group: "Building & World", icon: "SE", desc: "계절감과 환경 분위기 변화", tags: ["외형"] },

      { name: "Balrond Character Customization", group: "Visual & UI", icon: "BC", desc: "캐릭터 커스터마이징 확장", tags: ["외형"] },
      { name: "DyeHard", group: "Visual & UI", icon: "DH", desc: "머리/수염 타입과 색상 변경", tags: ["외형"] },
      { name: "MyLittleUI", group: "Visual & UI", icon: "UI", desc: "UI 표시 개선", tags: ["개인"] },
      { name: "EmoteWheelReworked", group: "Visual & UI", icon: "EW", desc: "감정표현 휠 개선", tags: ["개인"] }
    ];

    const groupOrder = ["All", "Dependency", "Craft & Storage", "Inventory", "Travel & Map", "Server Rules", "Building & World", "Visual & UI"];
    const filterRow = document.getElementById("filter-row");
    const modsGrid = document.getElementById("mods-grid");
    const modCount = document.getElementById("mod-count");

    function renderFilters(active = "All") {
      filterRow.innerHTML = "";
      groupOrder.forEach(group => {
        const btn = document.createElement("button");
        btn.className = `filter-btn${group === active ? " active" : ""}`;
        btn.type = "button";
        btn.textContent = group;
        btn.addEventListener("click", () => renderMods(group));
        filterRow.appendChild(btn);
      });
    }

    function renderMods(group = "All") {
      renderFilters(group);
      const list = group === "All" ? mods : mods.filter(mod => mod.group === group);
      modCount.textContent = `${list.length} / ${mods.length} mods`;
      modsGrid.innerHTML = list.map(mod => `
        <article class="mod-card">
          <div class="mod-icon" aria-hidden="true">${mod.icon}</div>
          <div>
            <h3>${mod.name}</h3>
            <p>${mod.desc}</p>
            <div class="tag-row">${mod.tags.map(tag => `<span class="tag">${tag}</span>`).join("")}</div>
          </div>
        </article>
      `).join("");
    }

    function showToast(message = "Copied") {
      const toast = document.getElementById("toast");
      toast.textContent = message;
      toast.classList.add("show");
      window.setTimeout(() => toast.classList.remove("show"), 1600);
    }

    async function copyTextToClipboard(text, message = "Copied") {
      try {
        await navigator.clipboard.writeText(text);
        showToast(message);
      } catch (error) {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
        showToast(message);
      }
    }

    document.getElementById("copy-btn").addEventListener("click", async () => {
      const code = document.getElementById("profile-code").textContent.trim();
      await copyTextToClipboard(code, "Profile code copied");
    });

    document.querySelectorAll("[data-copy-text]").forEach((button) => {
      button.addEventListener("click", async () => {
        await copyTextToClipboard(button.dataset.copyText, button.dataset.toast || "Copied");
      });
    });

    document.getElementById("toggle-password")?.addEventListener("click", (event) => {
      const button = event.currentTarget;
      const password = document.getElementById("server-password");
      const visible = button.getAttribute("aria-pressed") === "true";

      if (visible) {
        password.textContent = "••••••••";
        button.textContent = "Show";
        button.setAttribute("aria-pressed", "false");
      } else {
        password.textContent = password.dataset.password;
        button.textContent = "Hide";
        button.setAttribute("aria-pressed", "true");
      }
    });

    renderMods();
