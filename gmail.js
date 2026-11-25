/* =========================================================================
   Connexion Gmail (optionnelle) — Google Identity Services + Gmail API
   Le jeton reste dans le navigateur (sessionStorage), jamais sur un serveur.
   Portées : lecture (synchroniser les fils) + composition (créer des brouillons).
   Aucun mail n'est envoyé par l'application : elle crée des brouillons que
   l'utilisateur relit et envoie lui-même depuis Gmail.
   ========================================================================= */
const Gmail = (() => {
  const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.compose';
  let token = null, expires = 0, email = null;
  try {
    const saved = JSON.parse(sessionStorage.getItem('cv_gmail') || 'null');
    if (saved && saved.expires > Date.now()) ({ token, expires, email } = saved);
  } catch (e) { /* stockage indisponible */ }

  function persist() {
    try { sessionStorage.setItem('cv_gmail', JSON.stringify({ token, expires, email })); } catch (e) {}
  }
  function loadGis() {
    return new Promise((res, rej) => {
      if (window.google && google.accounts && google.accounts.oauth2) return res();
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.onload = () => res();
      s.onerror = () => rej(new Error('Impossible de charger le service de connexion Google.'));
      document.head.appendChild(s);
    });
  }
  async function connect(clientId) {
    if (!clientId) throw new Error('Renseignez d’abord votre « Client ID » Google dans les paramètres.');
    if (location.protocol === 'file:') throw new Error('La connexion Gmail nécessite que l’application soit servie en http(s) (voir README : serve.ps1 ou GitHub Pages).');
    await loadGis();
    await new Promise((res, rej) => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: r => {
          if (r.error) return rej(new Error(r.error_description || r.error));
          token = r.access_token;
          expires = Date.now() + (Number(r.expires_in || 3600) - 60) * 1000;
          res();
        },
        error_callback: e => rej(new Error(e.message || e.type || 'Connexion annulée')),
      });
      client.requestAccessToken();
    });
    const p = await api('/gmail/v1/users/me/profile');
    email = p.emailAddress;
    persist();
    return email;
  }
  function disconnect() {
    if (token && window.google && google.accounts) google.accounts.oauth2.revoke(token, () => {});
    token = null; expires = 0; email = null;
    try { sessionStorage.removeItem('cv_gmail'); } catch (e) {}
  }
  const isConnected = () => !!token && Date.now() < expires;

  async function api(path, opts = {}, base = 'https://gmail.googleapis.com') {
    if (!token || Date.now() >= expires) throw new Error('Session Gmail expirée : reconnectez-vous (Paramètres ou bouton « Connecter Gmail »).');
    const r = await fetch(base + path, { ...opts, headers: { Authorization: 'Bearer ' + token, ...(opts.headers || {}) } });
    if (!r.ok) {
      let msg = r.status + '';
      try { msg += ' — ' + (await r.json()).error.message; } catch (e) {}
      throw new Error('Gmail : ' + msg);
    }
    return r.json();
  }

  /* ---- Lecture ---- */
  function b64urlToBytes(s) {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  const decodeText = s => new TextDecoder('utf-8').decode(b64urlToBytes(s));
  function htmlToText(h) {
    const d = new DOMParser().parseFromString(h, 'text/html');
    d.querySelectorAll('style,script').forEach(n => n.remove());
    d.querySelectorAll('br').forEach(n => n.replaceWith('\n'));
    d.querySelectorAll('p,div,li,tr').forEach(n => n.append('\n'));
    return (d.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
  }
  function parseMessage(m) {
    const H = {};
    (m.payload.headers || []).forEach(h => { H[h.name.toLowerCase()] = h.value; });
    let text = '', html = '';
    const attachments = [];
    (function walk(p) {
      if (!p) return;
      if (p.filename && p.body && p.body.attachmentId) {
        attachments.push({ name: p.filename, type: p.mimeType, size: p.body.size, attachmentId: p.body.attachmentId });
      } else if (p.mimeType === 'text/plain' && p.body && p.body.data && !text) text = decodeText(p.body.data);
      else if (p.mimeType === 'text/html' && p.body && p.body.data && !html) html = decodeText(p.body.data);
      (p.parts || []).forEach(walk);
    })(m.payload);
    return {
      id: m.id, threadId: m.threadId,
      from: H.from || '', to: H.to || '', cc: H.cc || '', subject: H.subject || '(sans objet)',
      date: Number(m.internalDate) || Date.parse(H.date) || Date.now(),
      messageId: H['message-id'] || '', references: H.references || '',
      snippet: m.snippet || '', body: text || (html ? htmlToText(html) : m.snippet || ''),
      attachments, source: 'gmail',
    };
  }
  async function searchThreads(q, max = 15) {
    const r = await api('/gmail/v1/users/me/threads?maxResults=' + max + '&q=' + encodeURIComponent(q));
    return r.threads || [];
  }
  async function getThread(id) {
    const t = await api('/gmail/v1/users/me/threads/' + id + '?format=full');
    return (t.messages || []).map(parseMessage);
  }
  async function getAttachment(msgId, attId, type) {
    const r = await api(`/gmail/v1/users/me/messages/${msgId}/attachments/${attId}`);
    return new Blob([b64urlToBytes(r.data)], { type: type || 'application/octet-stream' });
  }

  /* ---- Brouillons ---- */
  const utf8b64 = s => btoa(unescape(encodeURIComponent(s)));
  const encHeader = s => /[^\x20-\x7e]/.test(s) ? '=?UTF-8?B?' + utf8b64(s) + '?=' : s;
  const wrap76 = s => s.replace(/.{1,76}/g, '$&\r\n');
  function blobToB64(blob) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result).split(',')[1] || '');
      fr.onerror = () => rej(fr.error);
      fr.readAsDataURL(blob);
    });
  }
  async function buildMime({ to, cc, subject, body, inReplyTo, references, attachments = [] }) {
    const lines = [];
    if (email) lines.push('From: ' + email);
    lines.push('To: ' + (to || ''));
    if (cc) lines.push('Cc: ' + cc);
    lines.push('Subject: ' + encHeader(subject || ''));
    if (inReplyTo) { lines.push('In-Reply-To: ' + inReplyTo); lines.push('References: ' + ((references ? references + ' ' : '') + inReplyTo)); }
    lines.push('MIME-Version: 1.0');
    const textPart = ['Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', wrap76(utf8b64(body || ''))].join('\r\n');
    if (!attachments.length) return lines.join('\r\n') + '\r\n' + textPart;
    const b = 'cv_' + Math.random().toString(36).slice(2);
    lines.push('Content-Type: multipart/mixed; boundary="' + b + '"', '');
    let out = lines.join('\r\n') + '\r\n--' + b + '\r\n' + textPart + '\r\n';
    for (const a of attachments) {
      const data = await blobToB64(a.blob);
      out += '--' + b + '\r\n' +
        'Content-Type: ' + (a.type || 'application/octet-stream') + '; name="' + encHeader(a.name) + '"\r\n' +
        'Content-Disposition: attachment; filename="' + encHeader(a.name) + '"\r\n' +
        'Content-Transfer-Encoding: base64\r\n\r\n' + wrap76(data) + '\r\n';
    }
    return out + '--' + b + '--';
  }
  async function createDraft(msg) {
    const mime = await buildMime(msg);
    const meta = { message: msg.threadId ? { threadId: msg.threadId } : {} };
    const b = 'cvup_' + Math.random().toString(36).slice(2);
    const payload = new Blob([
      '--' + b + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(meta) + '\r\n',
      '--' + b + '\r\nContent-Type: message/rfc822\r\n\r\n', mime, '\r\n--' + b + '--',
    ]);
    return api('/upload/gmail/v1/users/me/drafts?uploadType=multipart', {
      method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body: payload,
    });
  }

  return { connect, disconnect, isConnected, get email() { return email; }, searchThreads, getThread, getAttachment, createDraft };
})();
