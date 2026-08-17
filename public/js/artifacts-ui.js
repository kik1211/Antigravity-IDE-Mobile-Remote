import { renderConversationToContainer, sanitizeHTML } from './chat-renderer.js';

document.addEventListener('DOMContentLoaded', async () => {
    const listView = document.getElementById('listView');
    const docView = document.getElementById('docView');
    const listContainer = document.getElementById('listContainer');
    const docContent = document.getElementById('docContent');
    const navBackBtn = document.getElementById('navBackBtn');
    const pageTitle = document.getElementById('pageTitle');
    const copyBtn = document.getElementById('copyBtn');
    const zoomControls = document.getElementById('zoomControls');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const zoomLabel = document.getElementById('zoomLabel');

    let currentDocId = null;
    let currentZoom = 1.0;
    let ws = null;

    // Navigation Back
    navBackBtn.addEventListener('click', () => {
        if (docView.style.display === 'block') {
            docView.style.display = 'none';
            listView.style.display = 'block';
            pageTitle.textContent = 'Documents';
            copyBtn.style.display = 'none';
            zoomControls.style.display = 'none';
            currentDocId = null;
            currentZoom = 1.0;
            docContent.style.transform = `scale(1)`;
        } else {
            // Go back to the main app (handling if it was opened from Minimal or Home)
            if (document.referrer && document.referrer.includes('/minimal')) {
                window.location.href = '/minimal';
            } else {
                window.location.href = '/';
            }
        }
    });

    // Zoom Controls
    zoomInBtn.addEventListener('click', () => setZoom(currentZoom + 0.2));
    zoomOutBtn.addEventListener('click', () => setZoom(currentZoom - 0.2));

    function setZoom(level) {
        if (level < 0.4 || level > 3.0) return;
        currentZoom = level;
        zoomLabel.textContent = `${Math.round(currentZoom * 100)}%`;
        docContent.style.transform = `scale(${currentZoom})`;
        
        // Adjust width to compensate for scale so horizontal scroll doesn't break
        docContent.style.width = `${100 / currentZoom}%`;
    }

    // Copy to clipboard
    copyBtn.addEventListener('click', async () => {
        try {
            // Get plain text of the rendered document
            let text = docContent.innerText;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for non-secure HTTP
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            
            const orig = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => copyBtn.textContent = orig, 2000);
        } catch (e) {
            alert('Copy failed: ' + e.message);
        }
    });

    // Connect WebSocket for Live Updates
    function connectLiveUpdates() {
        if (ws) return;
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${protocol}//${location.host}/`);
        ws.onmessage = async (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === 'snapshot_update' && currentDocId === 'current_conversation') {
                    const res = await fetch('/api/conversation.json');
                    if (res.ok) {
                        const payload = await res.json();
                        if (payload.available && payload.messages) {
                            renderConversationToContainer(payload.messages, docContent, null, false);
                        }
                    }
                } else if (msg.type === 'snapshot' && currentDocId === 'current_conversation') {
                    if (msg.html) {
                        docContent.innerHTML = msg.html;
                        highlightCode();
                    }
                }
            } catch (e) {}
        };
        ws.onclose = () => {
            ws = null;
            setTimeout(connectLiveUpdates, 2000);
        };
    }

    function highlightCode() {
        if (window.Prism && window.Prism.highlightAllUnder) {
            window.Prism.highlightAllUnder(docContent);
        }
    }

    async function loadArtifacts() {
        try {
            const res = await fetch('/api/artifacts');
            const data = await res.json();
            if (!data.success || !data.available) {
                listContainer.innerHTML = '<div class="empty-state">No documents available.<br>Start a session in Antigravity.</div>';
                return;
            }

            listContainer.innerHTML = '';
            
            const currentHeader = document.createElement('div');
            currentHeader.style.cssText = 'padding: 10px 15px; font-weight: bold; font-size: 12px; color: #888; text-transform: uppercase; margin-top: 10px;';
            currentHeader.textContent = 'Current';
            listContainer.appendChild(currentHeader);
            
            data.files.forEach(f => {
                const item = document.createElement('div');
                item.className = `doc-item ${f.isVirtual ? 'virtual' : ''}`;
                
                const sizeStr = f.size ? `${Math.round(f.size/1024)} KB` : '';
                const dateStr = new Date(f.modified).toLocaleString();
                const metaStr = f.isVirtual ? 'Live View' : `${sizeStr} • ${dateStr}`;
                
                item.innerHTML = `
                    <div style="flex: 1; display: flex; flex-direction: column;">
                        <div class="doc-name">${f.name}</div>
                        <div class="doc-meta">${metaStr}</div>
                    </div>
                    <div class="download-btn" data-id="${f.id}" data-name="${f.name}" style="padding: 8px; cursor: pointer; color: #8ab4f8; margin-right: 8px; z-index: 2;" title="Download">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </div>
                    <div style="opacity: 0.5;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                    </div>
                `;
                item.addEventListener('click', (e) => {
                    const downloadBtn = e.target.closest('.download-btn');
                    if (downloadBtn) {
                        e.stopPropagation();
                        downloadDocument(f);
                    } else {
                        openDoc(f);
                    }
                });
                listContainer.appendChild(item);
            });
            
            if (data.projectFiles && data.projectFiles.length > 0) {
                const projHeader = document.createElement('div');
                projHeader.style.cssText = 'padding: 10px 15px; font-weight: bold; font-size: 12px; color: #888; text-transform: uppercase; margin-top: 20px;';
                projHeader.textContent = 'Project Files — Recently Modified';
                listContainer.appendChild(projHeader);
                
                data.projectFiles.forEach(f => {
                    const item = document.createElement('div');
                    item.className = 'doc-item';
                    const sizeStr = f.size ? `${Math.round(f.size/1024)} KB` : '';
                    const dateStr = new Date(f.modified).toLocaleString();
                    const metaStr = `${f.relPath} • ${sizeStr} • ${dateStr}`;
                    
                    item.innerHTML = `
                        <div style="min-width: 0; flex: 1; display: flex; flex-direction: column;">
                            <div class="doc-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${f.name}</div>
                            <div class="doc-meta" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${metaStr}</div>
                        </div>
                        <div class="download-btn" data-id="${f.id}" data-name="${f.name}" style="padding: 8px; cursor: pointer; color: #8ab4f8; margin-right: 8px; z-index: 2;" title="Download">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        </div>
                        <div style="opacity: 0.5;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                        </div>
                    `;
                    item.addEventListener('click', (e) => {
                        const downloadBtn = e.target.closest('.download-btn');
                        if (downloadBtn) {
                            e.stopPropagation();
                            downloadDocument(f);
                        } else {
                            openDoc(f);
                        }
                    });
                    listContainer.appendChild(item);
                });
            }
        } catch (e) {
            listContainer.innerHTML = `<div style="color:red; padding: 20px;">Error loading documents: ${e.message}</div>`;
        }
    }

    async function downloadDocument(file) {
        try {
            if (file.id === 'current_conversation') {
                const res = await fetch('/api/conversation.json');
                if (!res.ok) throw new Error('Failed to load conversation for download');
                const payload = await res.json();
                if (!payload.available || !payload.messages) throw new Error('No conversation data');
                
                let textContent = '';
                for (const msg of payload.messages) {
                    const roleName = msg.role.toUpperCase();
                    textContent += `### ${roleName}\n${msg.content || ''}\n\n`;
                }
                
                const blob = new Blob([textContent], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'current_conversation.md';
                a.click();
                URL.revokeObjectURL(url);
            } else {
                const a = document.createElement('a');
                a.href = `/api/artifacts/${encodeURIComponent(file.id)}`;
                a.download = file.name;
                a.click();
            }
        } catch (e) {
            alert('Download failed: ' + e.message);
        }
    }

    async function openDoc(file) {
        currentDocId = file.id;
        listView.style.display = 'none';
        docView.style.display = 'block';
        pageTitle.textContent = file.name;
        copyBtn.style.display = 'inline-flex';
        zoomControls.style.display = 'flex';
        currentZoom = 1.0;
        setZoom(1.0);
        
        docContent.innerHTML = '<div style="text-align:center; padding:40px;">Loading...</div>';

        try {
            if (file.id === 'current_conversation') {
                const res = await fetch('/api/conversation.json');
                if (!res.ok) throw new Error('Failed to load conversation');
                const payload = await res.json();
                
                docContent.innerHTML = '';
                if (!payload.available || !payload.messages || payload.messages.length === 0) {
                    docContent.innerHTML = '<div>No conversation history found.</div>';
                } else {
                    renderConversationToContainer(payload.messages, docContent, null, false);
                }
                // Connect WS for live updates if not connected
                connectLiveUpdates();
            } else {
                const res = await fetch(`/api/artifacts/${encodeURIComponent(file.id)}`);
                if (!res.ok) throw new Error('Failed to load document');
                const md = await res.text();
                const html = window.marked ? window.marked.parse(md) : `<pre>${md}</pre>`;
                docContent.innerHTML = sanitizeHTML(html);
                highlightCode();
            }
        } catch (e) {
            docContent.innerHTML = `<div style="color:red; padding:20px;">Error: ${e.message}</div>`;
        }
    }

    loadArtifacts().then(() => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        if (id) {
            openDoc({id: id, name: id});
        }
    });
});
