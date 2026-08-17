const statusDot = document.getElementById('minimalStatusDot');
const statusText = document.getElementById('minimalStatusText');
const content = document.getElementById('minimalContent');
const chat = document.getElementById('minimalChat');
const input = document.getElementById('minimalMessageInput');
const sendBtn = document.getElementById('minimalSendBtn');

let ws = null;

async function fetchWithAuth(url, options = {}) {
  const nextOptions = { ...options };
  nextOptions.headers = { ...(options.headers || {}), 'ngrok-skip-browser-warning': 'true' };
  const response = await fetch(url, nextOptions);
  if (response.status === 401) {
    window.location.href = '/login.html';
    return new Promise(() => {});
  }
  return response;
}

function setStatus(connected) {
  statusDot.classList.toggle('connected', connected);
  statusDot.classList.toggle('disconnected', !connected);
  statusText.textContent = connected ? 'Live' : 'Reconnecting';
}

const scrollToBottomBtn = document.getElementById('minimalScrollToBottomBtn');
const scrollToTopBtn = document.getElementById('minimalScrollToTopBtn');
let shouldFollowBottom = true;

const minimalModelRunningIndicator = document.getElementById('minimalModelRunningIndicator');

function setModelRunningState(running) {
  if (minimalModelRunningIndicator) {
    minimalModelRunningIndicator.style.display = running ? 'block' : 'none';
  }
}

async function fetchModelRunningState() {
  try {
    const res = await fetchWithAuth('/api/model-status');
    const data = await res.json();
    setModelRunningState(data.running);
  } catch (e) {
    console.error('Error fetching model status', e);
  }
}

fetchModelRunningState(); // Initial load

if (chat) {
  chat.addEventListener('scroll', () => {
    const distFromBottom = chat.scrollHeight - chat.scrollTop - chat.clientHeight;
    shouldFollowBottom = distFromBottom < 50;
    
    if (scrollToBottomBtn) {
      scrollToBottomBtn.style.display = shouldFollowBottom ? 'none' : 'flex';
    }
    
    if (scrollToTopBtn) {
      scrollToTopBtn.style.display = chat.scrollTop > 200 ? 'flex' : 'none';
    }
  });
}

if (scrollToBottomBtn) {
  scrollToBottomBtn.addEventListener('click', () => {
    chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
    shouldFollowBottom = true;
    scrollToBottomBtn.style.display = 'none';
  });
}

if (scrollToTopBtn) {
  scrollToTopBtn.addEventListener('click', () => {
    chat.scrollTo({ top: 0, behavior: 'smooth' });
    scrollToTopBtn.style.display = 'none';
  });
}

if (window.marked) {
  window.marked.setOptions({
    breaks: true,
    gfm: true
  });
}

import { renderConversationToContainer } from './chat-renderer.js';

async function loadConversation() {
  try {
    const response = await fetchWithAuth('/api/conversation.json');
    if (!response.ok) return;
    const payload = await response.json();
    if (!payload.available || !payload.messages) return;

    let container = content.querySelector('.conversation-container');
    if (!container) {
      content.innerHTML = '<div class="conversation-container" style="padding-bottom: 20px;"></div>';
      container = content.querySelector('.conversation-container');
    }
    
    renderConversationToContainer(payload.messages, container, chat, shouldFollowBottom);
  } catch (err) {
    console.error('Failed to load conversation:', err);
  }
}

async function sendMessage() {
  const message = input.value.trim();
  if (!message) return;
  input.value = '';
  input.style.height = 'auto';
  await fetchWithAuth('/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  setTimeout(loadConversation, 500);
}

async function remoteClick(target) {
  const text = (target.getAttribute?.('data-omni-text') || target.innerText || '').trim();
  if (!text) return;

  const omniIndexValue = target.getAttribute?.('data-omni-idx');
  const omniIndex = omniIndexValue !== null ? Number.parseInt(omniIndexValue, 10) : null;

  await fetchWithAuth('/remote-click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      selector: target.tagName.toLowerCase(),
      index: Number.isFinite(omniIndex) ? omniIndex : 0,
      omniIndex: Number.isFinite(omniIndex) ? omniIndex : undefined,
      textContent: text.split('\n')[0].trim(),
    }),
  });
}

function connect() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}`);
  ws.onopen = () => {
    setStatus(true);
    fetchModelRunningState();
    loadConversation();
  };
  ws.onmessage = (event) => {
    const payload = JSON.parse(event.data);
    if (payload.type === 'snapshot_update') {
      loadConversation();
    }
    if (payload.type === 'model_status') {
      setModelRunningState(payload.running);
    }
    if (payload.type === 'error' && payload.message === 'Unauthorized') {
      window.location.href = '/login.html';
    }
  };
  ws.onclose = () => {
    setStatus(false);
    setTimeout(connect, 2000);
  };
}

sendBtn.addEventListener('click', sendMessage);
input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});
input.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = `${input.scrollHeight}px`;
});

chat.addEventListener('click', async (event) => {
  const target = event.target.closest('[data-omni-idx]');
  if (!target) return;

  try {
    await remoteClick(target);
    setTimeout(loadConversation, 450);
    setTimeout(loadConversation, 1000);
  } catch (_) {}
});

const minimalDocsBtn = document.getElementById('minimalDocsBtn');
if (minimalDocsBtn) {
  minimalDocsBtn.addEventListener('click', () => {
    window.location.href = '/artifacts.html';
  });
}

const minimalSettingsBtn = document.getElementById('minimalSettingsBtn');
const minimalSettingsModal = document.getElementById('minimalSettingsModal');
const minimalSettingsCloseBtn = document.getElementById('minimalSettingsCloseBtn');
const minimalQuotaContent = document.getElementById('minimalQuotaContent');

if (minimalSettingsBtn && minimalSettingsModal) {
  minimalSettingsBtn.addEventListener('click', async () => {
    minimalSettingsModal.style.display = 'flex';
    if (minimalQuotaContent) {
      minimalQuotaContent.innerHTML = '<span style="color: var(--text-secondary);">Loading...</span>';
      try {
        const response = await fetchWithAuth('/api/quota?force=true');
        if (response.ok) {
          const quota = await response.json();
          renderMinimalQuota(quota);
        } else {
          minimalQuotaContent.innerHTML = '<span style="color: var(--color-error);">Failed to load quota.</span>';
        }
      } catch (err) {
        minimalQuotaContent.innerHTML = '<span style="color: var(--color-error);">Failed to load quota.</span>';
      }
    }
  });

  minimalSettingsCloseBtn.addEventListener('click', () => {
    minimalSettingsModal.style.display = 'none';
  });
}

function formatResetText(text) {
  if (!text) return '';
  const match = text.match(/refresh in (.*)/i);
  if (match && match[1]) {
    let clean = match[1].replace(/\\.$/, '');
    return 'Refreshes in ' + clean;
  }
  return text; // fallback to full text
}

function renderMinimalQuota(quota) {
  if (!quota || !quota.available) {
    minimalQuotaContent.innerHTML = '<span style="color: var(--text-secondary);">Quota unavailable.</span>';
    return;
  }
  
  let html = '';
  
  if (quota.cdpGemini) {
    const gemini = quota.cdpGemini;
    html += '<div style="margin-bottom: 16px;">';
    html += '<strong style="display: block; margin-bottom: 12px; color: var(--text-primary, #fff);">Gemini Models</strong>';
    if (gemini.weeklyRemaining !== null) {
      html += `<div style="display: flex; justify-content: space-between; align-items: baseline;">`;
      html += `<div style="font-size: 14px; color: var(--text-secondary, #aaa);">Weekly Limit Remaining</div>`;
      html += `<div style="font-size: 16px; font-weight: bold; color: var(--text-primary, #fff);">${gemini.weeklyRemaining}%</div>`;
      html += `</div>`;
      if (gemini.weeklyResetText) {
        html += `<div style="font-size: 13px; color: var(--text-tertiary, #888); margin-top: 4px;">${formatResetText(gemini.weeklyResetText)}</div>`;
      }
    }
    if (gemini.fiveHourRemaining !== null) {
      if (gemini.weeklyRemaining !== null) html += `<div style="height: 12px;"></div>`;
      html += `<div style="display: flex; justify-content: space-between; align-items: baseline;">`;
      html += `<div style="font-size: 14px; color: var(--text-secondary, #aaa);">Five Hour Limit Remaining</div>`;
      html += `<div style="font-size: 16px; font-weight: bold; color: var(--text-primary, #fff);">${gemini.fiveHourRemaining}%</div>`;
      html += `</div>`;
      if (gemini.fiveHourResetText) {
        html += `<div style="font-size: 13px; color: var(--text-tertiary, #888); margin-top: 4px;">${formatResetText(gemini.fiveHourResetText)}</div>`;
      }
    }
    html += '</div>';
  }
  
  if (quota.cdpClaudeGpt) {
    const claude = quota.cdpClaudeGpt;
    html += '<div style="margin-bottom: 16px;">';
    html += '<strong style="display: block; margin-bottom: 12px; color: var(--text-primary, #fff);">Claude and GPT Models</strong>';
    if (claude.weeklyRemaining !== null) {
      html += `<div style="display: flex; justify-content: space-between; align-items: baseline;">`;
      html += `<div style="font-size: 14px; color: var(--text-secondary, #aaa);">Weekly Limit Remaining</div>`;
      html += `<div style="font-size: 16px; font-weight: bold; color: var(--text-primary, #fff);">${claude.weeklyRemaining}%</div>`;
      html += `</div>`;
      if (claude.weeklyResetText) {
        html += `<div style="font-size: 13px; color: var(--text-tertiary, #888); margin-top: 4px;">${formatResetText(claude.weeklyResetText)}</div>`;
      }
    }
    if (claude.fiveHourRemaining !== null) {
      if (claude.weeklyRemaining !== null) html += `<div style="height: 12px;"></div>`;
      html += `<div style="display: flex; justify-content: space-between; align-items: baseline;">`;
      html += `<div style="font-size: 14px; color: var(--text-secondary, #aaa);">Five Hour Limit Remaining</div>`;
      html += `<div style="font-size: 16px; font-weight: bold; color: var(--text-primary, #fff);">${claude.fiveHourRemaining}%</div>`;
      html += `</div>`;
      if (claude.fiveHourResetText) {
        html += `<div style="font-size: 13px; color: var(--text-tertiary, #888); margin-top: 4px;">${formatResetText(claude.fiveHourResetText)}</div>`;
      }
    }
    html += '</div>';
  }
  
  if (!html) {
    // Fallback to normal model quota
    const models = quota.models || [];
    if (models.length > 0) {
      html += '<div style="margin-bottom: 12px;">';
      html += '<strong style="display: block; margin-bottom: 6px; color: var(--text-primary, #fff);">Models</strong>';
      models.forEach(model => {
        html += `<div style="margin-bottom: 8px;">`;
        html += `<div style="font-size: 13px; color: var(--text-secondary, #aaa);">${model.name}</div>`;
        html += `<div style="font-size: 16px; font-weight: bold; color: var(--text-primary, #fff);">${model.remainingPercent}% left</div>`;
        if (model.resetTime) {
          html += `<div style="font-size: 12px; color: var(--text-tertiary, #888);">${model.resetTime}</div>`;
        }
        html += `</div>`;
      });
      html += '</div>';
    } else {
      html = '<span style="color: var(--text-secondary);">No quota data available.</span>';
    }
  }
  
  minimalQuotaContent.innerHTML = html;
}

connect();
