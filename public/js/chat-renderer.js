if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('.user-prompt-toggle');
    if (toggle) {
      const container = toggle.closest('.user-prompt-container');
      const content = container.querySelector('.user-prompt-content');
      const text = toggle.querySelector('.toggle-text');
      const iconMore = toggle.querySelector('.toggle-icon-more');
      const iconLess = toggle.querySelector('.toggle-icon-less');
      
      const isCollapsed = container.classList.contains('collapsed');
      if (isCollapsed) {
        container.classList.remove('collapsed');
        content.style.display = 'block';
        content.style.webkitLineClamp = 'unset';
        if (text) text.textContent = 'Show less';
        if (iconMore) iconMore.style.display = 'none';
        if (iconLess) iconLess.style.display = 'block';
      } else {
        container.classList.add('collapsed');
        content.style.display = '-webkit-box';
        content.style.webkitLineClamp = '4';
        if (text) text.textContent = 'Show more';
        if (iconMore) iconMore.style.display = 'block';
        if (iconLess) iconLess.style.display = 'none';
      }
    }
    
    const copyBtn = e.target.closest('.msg-copy-btn');
    if (copyBtn) {
      const rawContent = copyBtn.getAttribute('data-raw-content') || '';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(rawContent).then(() => {
          const originalHTML = copyBtn.innerHTML;
          copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4caf50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
          setTimeout(() => { copyBtn.innerHTML = originalHTML; }, 2000);
        }).catch(err => console.error('Copy failed', err));
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = rawContent;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
          document.execCommand('copy');
          const originalHTML = copyBtn.innerHTML;
          copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4caf50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
          setTimeout(() => { copyBtn.innerHTML = originalHTML; }, 2000);
        } catch (err) {}
        document.body.removeChild(textarea);
      }
    }
  });
}

function escapeHTMLAttr(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
}

export function sanitizeHTML(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const tags = doc.querySelectorAll('script, iframe, object, embed, applet, meta, style, link, base');
  tags.forEach(t => t.remove());
  const allElements = doc.querySelectorAll('*');
  allElements.forEach(el => {
    for (let i = el.attributes.length - 1; i >= 0; i--) {
      const attr = el.attributes[i];
      if (attr.name.toLowerCase().startsWith('on') || attr.value.toLowerCase().startsWith('javascript:')) {
        el.removeAttribute(attr.name);
      }
    }
  });
  return doc.body.innerHTML;
}

export function renderConversationToContainer(messages, container, chatContainerElement, shouldFollowBottom) {
    let anchorNode = null;
    let anchorOffset = 0;
    
    if (chatContainerElement && !shouldFollowBottom && container.children.length > 0) {
      for (const child of container.children) {
        if (child.offsetTop >= chatContainerElement.scrollTop) {
          anchorNode = child;
          anchorOffset = child.offsetTop - chatContainerElement.scrollTop;
          break;
        }
      }
    }
    
    const existingNodes = new Map();
    for (const child of container.children) {
      existingNodes.set(child.getAttribute('data-msg-id'), child);
    }
    
    const newOrder = [];
    
    for (const msg of messages) {
      const msgId = String(msg.id);
      let node = existingNodes.get(msgId);
      
      const role = msg.role;
      const isUser = role === 'user';
      const bg = isUser ? '#2A2D35' : (role === 'tool_call' || role === 'tool_result' ? '#1A1C20' : '#1E1E1E');
      const border = isUser ? 'border: 1px solid #444;' : 'border: 1px solid transparent;';
      const title = role.toUpperCase();
      
      let htmlContent = msg.content || '';
      const rawEscaped = escapeHTMLAttr(msg.content || '');
      
      if (window.marked) {
        htmlContent = sanitizeHTML(window.marked.parse(htmlContent));
      } else {
        htmlContent = sanitizeHTML(htmlContent.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\\n/g, '<br/>'));
      }
      
      const copyBtnHtml = (isUser || role === 'assistant') ? `
        <div class="msg-copy-btn" data-raw-content="${rawEscaped}" aria-label="Copy message" style="display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 4px; background: rgba(255,255,255,0.05); color: #888; cursor: pointer;" title="Copy">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        </div>
      ` : '';
      
      let contentContainerStr = `
        <div style="font-size: 14px; line-height: 1.5; color: #eee; overflow-wrap: anywhere;" class="msg-markdown">${htmlContent}</div>
        <div style="display: flex; justify-content: flex-end; margin-top: 8px;">${copyBtnHtml}</div>
      `;
      
      if (isUser && msg.content && (msg.content.length > 200 || (msg.content.match(/\n/g) || []).length > 2)) {
        contentContainerStr = `
          <div class="user-prompt-container collapsed" style="font-size: 14px; line-height: 1.5; color: #eee; overflow-wrap: anywhere;">
            <div class="user-prompt-content" style="display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden;">
              ${htmlContent}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
              <div class="user-prompt-toggle" style="font-size: 12px; color: #8ab4f8; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                <span class="toggle-text">Show more</span>
                <svg class="toggle-icon-more" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: block;"><path d="M6 9l6 6 6-6"/></svg>
                <svg class="toggle-icon-less" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: none;"><path d="M18 15l-6-6-6 6"/></svg>
              </div>
              ${copyBtnHtml}
            </div>
          </div>
        `;
      }

      const innerHTML = `
        <div style="font-size: 11px; font-weight: bold; color: #888; margin-bottom: 8px; text-transform: uppercase;">${title}</div>
        ${contentContainerStr}
      `;
      
      if (!node) {
        node = document.createElement('div');
        node.setAttribute('data-msg-id', msgId);
        // Remove padding-bottom: 20px that was inline and use standard cssText
        // For Current Conversation, we might need max-width 100%. We'll just style it similar to Lite Mode.
        node.style.cssText = `background: ${bg}; padding: 12px 16px; border-radius: 12px; margin-bottom: 16px; ${border}; max-width: 85%; ${isUser ? 'margin-left: auto;' : 'margin-right: auto;'}`;
        node.innerHTML = innerHTML;
        container.appendChild(node);
      } else {
        if (node.innerHTML !== innerHTML) {
          node.innerHTML = innerHTML;
        }
      }
      
      newOrder.push(node);
      existingNodes.delete(msgId);
    }
    
    for (const [id, node] of existingNodes) {
      node.remove();
    }
    
    for (let i = 0; i < newOrder.length; i++) {
      if (container.children[i] !== newOrder[i]) {
        container.insertBefore(newOrder[i], container.children[i]);
      }
    }
    
    if (chatContainerElement) {
        if (shouldFollowBottom) {
          chatContainerElement.scrollTop = chatContainerElement.scrollHeight;
        } else if (anchorNode && container.contains(anchorNode)) {
          chatContainerElement.scrollTop = anchorNode.offsetTop - anchorOffset;
        }
    }
}
