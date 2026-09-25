(() => {
  "use strict";

  const PAGE_SIZE = 28;
  const catalogNode = document.getElementById("catalog");
  const countNode = document.getElementById("result-count");
  const statusNode = document.getElementById("status");
  const searchNode = document.getElementById("search");
  const moreNode = document.getElementById("show-more");
  const toastNode = document.getElementById("toast");
  let allRecords = [];
  let filtered = [];
  let shown = 0;
  let toastTimer;

  function text(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = value;
    return node;
  }

  function fieldHead(label, value) {
    const head = text("div", "field-head", "");
    head.append(text("span", "field-label", label));
    const copy = text("button", "copy", `复制${label}`);
    copy.type = "button";
    copy.addEventListener("click", async () => {
      const ok = await copyText(value);
      if (ok) {
        copy.textContent = "已复制";
        copy.classList.add("copied");
        showToast(`${label}已复制`);
        setTimeout(() => { copy.textContent = `复制${label}`; copy.classList.remove("copied"); }, 1800);
      } else {
        showToast("复制失败，请长按内容手动复制");
      }
    });
    head.append(copy);
    return head;
  }

  async function copyText(value) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch (_) { /* 再尝试兼容旧浏览器的方法 */ }
    const input = document.createElement("textarea");
    input.value = value;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.append(input);
    input.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (_) { /* 显示手动复制提示 */ }
    input.remove();
    return ok;
  }

  function showToast(message) {
    toastNode.textContent = message;
    toastNode.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastNode.classList.remove("visible"), 2400);
  }

  function makeCard(record) {
    const card = text("article", "card", "");
    if (record.image) {
      const cover = document.createElement("img");
      cover.className = "cover";
      cover.src = record.image;
      cover.alt = `${record.title} 封面`;
      cover.loading = "lazy";
      cover.decoding = "async";
      card.append(cover);
    } else {
      card.append(text("div", "cover cover-empty", "暂无封面"));
    }

    const main = text("div", "card-main", "");
    const titleField = text("div", "field", "");
    titleField.append(fieldHead("标题", record.title), text("h2", "title", record.title || "未填写标题"));
    main.append(titleField);

    const bodyField = text("div", "field", "");
    bodyField.append(fieldHead("正文", record.body));
    const body = text("p", "body collapsed", record.body || "未填写正文");
    bodyField.append(body);
    if (record.body.length > 115) {
      const expand = text("button", "expand", "展开正文");
      expand.type = "button";
      expand.addEventListener("click", () => {
        const collapsed = body.classList.toggle("collapsed");
        expand.textContent = collapsed ? "展开正文" : "收起正文";
      });
      bodyField.append(expand);
    }
    main.append(bodyField);

    const linkField = text("div", "field", "");
    linkField.append(fieldHead("链接", record.link));
    const anchor = text("a", "link", record.link);
    anchor.href = record.link;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    linkField.append(anchor);
    main.append(linkField, text("div", "row-id", `表格第 ${record.row} 行`));
    card.append(main);
    return card;
  }

  function showNext() {
    const next = filtered.slice(shown, shown + PAGE_SIZE);
    const fragment = document.createDocumentFragment();
    for (const record of next) fragment.append(makeCard(record));
    catalogNode.append(fragment);
    shown += next.length;
    moreNode.hidden = shown >= filtered.length;
  }

  function applySearch() {
    const query = searchNode.value.trim().normalize("NFKC").toLocaleLowerCase();
    filtered = query ? allRecords.filter(record => record.search.includes(query)) : allRecords;
    countNode.textContent = query ? `找到 ${filtered.length.toLocaleString("zh-CN")} 条 / 共 ${allRecords.length.toLocaleString("zh-CN")} 条百度资源` : `共 ${allRecords.length.toLocaleString("zh-CN")} 条百度资源`;
    catalogNode.replaceChildren();
    shown = 0;
    statusNode.textContent = filtered.length ? "" : "没有找到匹配的资源";
    showNext();
  }

  let searchTimer;
  searchNode.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applySearch, 120);
  });
  moreNode.addEventListener("click", showNext);

  fetch("catalog.json")
    .then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
    .then(records => {
      allRecords = records.map(record => ({
        ...record,
        search: `${record.title} ${record.body}`.normalize("NFKC").toLocaleLowerCase(),
      }));
      searchNode.disabled = false;
      applySearch();
    })
    .catch(() => {
      countNode.textContent = "资源加载失败";
      statusNode.textContent = "资源数据暂时无法读取，请刷新页面重试。";
    });
})();
