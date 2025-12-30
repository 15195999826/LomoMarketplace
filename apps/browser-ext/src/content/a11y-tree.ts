/**
 * Accessibility Tree 生成器
 * 注入到页面中，用于生成页面元素的可访问性树
 */

interface ElementInfo {
  role: string;
  name: string;
  ref: string;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  attributes?: Record<string, string>;
  children?: ElementInfo[];
}

// 元素引用计数器
let refCounter = 0;

// 元素引用映射（使用 WeakRef 避免内存泄漏）
const elementMap = new Map<string, WeakRef<Element>>();

/**
 * 获取元素的 ARIA 角色
 */
function getRole(element: Element): string {
  // 优先使用显式的 role 属性
  const explicitRole = element.getAttribute("role");
  if (explicitRole) return explicitRole;

  // 根据标签名推断角色
  const tagName = element.tagName.toLowerCase();
  const roleMap: Record<string, string> = {
    a: "link",
    button: "button",
    input: getInputRole(element as HTMLInputElement),
    select: "combobox",
    textarea: "textbox",
    img: "image",
    nav: "navigation",
    main: "main",
    header: "banner",
    footer: "contentinfo",
    article: "article",
    aside: "complementary",
    section: "region",
    form: "form",
    table: "table",
    tr: "row",
    th: "columnheader",
    td: "cell",
    ul: "list",
    ol: "list",
    li: "listitem",
    h1: "heading",
    h2: "heading",
    h3: "heading",
    h4: "heading",
    h5: "heading",
    h6: "heading",
  };

  return roleMap[tagName] || "generic";
}

/**
 * 获取 input 元素的角色
 */
function getInputRole(input: HTMLInputElement): string {
  const type = input.type.toLowerCase();
  const typeRoleMap: Record<string, string> = {
    button: "button",
    submit: "button",
    reset: "button",
    checkbox: "checkbox",
    radio: "radio",
    range: "slider",
    search: "searchbox",
    text: "textbox",
    email: "textbox",
    password: "textbox",
    tel: "textbox",
    url: "textbox",
    number: "spinbutton",
  };
  return typeRoleMap[type] || "textbox";
}

/**
 * 获取元素的可访问名称
 */
function getName(element: Element): string {
  // aria-label
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel;

  // aria-labelledby
  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy) {
    const labelElement = document.getElementById(labelledBy);
    if (labelElement) return labelElement.textContent?.trim() || "";
  }

  // 对于 input，检查关联的 label
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const id = element.id;
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) return label.textContent?.trim() || "";
    }
  }

  // 使用 title 属性
  const title = element.getAttribute("title");
  if (title) return title;

  // 使用 alt 属性（图片）
  if (element instanceof HTMLImageElement) {
    return element.alt || "";
  }

  // 使用 placeholder
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.placeholder || "";
  }

  // 使用文本内容（对于按钮、链接等）
  if (
    element instanceof HTMLButtonElement ||
    element instanceof HTMLAnchorElement ||
    element.matches("h1, h2, h3, h4, h5, h6")
  ) {
    return element.textContent?.trim().substring(0, 50) || "";
  }

  return "";
}

/**
 * 检查元素是否可交互
 */
function isInteractive(element: Element): boolean {
  const interactiveTags = [
    "a",
    "button",
    "input",
    "select",
    "textarea",
    "details",
    "summary",
  ];

  if (interactiveTags.includes(element.tagName.toLowerCase())) {
    return true;
  }

  // 检查 tabindex
  const tabindex = element.getAttribute("tabindex");
  if (tabindex && parseInt(tabindex, 10) >= 0) {
    return true;
  }

  // 检查 role 是否为可交互角色
  const role = element.getAttribute("role");
  const interactiveRoles = [
    "button",
    "link",
    "checkbox",
    "radio",
    "textbox",
    "combobox",
    "listbox",
    "menu",
    "menuitem",
    "tab",
    "slider",
    "spinbutton",
    "switch",
  ];
  if (role && interactiveRoles.includes(role)) {
    return true;
  }

  // 检查是否有点击事件处理器（通过属性）
  if (element.getAttribute("onclick") || element.getAttribute("onkeydown")) {
    return true;
  }

  return false;
}

/**
 * 检查元素是否可见
 */
function isVisible(element: Element): boolean {
  const style = window.getComputedStyle(element);

  if (style.display === "none") return false;
  if (style.visibility === "hidden") return false;
  if (style.opacity === "0") return false;

  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;

  return true;
}

/**
 * 生成 Accessibility Tree
 */
function generateAccessibilityTree(
  filter: "all" | "interactive" = "interactive",
  maxDepth = 10
): string {
  // 重置引用计数
  refCounter = 0;
  elementMap.clear();

  const lines: string[] = [];

  function walk(element: Element, depth: number, prefix: string = "") {
    if (depth > maxDepth) return;
    if (!isVisible(element)) return;

    const role = getRole(element);
    const name = getName(element);
    const interactive = isInteractive(element);

    // 如果只显示可交互元素，跳过非交互元素
    if (filter === "interactive" && !interactive && role === "generic") {
      // 但仍然遍历子元素
      for (const child of element.children) {
        walk(child, depth, prefix);
      }
      return;
    }

    // 分配引用 ID
    const ref = `ref_${++refCounter}`;
    elementMap.set(ref, new WeakRef(element));

    // 构建行
    let line = `${prefix}${role}`;
    if (name) {
      line += ` "${name.substring(0, 30)}${name.length > 30 ? "..." : ""}"`;
    }
    line += ` [${ref}]`;

    // 添加重要属性
    const attrs: string[] = [];

    // href
    if (element instanceof HTMLAnchorElement && element.href) {
      attrs.push(`href="${element.href.substring(0, 50)}${element.href.length > 50 ? "..." : ""}"`);
    }

    // placeholder
    if ((element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) && element.placeholder) {
      attrs.push(`placeholder="${element.placeholder}"`);
    }

    // disabled
    if ((element as HTMLButtonElement | HTMLInputElement).disabled) {
      attrs.push("disabled");
    }

    // checked
    if ((element as HTMLInputElement).checked) {
      attrs.push("checked");
    }

    if (attrs.length > 0) {
      line += ` ${attrs.join(" ")}`;
    }

    lines.push(line);

    // 遍历子元素
    const childPrefix = prefix + "  ";
    for (const child of element.children) {
      walk(child, depth + 1, childPrefix);
    }
  }

  // 从 body 开始遍历
  walk(document.body, 0);

  return lines.join("\n");
}

/**
 * 根据引用 ID 获取元素
 */
function getElementByRef(ref: string): Element | null {
  const weakRef = elementMap.get(ref);
  if (!weakRef) return null;
  return weakRef.deref() || null;
}

/**
 * 根据引用 ID 获取元素的中心坐标
 */
function getElementCenter(ref: string): { x: number; y: number } | null {
  const element = getElementByRef(ref);
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

// 暴露到全局（供 CDP 调用）
declare global {
  interface Window {
    __browserControl: {
      generateAccessibilityTree: typeof generateAccessibilityTree;
      getElementByRef: typeof getElementByRef;
      getElementCenter: typeof getElementCenter;
    };
  }
}

window.__browserControl = {
  generateAccessibilityTree,
  getElementByRef,
  getElementCenter,
};

console.log("[A11y Tree] Browser Control content script loaded");
