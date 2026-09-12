// background.js
// Service Worker: relai progres + mesin auto-download (chrome.downloads)

chrome.runtime.onInstalled.addListener(() => {
  console.log("Flow Automation Extension telah diinstal.");
});

// Mengaktifkan fitur buka side panel ketika icon extension di klik
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// ================================================================
// AUTO-DOWNLOAD: simpan file hasil otomatis ke subfolder + rename
// ================================================================
let session = null;        // pengaturan sesi download aktif
let pendingPrompt = null;  // konteks prompt untuk file yang sedang diunduh

function sanitize(name) {
  return String(name || '')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '')
    .slice(0, 80) || 'prompt';
}

function extFromStr(s) {
  const m = String(s || '').match(/\.([a-z0-9]{2,5})(\?|#|$)/i);
  return m ? m[1].toLowerCase() : '';
}

const MEDIA_EXTS = ['mp4', 'webm', 'mov', 'm4v', 'mkv', 'avi', 'mpeg', 'mpg', 'mp3', 'wav', 'm4a', 'ogg', 'oga', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'bmp'];

function isMediaLike(item) {
  const mime = (item.mime || '');
  if (mime.startsWith('video/') || mime.startsWith('image/')) return true;
  const fromName = extFromStr(item.filename || item.suggestedFilename);
  const fromUrl = extFromStr(item.url);
  return MEDIA_EXTS.includes(fromName || fromUrl);
}

function timestamp() {
  return new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
}

// Re-name dan pindahkan file ke subfolder. Berlaku untuk download yang
// dipicu oleh klik tombol di halaman (termasuk URL blob: yang tidak bisa
// di-download langsung dari background/service worker).
chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  if (!session || !pendingPrompt || !isMediaLike(item)) {
    suggest();
    return;
  }

  const ext = extFromStr(item.filename || item.suggestedFilename) || extFromStr(item.url) || 'mp4';
  const base = session.autoChangeFileName !== false
    ? sanitize(pendingPrompt)
    : String(item.suggestedFilename || item.filename || 'file').replace(/\.[a-z0-9]{2,5}$/i, '');
  const filename = `${sanitize(session.folderName)}/${base}-${timestamp()}.${ext}`;
  pendingPrompt = null;
  console.log('[Flow] Auto-download: rename ke', filename);
  suggest({ filename, conflictAction: 'uniquify' });
});

// Download URL http/https langsung dari background dengan nama & subfolder
// yang deterministik (tanpa menunggu prompt klik di halaman).
async function downloadDirect(message) {
  try {
    const url = message.url;
    if (!url || url.startsWith('blob:')) return;
    const ext = extFromStr(url) || 'mp4';
    const base = session && session.autoChangeFileName !== false && pendingPrompt
      ? sanitize(pendingPrompt)
      : 'file';
    const folder = sanitize((message.folderName) || (session && session.folderName) || 'veo-folder-1');
    const filename = `${folder}/${base}-${timestamp()}.${ext}`;
    await chrome.downloads.download({ url, filename, conflictAction: 'uniquify', saveAs: false });
    pendingPrompt = null;
  } catch (e) {
    console.error('[Flow] download_direct gagal:', e);
  }
}

// Relay pesan dari content script ke side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'progress_update':
      // Broadcast ke semua extension views (termasuk side panel)
      chrome.runtime.sendMessage(message).catch(() => {});
      break;

    case 'download_session':
      session = {
        folderName: message.folderName,
        autoChangeFileName: message.autoChangeFileName,
        video: message.video,
        image: message.image,
        mode: message.mode
      };
      break;

    case 'download_session_end':
      session = null;
      pendingPrompt = null;
      break;

    case 'download_tick':
      if (session) pendingPrompt = message.prompt || '';
      break;

    case 'download_direct':
      downloadDirect(message);
      break;
  }
  return false;
});