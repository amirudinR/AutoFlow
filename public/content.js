// content.js
// Skrip ini akan disuntikkan (injected) ke dalam halaman web yang sedang dibuka.
(() => {
  // Guard anti-injeksi ganda: manifest (content_scripts) sudah memasang skrip
  // ini otomatis di setiap halaman; injeksi ulang dari UI hanya fallback.
  // Keluar diam-diam agar tidak memenuhi halaman Errors extension.
  if (globalThis.__flowAutomationContentLoaded) {
    return;
  }

  globalThis.__flowAutomationContentLoaded = true;
  console.log("Flow Automation: Content script loaded.");

// AUTO-DIAGNOSTIK: Scan halaman setelah dimuat
setTimeout(() => {
  console.log("=== [FLOW DIAGNOSTIK] Mencari elemen Image/Video ===");
  const allElements = document.querySelectorAll('*');
  let count = 0;
  allElements.forEach(el => {
    const directText = Array.from(el.childNodes)
      .filter(n => n.nodeType === Node.TEXT_NODE)
      .map(n => n.textContent.trim())
      .join('')
      .toLowerCase();
    
    if ((directText.includes('image') || directText.includes('video')) && directText.length < 40 && count < 30) {
      count++;
      console.log(`[DIAG ${count}] <${el.tagName}> class="${el.className?.toString?.()?.substring(0,120) || ''}" role="${el.getAttribute('role')}" text="${directText}"`);
    }
  });

  // Log juga semua tombol/clickable yang ada di bottom bar (dekat input)
  console.log("=== [FLOW DIAGNOSTIK] Semua tombol di halaman ===");
  const allBtns = document.querySelectorAll('button, [role="button"]');
  allBtns.forEach((btn, i) => {
    if (i < 50) {
      const text = (btn.textContent || '').trim().substring(0, 40);
      const cls = btn.className?.toString?.()?.substring(0, 100) || '';
      const aria = btn.getAttribute('aria-label') || '';
      console.log(`[BTN ${i}] <${btn.tagName}> aria="${aria}" text="${text}" class="${cls}"`);
    }
  });
  console.log("=== [FLOW DIAGNOSTIK] Selesai ===");
}, 3000);

// Helper: kirim status update ke extension UI
function sendStatus(data) {
  try {
    chrome.runtime.sendMessage({ action: 'progress_update', ...data });
  } catch (e) {}
}

// Helper: Delay
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ================================================================
// AUTO-DOWNLOAD: download otomatis hasil media (tanpa klik satu-satu)
// ================================================================
function isDownloadControl(el) {
  if (!el) return false;
  const aria = (el.getAttribute('aria-label') || '').toLowerCase();
  const title = (el.getAttribute('title') || '').toLowerCase();
  const text = (el.textContent || '').trim().toLowerCase();
  const cls = (el.className && el.className.toString) ? el.className.toString().toLowerCase() : '';
  const blocked = ['upload', 'menu', 'close', 'cancel', 'back', 'delete', 'remove', 'settings', 'more', 'share', 'copy', 'thumb'];
  if (blocked.some(k => aria.includes(k) || cls.includes(k))) return false;
  if (el.hasAttribute('download')) return true;
  return aria.includes('download') || title.includes('download') || text.includes('download') ||
         cls.includes('download') || cls.includes('icon-download');
}

function isVisible(el) {
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return false;
  const cs = getComputedStyle(el);
  return cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0';
}

function isDisabled(el) {
  return el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true' ||
         (el.className && el.className.toString().toLowerCase().includes('disabled'));
}

function findDownloadControls() {
  const nodes = document.querySelectorAll('a[download], a[href], button, [role="button"], [role="menuitem"], [class*="download"]');
  const out = [];
  for (const el of nodes) {
    if (!isDownloadControl(el) || isDisabled(el) || !isVisible(el)) continue;
    out.push(el);
  }
  return out;
}

function getDirectMediaUrl(control) {
  if (control.tagName === 'A' && control.href && !control.href.startsWith('blob:')) return control.href;
  const a = control.querySelector('a[href]');
  if (a && a.href && !a.href.startsWith('blob:')) return a.href;
  return null;
}

function readQualityOption(quality) {
  const token = String(quality || '').split(' ')[0].toLowerCase().replace(/\s+/g, '');
  if (!token) return null;
  const els = document.querySelectorAll('mat-option, [role="option"], [role="menuitem"], .mdc-list-item, li, button, span, div, label');
  let best = null;
  for (const el of els) {
    const text = (el.textContent || '').trim();
    const norm = text.toLowerCase().replace(/\s+/g, '');
    if (norm.includes(token) && text.length < 40 && isVisible(el)) {
      if (!best) best = el;
    }
  }
  return best ? (best.closest('mat-option, [role="option"], [role="menuitem"], [mat-menu-item], .mat-mdc-menu-item, .mat-menu-item, li, .mdc-list-item, button') || best) : null;
}

async function downloadOne(control, quality) {
  try {
    const directUrl = getDirectMediaUrl(control);
    if (directUrl) {
      console.log('[Flow] Auto-download via URL:', directUrl.slice(0, 120));
      chrome.runtime.sendMessage({ action: 'download_direct', url: directUrl });
      return;
    }
    console.log('[Flow] Auto-download: klik tombol download.');
    control.click();
    await wait(900);
    const qualityOption = readQualityOption(quality);
    if (qualityOption) {
      console.log('[Flow] Auto-download: pilih kualitas ' + quality + '.');
      qualityOption.click();
      await wait(400);
    }
  } catch (e) {
    console.error('[Flow] Auto-download gagal:', e);
  }
}

async function handleAutoDownload(prompts, settings, mode) {
  const isImage = String(mode).toLowerCase().includes('image');
  const quality = isImage ? settings.autoDownloadImage : settings.autoDownloadVideo;
  if (!quality || String(quality).toLowerCase() === 'no download') {
    console.log('[Flow] Auto-download nonaktif (No Download).');
    return;
  }
  const outputs = Math.max(1, Number(settings.outputsPerPrompt) || 1);
  const expected = (prompts || []).length * outputs;
  console.log(`[Flow] Auto-download aktif (${quality}). Target: ${expected} item.`);

  const baseline = new Set(findDownloadControls());
  const collected = new Set();
  let done = 0;
  const batchDeadline = Date.now() + 25 * 60 * 1000; // maksimal 25 menit
  const idleTimeout = 4 * 60 * 1000;                 // berhenti jika 4 menit tanpa item baru
  let lastItemAt = Date.now();

  while (Date.now() < batchDeadline) {
    if (!isAutomationRunning) return;
    const controls = findDownloadControls();
    for (const control of controls) {
      if (baseline.has(control) || collected.has(control)) continue;
      collected.add(control);
      const prompt = prompts[Math.min(Math.floor(done / outputs), prompts.length - 1)] || '';
      done++;
      lastItemAt = Date.now();
      chrome.runtime.sendMessage({ action: 'download_tick', prompt });
      await downloadOne(control, quality);
      await wait(2000);
      if (collected.size >= expected) break;
    }
    if (collected.size >= expected) break;
    if (Date.now() - lastItemAt > idleTimeout) {
      console.log('[Flow] Auto-download: tidak ada hasil baru, berhenti menunggu.');
      break;
    }
    await wait(2500);
  }
  console.log(`[Flow] Auto-download selesai: ${collected.size}/${expected} item terunduh.`);
}

// ================================================================
// MODE SWITCHING: Ganti mode Image/Video di halaman Google Flow
// ================================================================
async function switchMode(mode) {
  const needImage = mode.toLowerCase().includes('image');
  const needVideo = mode.toLowerCase().includes('video');

  if (!needImage && !needVideo) {
    console.log("[Flow] Mode tidak memerlukan switch:", mode);
    return;
  }

  const targetLabel = needImage ? 'image' : 'video';
  console.log(`[Flow] Mencoba switch ke mode: ${targetLabel}`);

  // SEMUA elemen di halaman (termasuk spans, divs, dll)
  const everything = document.querySelectorAll('*');
  
  // Strategi 1: Cari elemen clickable yang teks langsungnya PERSIS "Image" atau "Video"
  for (const el of everything) {
    const directText = Array.from(el.childNodes)
      .filter(n => n.nodeType === Node.TEXT_NODE)
      .map(n => n.textContent.trim())
      .join('')
      .toLowerCase();
    
    if (directText === targetLabel) {
      // Cari parent clickable terdekat
      const clickable = el.closest('button, [role="tab"], [role="button"], mat-button-toggle, label, [role="radio"]') || el;
      console.log(`[Flow] Klik mode "${targetLabel}" (exact match):`, clickable.tagName, clickable.className?.toString?.()?.substring(0, 80));
      clickable.click();
      await wait(600);
      return;
    }
  }

  // Strategi 2: Cari dengan partial match tapi pendek
  const allClickables = document.querySelectorAll('button, [role="tab"], [role="button"], mat-button-toggle, label, span, div');
  for (const el of allClickables) {
    const text = (el.textContent || '').trim().toLowerCase();
    const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
    
    if ((text === targetLabel || ariaLabel === targetLabel) && text.length < 15) {
      console.log(`[Flow] Klik mode "${targetLabel}" (strategi 2):`, el.tagName, text);
      el.click();
      await wait(600);
      return;
    }
  }

  // Strategi 3: mat-button-toggle (Angular Material)
  const toggleButtons = document.querySelectorAll('mat-button-toggle, .mat-button-toggle');
  for (const btn of toggleButtons) {
    const text = (btn.textContent || '').trim().toLowerCase();
    if (text.includes(targetLabel)) {
      const clickTarget = btn.querySelector('button') || btn;
      console.log(`[Flow] Klik mat-button-toggle "${targetLabel}"`);
      clickTarget.click();
      await wait(600);
      return;
    }
  }

  // Strategi 4: Radio/segmented buttons
  const radioInputs = document.querySelectorAll('input[type="radio"]');
  for (const radio of radioInputs) {
    const label = radio.getAttribute('aria-label') || '';
    const value = radio.getAttribute('value') || '';
    if (label.toLowerCase().includes(targetLabel) || value.toLowerCase().includes(targetLabel)) {
      console.log(`[Flow] Klik radio "${targetLabel}"`);
      radio.click();
      await wait(600);
      return;
    }
  }

  console.warn(`[Flow] Tidak dapat menemukan tombol mode "${targetLabel}".`);
}

// ================================================================
// SETTINGS SWITCHING: Mengatur Ukuran/Format/Model
// ================================================================

// Normalisasi untuk perbandingan label: "16:9 (YouTube)" -> "169youtube",
// "9 / 16" -> "916". Titik-dua, spasi, dan garis miring diabaikan.
function normToken(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Alias label rasio yang dipakai Google Flow (mis. "Landscape", "Portrait").
const RATIO_ALIASES = {
  '169': ['landscape', 'horizontal', 'widescreen', 'wide'],
  '916': ['portrait', 'vertical'],
  '11': ['square'],
  '34': ['portrait', 'vertical'],
  '43': ['landscape', 'horizontal']
};

// Helper untuk mencari dan mengklik opsi dropdown yang mengandung teks tertentu.
// scopeEl: batasi pencarian di dalam menu yang sedang terbuka. WAJIB ada —
// tanpa menu terbuka kita tidak mengklik apa pun (mencegah klik tombol toggle
// pengaturan itu sendiri). excludeEl: elemen yang tidak boleh diklik.
async function selectDropdownOption(targetText, scopeEl, excludeEl) {
  if (!targetText) return false;
  if (!scopeEl) {
    console.warn(`[Flow] Opsi "${targetText}" dibatalkan: menu pengaturan tidak terbuka.`);
    return false;
  }

  const textLower = String(targetText).toLowerCase();
  const normTarget = normToken(targetText);
  const searchTerms = [textLower];
  if (RATIO_ALIASES[normTarget]) searchTerms.push(...RATIO_ALIASES[normTarget]);
  if (textLower.includes('nano banana pro')) searchTerms.push('nano banana 2', 'nano banana');
  console.log(`[Flow] Mencari opsi "${targetText}" di menu yang terbuka...`);

  const allElements = scopeEl.querySelectorAll('mat-option, [role="option"], [role="menuitem"], mat-menu-item, .mat-mdc-menu-item, li, .mdc-list-item, button, span, div');
  const matches = [];

  for (const el of allElements) {
    if (excludeEl && (el === excludeEl || excludeEl.contains(el))) continue;
    const text = (el.textContent || '').trim().toLowerCase();
    const ariaLabel = (el.getAttribute('aria-label') || '').trim().toLowerCase();
    if (!text && !ariaLabel) continue;
    if (!isVisible(el)) continue;
    const normText = normToken(text);
    const normAria = normToken(ariaLabel);

    let score = -1;
    if (text === textLower || ariaLabel === textLower) score = 1000;
    else if (normTarget && (normText === normTarget || normAria === normTarget)) score = 950;
    else if (normTarget && (normText.includes(normTarget) || normAria.includes(normTarget))) score = 600;
    else {
      const aliasHit = searchTerms.slice(1).some(term => {
        const nt = normToken(term);
        return text.includes(term) || ariaLabel.includes(term) ||
          (nt && (normText.includes(nt) || normAria.includes(nt)));
      });
      if (aliasHit) score = 150;
    }
    if (score < 0 || text.length > 80) continue;

    const menuItem = el.closest('mat-option, [role="option"], [role="menuitem"], mat-menu-item, .mat-mdc-menu-item, .mat-menu-item, li, .mdc-list-item, button');
    const clickable = menuItem || el;
    if (excludeEl && (clickable === excludeEl || excludeEl.contains(clickable))) continue;
    const isMenuItem = clickable.matches('mat-option, [role="option"], [role="menuitem"], mat-menu-item, li, .mdc-list-item');
    matches.push({ clickable, text: text || ariaLabel, score: score + (isMenuItem ? 100 : 0) - Math.min(text.length, 80) });
  }

  matches.sort((a, b) => b.score - a.score);
  if (matches.length > 0) {
    const match = matches[0];
    console.log(`[Flow] Ketemu opsi: "${match.text}"`, match.clickable.tagName);
    match.clickable.click();
    await wait(600);
    return true;
  }

  console.warn(`[Flow] Opsi "${targetText}" tidak ditemukan di menu yang terbuka!`);
  return false;
}

// Menu overlay yang sedang terbuka (Angular Material / menu ARIA).
function findOpenMenuContainer() {
  const candidates = document.querySelectorAll('.cdk-overlay-pane, [role="menu"], [role="listbox"], mat-menu-panel, .mat-mdc-menu-panel, .mat-select-panel, .mdc-menu-surface--open');
  for (const c of candidates) {
    if (!isVisible(c)) continue;
    if (c.querySelector('mat-option, [role="option"], [role="menuitem"], mat-menu-item, .mat-mdc-menu-item, li, button')) return c;
  }
  return null;
}

// Cari tombol toggle pengaturan (biasanya di bilah composer, dekat input).
// Hanya MENCARI — tidak mengklik.
function findSettingsToggleButton(targetModelText) {
  const blacklist = ['send', 'upload', 'close', 'cancel', 'back', 'delete', 'remove', 'more'];
  const keys = ['x1', 'x2', 'x3', 'x4', '16:9', '9:16', '1:1', '3:4', '4:3', 'veo', 'banana', 'omni', 'flash', 'pro', 'lite', 'fast', 'quality'];
  const isBlacklisted = (el) => {
    const cls = (el.className?.toString?.() || '').toLowerCase();
    const aria = (el.getAttribute('aria-label') || '').toLowerCase();
    return blacklist.some(b => cls.includes(b) || aria.includes(b));
  };

  const scopes = [];
  try {
    const input = (typeof findPromptInput === 'function') ? findPromptInput() : null;
    if (input) {
      const bar = input.closest('form, [class*="prompt"], [class*="composer"], [class*="input-bar"], [class*="toolbar"], [class*="bottom"]');
      if (bar) scopes.push(bar);
      if (input.parentElement) scopes.push(input.parentElement);
    }
  } catch (e) {}
  scopes.push(document);

  for (const scope of scopes) {
    const btns = scope.querySelectorAll('button, [role="button"], mat-select, [role="combobox"]');
    for (const btn of btns) {
      if (isBlacklisted(btn)) continue;
      const text = (btn.textContent || '').trim().toLowerCase();
      if (!text || text.length > 40) continue;
      if (keys.some(k => text.includes(k))) {
        console.log('[Flow] Tombol pengaturan:', text.substring(0, 60));
        return btn;
      }
    }
  }

  // Fallback: kata kunci model (mis. "nano banana")
  if (targetModelText) {
    const clean = String(targetModelText).replace(/[^\w\s]/gi, '').toLowerCase().replace('pro', '').replace('lite', '').trim();
    const keywords = clean.split(' ').filter(k => k.length > 2);
    const modelBtns = document.querySelectorAll('button, [role="button"], mat-select, [role="combobox"]');
    for (const btn of modelBtns) {
      if (isBlacklisted(btn)) continue;
      const text = (btn.textContent || '').trim().toLowerCase();
      if (text && text.length < 30 && keywords.some(kw => text.includes(kw))) {
        console.log('[Flow] Tombol pengaturan via kata kunci model:', text);
        return btn;
      }
    }
  }
  return null;
}

// Pastikan menu pengaturan terbuka. TIDAK mengklik ulang bila sudah terbuka
// (mencegah menu malah tertutup / toggle-race).
async function ensureMenuOpen(toggle) {
  if (findOpenMenuContainer()) return true;
  if (!toggle || !isVisible(toggle)) {
    console.warn('[Flow] Tombol pengaturan tidak ditemukan atau tidak terlihat.');
    return false;
  }
  toggle.click();
  await wait(900);
  if (findOpenMenuContainer()) return true;
  await wait(900);
  const opened = !!findOpenMenuContainer();
  if (!opened) console.warn('[Flow] Menu pengaturan tidak terbuka setelah tombol diklik.');
  return opened;
}

async function closeMenuIfOpen() {
  if (!findOpenMenuContainer()) return;
  document.body.click();
  await wait(400);
  if (findOpenMenuContainer()) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await wait(400);
  }
}

// Fungsi utama untuk mengaplikasikan semua setelan
async function applySettings(settings, mode) {
  if (!settings) return;

  const isImageMode = mode.toLowerCase().includes('image');
  const targetModel = isImageMode ? settings.imageModel : settings.videoModel;

  console.log(`[Flow] Menerapkan setelan: Model=${targetModel}, Rasio=${settings.aspectRatio}`);

  // Cari ulang tombol toggle setiap langkah (DOM Angular bisa me-render ulang),
  // pastikan menu terbuka (tanpa klik toggle buta), lalu pilih opsi di dalam menu.
  const pickOption = async (label, keyword) => {
    const toggle = findSettingsToggleButton(targetModel);
    if (!toggle) {
      console.warn(`[Flow] Gagal menemukan tombol pengaturan untuk ${label}.`);
      return false;
    }
    if (!await ensureMenuOpen(toggle)) return false;
    return selectDropdownOption(keyword, findOpenMenuContainer(), toggle);
  };

  // 1. Pilih Model
  if (targetModel) {
    // Kita ambil kata kunci unik dari model untuk mencocokkan di dropdown
    // Misalnya "🍌 Nano Banana Pro" -> "Nano Banana Pro"
    let modelKeyword = String(targetModel).replace(/[^\w\s-]/gi, '').trim().split('-')[0].trim();
    if (modelKeyword.length < 3) modelKeyword = targetModel; // fallback

    await pickOption('model', modelKeyword);
  }

  // 2. Pilih Aspect Ratio (+verifikasi benar-benar kepilih di tombol)
  if (settings.aspectRatio) {
    // Ekstrak rasio (misal "16:9 (YouTube)" -> "16:9")
    const ratioKeyword = String(settings.aspectRatio).split(' ')[0];
    const ok = await pickOption('rasio', ratioKeyword);
    await wait(300);
    const toggle = findSettingsToggleButton(targetModel);
    const toggleNorm = normToken(toggle ? toggle.textContent : '');
    if (ok && toggleNorm.includes(normToken(ratioKeyword))) {
      console.log(`[Flow] Rasio terverifikasi: ${ratioKeyword}.`);
    } else {
      console.warn(`[Flow] Rasio ${ratioKeyword} BELUM tentu kepilih. Tombol menunjukkan: "${toggle ? toggle.textContent.trim().substring(0, 60) : '(tidak ketemu)'}".`);
    }
  }

  // 3. Jika mode video, pilih durasi
  if (!isImageMode && settings.videoOption) {
    // Ekstrak detik (misal "8 seconds" -> "8s")
    const durationKeyword = String(settings.videoOption).split(' ')[0];
    await pickOption('durasi', `${durationKeyword}s`);
  }

  // Pilih jumlah output pada menu Flow (x1 sampai x4).
  if (settings.outputsPerPrompt) {
    await pickOption('output', `x${settings.outputsPerPrompt}`);
  }

  // Tutup menu jika masih terbuka
  await closeMenuIfOpen();
}

// ================================================================
// PENCARIAN ELEMEN INPUT
// ================================================================
function findPromptInput() {
  // Strategi 1: placeholder text
  const allInputs = document.querySelectorAll('textarea, input[type="text"], [contenteditable="true"], [role="textbox"]');
  for (const el of allInputs) {
    const placeholder = el.getAttribute('placeholder') || el.getAttribute('aria-placeholder') || el.getAttribute('aria-label') || '';
    if (placeholder.toLowerCase().includes('create') || placeholder.toLowerCase().includes('want') || placeholder.toLowerCase().includes('prompt')) {
      console.log("[Flow] Found input via placeholder:", el.tagName, placeholder);
      return el;
    }
  }

  // Strategi 2: contenteditable (ProseMirror)
  const editables = document.querySelectorAll('[contenteditable="true"]');
  if (editables.length > 0) {
    console.log("[Flow] Found contenteditable element:", editables[0].tagName, editables[0].className?.toString?.()?.substring(0, 60));
    return editables[0];
  }

  // Strategi 3-6: textarea, text input, role=textbox, deep scan
  const fallbacks = [
    'textarea', 'input[type="text"]', '[role="textbox"]',
    '[contenteditable], [role="combobox"], .mdc-text-field__input'
  ];
  for (const sel of fallbacks) {
    const el = document.querySelector(sel);
    if (el) {
      console.log("[Flow] Found input via fallback:", sel);
      return el;
    }
  }

  console.warn("[Flow] No input found.");
  return null;
}

// ================================================================
// PENCARIAN TOMBOL SUBMIT (BUKAN UPLOAD!)
// ================================================================
function findSubmitButton() {
  // BLACKLIST: Jangan pernah klik tombol-tombol ini
  const blacklist = ['upload', 'menu', 'close', 'cancel', 'back', 'delete', 'remove', 'settings', 'more'];
  
  function isBlacklisted(el) {
    const cls = (el.className?.toString?.() || '').toLowerCase();
    const aria = (el.getAttribute('aria-label') || '').toLowerCase();
    const text = (el.textContent || '').trim().toLowerCase();
    return blacklist.some(b => cls.includes(b) || aria.includes(b));
  }

  // Strategi 1: Tombol dengan aria-label "send", "create", "generate"
  const ariaButtons = document.querySelectorAll('button[aria-label], [role="button"][aria-label]');
  for (const btn of ariaButtons) {
    if (isBlacklisted(btn)) continue;
    const label = (btn.getAttribute('aria-label') || '').toLowerCase();
    if (label.includes('send') || label.includes('create') || label.includes('generate') || label.includes('submit') || label.includes('run')) {
      console.log("[Flow] Found button via aria-label:", label);
      return btn;
    }
  }

  // Strategi 2: Tombol submit
  const submitBtns = document.querySelectorAll('button[type="submit"]');
  for (const btn of submitBtns) {
    if (!isBlacklisted(btn)) {
      console.log("[Flow] Found submit button");
      return btn;
    }
  }

  // Strategi 3: Tombol dengan teks yang cocok
  const allButtons = document.querySelectorAll('button, [role="button"]');
  for (const btn of allButtons) {
    if (isBlacklisted(btn)) continue;
    const text = (btn.textContent || '').toLowerCase().trim();
    if (text.includes('create') || text.includes('generate') || text === 'send') {
      console.log("[Flow] Found button via text:", text);
      return btn;
    }
  }

  // Strategi 4: Tombol dengan ikon send/arrow (cari mat-icon berisi "send" atau "arrow")
  const matIcons = document.querySelectorAll('button mat-icon, button .material-icons, button .material-symbols-outlined');
  for (const icon of matIcons) {
    const text = (icon.textContent || '').trim().toLowerCase();
    if (text === 'send' || text === 'arrow_forward' || text === 'arrow_upward' || text === 'north' || text === 'play_arrow') {
      const btn = icon.closest('button');
      if (btn && !isBlacklisted(btn)) {
        console.log("[Flow] Found send icon button:", text);
        return btn;
      }
    }
  }

  // Strategi 5: Cari tombol panah di sebelah kanan input area
  // Google Flow biasanya punya tombol kirim berupa arrow di ujung kanan input bar
  const inputBar = document.querySelector('[contenteditable="true"]')?.closest('form, .prompt-bar, [class*="prompt"], [class*="input-bar"], [class*="composer"]');
  if (inputBar) {
    const btnsInBar = inputBar.querySelectorAll('button');
    for (const btn of btnsInBar) {
      if (!isBlacklisted(btn)) {
        console.log("[Flow] Found button inside input bar:", btn.className?.toString?.()?.substring(0, 80));
        return btn;
      }
    }
  }

  // Strategi 6: Material icon button yang BUKAN upload (terakhir sebagai fallback)
  for (const btn of allButtons) {
    const cls = (btn.className?.toString?.() || '').toLowerCase();
    if (cls.includes('mdc-icon-button') && !isBlacklisted(btn)) {
      // Cek apakah ini kemungkinan tombol send (biasanya kecil dan di dekat input)
      const svgs = btn.querySelectorAll('svg, mat-icon');
      if (svgs.length > 0) {
        console.log("[Flow] Found non-upload icon button:", cls.substring(0, 80));
        return btn;
      }
    }
  }

  console.warn("[Flow] No submit button found (all blacklisted or not found).");
  return null;
}

// ================================================================
// SET INPUT VALUE
// ================================================================
function setInputValue(element, value) {
  if (element.isContentEditable) {
    element.focus();
    element.innerText = '';
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }

  element.focus();
  const proto = element.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(element, value);
  } else {
    element.value = value;
  }
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

// Flag untuk mengecek apakah otomatisasi masih berjalan
let isAutomationRunning = false;

// ================================================================
// SCAN CHARACTERS
// ================================================================
function scanCharacters() {
  const selectors = [
    '[data-testid*="hara"]',
    '[class*="character"]',
    '[class*="Character"]',
    '[role="option"]',
    '[role="menuitem"]',
    'li',
    'button'
  ];
  const seen = new Set();
  const chars = [];
  selectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      const text = (el.textContent || '').trim();
      if (!text || text.length > 60) return;
      if (/^[\d\s]+$/.test(text)) return;
      if (seen.has(text)) return;
      seen.add(text);
      chars.push(text);
    });
  });
  return chars.slice(0, 200);
}

// ================================================================
// MESSAGE LISTENER
// ================================================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'start_batch') {
    console.log("Menerima perintah start_batch dengan prompts:", request.prompts);
    isAutomationRunning = true;
    startAutomation(request.prompts, request.delay, request.mode || 'Text to Image', request.settings);
    sendResponse({ status: "Automation started!" });
  } else if (request.action === 'stop_batch') {
    console.log("Menerima perintah stop_batch, menghentikan antrean...");
    isAutomationRunning = false;
    sendResponse({ status: "Automation stopped!" });
  } else if (request.action === 'scan_characters') {
    console.log("Menerima perintah scan_characters, memindai karakter...");
    sendResponse({ characters: scanCharacters() });
  }
});

// ================================================================
// MAIN AUTOMATION LOOP
// ================================================================
async function startAutomation(prompts, delay, mode, settings) {
  sendStatus({
    type: 'batch_start',
    total: prompts.length,
    prompts: prompts.map((text, i) => ({ index: i, text, status: 'queued' }))
  });

  // LANGKAH 0: Switch ke mode yang benar SEBELUM mulai
  console.log(`[Flow Automation] Mode yang dipilih: ${mode}`);
  await switchMode(mode);
  await wait(800);
  
  // LANGKAH 0.5: Terapkan setelan (Model, Rasio, Durasi)
  if (settings) {
    console.log("[Flow Automation] Mengaplikasikan setelan dari UI...");
    await applySettings(settings, mode);

    // LANGKAH 0.6: Daftarkan sesi auto-download di background untuk
    // rename/penempatan file (folderName, autoChangeFileName, kualitas).
    chrome.runtime.sendMessage({
      action: 'download_session',
      folderName: settings.folderName,
      autoChangeFileName: settings.autoChangeFileName,
      video: settings.autoDownloadVideo,
      image: settings.autoDownloadImage,
      mode
    });
  }

  for (let i = 0; i < prompts.length; i++) {
    if (!isAutomationRunning) {
      console.log("[Flow Automation] Proses dihentikan oleh user!");
      break;
    }

    const prompt = prompts[i];
    console.log(`[Flow Automation] Memproses prompt ${i + 1} dari ${prompts.length}: ${prompt}`);
    
    sendStatus({
      type: 'prompt_processing',
      index: i,
      total: prompts.length,
      text: prompt
    });

    // 1. Isi input
    const inputField = findPromptInput();
    let inputFound = false;
    if (inputField) {
      inputFound = true;
      setInputValue(inputField, prompt);
      console.log("[Flow] Input berhasil diisi.");
    } else {
      console.warn("[Flow] Kolom input tidak ditemukan!");
    }

    // 2. Jeda
    await wait(800);

    // 3. Klik tombol generate (BUKAN upload)
    const generateBtn = findSubmitButton();
    let buttonFound = false;
    if (generateBtn) {
      buttonFound = true;
      generateBtn.click();
      console.log("[Flow] Tombol generate diklik.");
    } else {
      console.warn("[Flow] Tombol generate tidak ditemukan!");
    }

    sendStatus({
      type: 'prompt_done',
      index: i,
      total: prompts.length,
      text: prompt,
      inputFound,
      buttonFound
    });

    // 4. Delay antar prompt
    if (i < prompts.length - 1 && isAutomationRunning) {
      console.log(`Menunggu selama ${delay} detik...`);
      sendStatus({
        type: 'prompt_waiting',
        index: i,
        total: prompts.length,
        delay: delay
      });
      // Kita pecah wait(delay) jadi potongan 1 detik biar bisa di-interupt cepat
      for(let w=0; w<delay; w++) {
        if(!isAutomationRunning) break;
        await wait(1000);
      }
    }
  }
  
  // LANGKAH 5: Auto-download hasil media (jika diaktifkan di UI)
  // Memantau download control baru di halaman dan meng-pasang-nya ke
  // chrome.downloads lewat background — tanpa perlu klik satu-satu.
  if (isAutomationRunning && settings) {
    await handleAutoDownload(prompts, settings, mode);
  }

  if (isAutomationRunning) {
    console.log("[Flow Automation] Selesai memproses semua prompt!");
    sendStatus({
      type: 'batch_complete',
      total: prompts.length
    });
  }
  chrome.runtime.sendMessage({ action: 'download_session_end' });
  isAutomationRunning = false;
}
})();
