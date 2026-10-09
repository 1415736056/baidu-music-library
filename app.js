(() => {
  "use strict";
  const PAGE_SIZE = 28;
  const catalogNode = document.getElementById("catalog");
  const countNode = document.getElementById("result-count");
  const statusNode = document.getElementById("status");
  const searchNode = document.getElementById("search");
  const moreNode = document.getElementById("show-more");
  const toastNode = document.getElementById("toast");
  const filters = [...document.querySelectorAll(".filter")];
  let allRecords = [], filtered = [], shown = 0, activeFilter = "all", toastTimer;

  function text(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = value;
    return node;
  }

  async function copyText(value) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch (_) { /* Try the legacy method. */ }
    const input = document.createElement("textarea");
    input.value = value;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.append(input);
    input.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (_) { /* Show manual-copy hint. */ }
    input.remove();
    return ok;
  }

  function showToast(message) {
    toastNode.textContent = message;
    toastNode.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastNode.classList.remove("visible"), 2400);
  }

  function copyButton(label, value) {
    const button = text("button", "copy", `复制${label}`);
    button.type = "button";
    button.disabled = !value;
    button.addEventListener("click", async () => {
      const ok = await copyText(value);
      if (ok) {
        button.textContent = "已复制";
        button.classList.add("copied");
        showToast(`${label}已复制`);
        setTimeout(() => {
          button.textContent = `复制${label}`;
          button.classList.remove("copied");
        }, 1800);
      } else showToast("复制失败，请长按内容手动复制");
    });
    return button;
  }

  function fieldHead(label, value) {
    const head = text("div", "field-head", "");
    head.append(text("span", "field-label", label), copyButton(label, value));
    return head;
  }

  function linkField(provider, links) {
    if (!links.length) return null;
    const field = text("div", "field link-field", "");
    field.append(text("div", "field-label link-label", links.length > 1 ? `${provider} · ${links.length} 条链接` : provider));
    links.forEach((url, index) => {
      const row = text("div", "link-row", "");
      const anchor = text("a", "link", url);
      anchor.href = url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      row.append(anchor, copyButton(`${provider}链接${links.length > 1 ? ` ${index + 1}` : ""}`, url));
      field.append(row);
    });
    return field;
  }

  function makeCard(record) {
    const card = text("article", "card", "");
    card.id = record.id;
    if (record.image) {
      const cover = document.createElement("img");
      cover.className = "cover";
      cover.src = record.image;
      cover.alt = `${record.title} 封面`;
      cover.loading = "lazy";
      cover.decoding = "async";
      card.append(cover);
    } else card.append(text("div", "cover cover-empty", "暂无封面"));

    const main = text("div", "card-main", "");
    const titleField = text("div", "field", "");
    titleField.append(fieldHead("标题", record.title), text("h2", "title", record.title || "未填写标题"));
    main.append(titleField);

    const bodyField = text("div", "field", "");
    bodyField.append(fieldHead("正文", record.body));
    const body = text("p", "body collapsed", record.body || "暂无正文");
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
    for (const [provider, links] of [["百度网盘", record.baidu], ["夸克网盘", record.quark]]) {
      const field = linkField(provider, links);
      if (field) main.append(field);
    }
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

  function providerMatch(record) {
    switch (activeFilter) {
      case "baidu": return record.baidu.length > 0;
      case "quark": return record.quark.length > 0;
      case "both": return record.baidu.length > 0 && record.quark.length > 0;
      default: return true;
    }
  }

  function applySearch() {
    const query = searchNode.value.trim().normalize("NFKC").toLocaleLowerCase();
    filtered = allRecords.filter(record => providerMatch(record) && (!query || record.search.includes(query)));
    const total = allRecords.length.toLocaleString("zh-CN");
    const current = filtered.length.toLocaleString("zh-CN");
    countNode.textContent = query || activeFilter !== "all" ? `找到 ${current} 条 / 共 ${total} 条资源` : `共 ${total} 条资源`;
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
  filters.forEach(button => button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filters.forEach(item => {
      const selected = item === button;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    applySearch();
  }));

  fetch("catalog.json")
    .then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
    .then(records => {
      allRecords = records.map(record => ({ ...record, search: `${record.title} ${record.body}`.normalize("NFKC").toLocaleLowerCase() }));
      searchNode.disabled = false;
      applySearch();
    })
    .catch(() => {
      countNode.textContent = "资源加载失败";
      statusNode.textContent = "资源数据暂时无法读取，请刷新页面重试。";
    });
})();
