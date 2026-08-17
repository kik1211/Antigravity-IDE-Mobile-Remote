function htmlToNode(html, fallbackTag = 'div') {
  const template = document.createElement('template');
  template.innerHTML = String(html).trim();
  return template.content.firstElementChild || document.createElement(fallbackTag);
}

function syncAttributes(fromEl, toEl) {
  const fromAttributes = new Set(fromEl.getAttributeNames());
  const toAttributes = new Set(toEl.getAttributeNames());

  for (const name of fromAttributes) {
    if (!toAttributes.has(name)) {
      fromEl.removeAttribute(name);
    }
  }

  for (const name of toAttributes) {
    const nextValue = toEl.getAttribute(name);
    if (fromEl.getAttribute(name) !== nextValue) {
      fromEl.setAttribute(name, nextValue);
    }
  }
}

function syncNode(fromNode, toNode) {
  if (!fromNode || !toNode) return;

  if (fromNode.nodeType !== toNode.nodeType || fromNode.nodeName !== toNode.nodeName) {
    fromNode.replaceWith(toNode.cloneNode(true));
    return;
  }

  if (fromNode.nodeType === Node.TEXT_NODE || fromNode.nodeType === Node.COMMENT_NODE) {
    if (fromNode.nodeValue !== toNode.nodeValue) {
      fromNode.nodeValue = toNode.nodeValue;
    }
    return;
  }

  const fromEl = /** @type {Element} */ (fromNode);
  const toEl = /** @type {Element} */ (toNode);
  syncAttributes(fromEl, toEl);

  const fromChildren = Array.from(fromEl.childNodes);
  const toChildren = Array.from(toEl.childNodes);
  const limit = Math.max(fromChildren.length, toChildren.length);

  for (let index = 0; index < limit; index += 1) {
    const current = fromChildren[index];
    const next = toChildren[index];

    if (!current && next) {
      fromEl.appendChild(next.cloneNode(true));
      continue;
    }

    if (current && !next) {
      current.remove();
      continue;
    }

    syncNode(current, next);
  }
}

export default function morphdom(fromNode, toNodeOrHtml) {
  const target =
    typeof toNodeOrHtml === 'string'
      ? htmlToNode(toNodeOrHtml, fromNode.tagName.toLowerCase())
      : toNodeOrHtml;

  if (!target) return fromNode;

  if (fromNode.nodeName !== target.nodeName) {
    fromNode.replaceWith(target.cloneNode(true));
    return target;
  }

  syncNode(fromNode, target);
  return fromNode;
}
