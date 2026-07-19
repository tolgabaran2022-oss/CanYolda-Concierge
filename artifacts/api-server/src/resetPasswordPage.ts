/**
 * Standalone password-reset HTML page served at GET /reset-password.
 *
 * Self-contained — no external CSS/JS dependencies, no frameworks.
 * Color scheme matches the CanYoldaşı mobile app (purple/cream).
 * Calls:
 *   GET  /api/auth/reset-password/verify?token=...  (validate on load)
 *   POST /api/auth/reset-password                   (submit new password)
 */

export function buildResetPasswordHtml(): string {
  return /* html */`<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="referrer" content="no-referrer">
  <title>Şifre Sıfırla — CanYoldaşı</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --cream:  #FBF2EA;
      --purple: #6C5CE7;
      --purpleD:#534AB7;
      --purple2:#CECBF6;
      --purple1:#EAE7FB;
      --dark:   #26215C;
      --muted:  #8B8798;
      --error:  #E53E3E;
      --ok:     #38A169;
      --white:  #FFFFFF;
    }
    body {
      background: var(--cream);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
      color: var(--dark);
    }
    .card {
      background: var(--white);
      border-radius: 24px;
      padding: 36px 32px;
      width: 100%;
      max-width: 440px;
      box-shadow: 0 8px 40px rgba(108,92,231,.13);
    }
    .logo {
      text-align: center;
      margin-bottom: 28px;
    }
    .logo-icon {
      width: 56px; height: 56px; border-radius: 50%;
      background: linear-gradient(135deg, var(--purple), var(--purpleD));
      display: inline-flex; align-items: center; justify-content: center;
      margin-bottom: 12px;
      box-shadow: 0 4px 16px rgba(108,92,231,.35);
    }
    .logo-icon svg { width: 28px; height: 28px; }
    h1 { font-size: 22px; font-weight: 700; color: var(--dark); text-align: center; }
    .subtitle { font-size: 14px; color: var(--muted); text-align: center; margin-top: 6px; }

    /* States */
    #state-loading, #state-error, #state-success, #state-form { display: none; }
    #state-loading.active, #state-error.active, #state-success.active, #state-form.active { display: block; }

    .spinner {
      width: 44px; height: 44px; border-radius: 50%;
      border: 3px solid var(--purple1);
      border-top-color: var(--purple);
      animation: spin .8s linear infinite;
      margin: 24px auto 12px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-text { text-align: center; color: var(--muted); font-size: 14px; margin-bottom: 8px; }

    .state-icon {
      width: 64px; height: 64px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 8px auto 20px;
    }
    .state-icon.ok  { background: linear-gradient(135deg, var(--purple), var(--purpleD)); }
    .state-icon.err { background: #FEE2E2; }
    .state-icon svg { width: 32px; height: 32px; }

    .state-title { font-size: 20px; font-weight: 700; text-align: center; margin-bottom: 8px; }
    .state-msg   { font-size: 14px; color: var(--muted); text-align: center; line-height: 1.5; margin-bottom: 24px; }

    /* Form */
    .field { margin-bottom: 18px; }
    label  { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: var(--dark); }
    .input-wrap {
      display: flex; align-items: center; gap: 8px;
      border: 1.5px solid var(--purple2); border-radius: 12px;
      padding: 0 14px; background: var(--cream);
      transition: border-color .18s, background .18s, box-shadow .18s;
    }
    .input-wrap:focus-within {
      border-color: var(--purple); background: var(--white);
      box-shadow: 0 0 0 3px rgba(108,92,231,.12);
    }
    .input-wrap svg { flex-shrink: 0; color: var(--muted); width: 18px; height: 18px; }
    .input-wrap:focus-within svg { color: var(--purple); }
    input[type=password], input[type=text] {
      flex: 1; border: none; background: transparent; outline: none;
      font-size: 15px; padding: 13px 0; color: var(--dark);
    }
    input::placeholder { color: var(--muted); }
    .toggle-pwd {
      background: none; border: none; cursor: pointer; padding: 0;
      color: var(--purpleD); display: flex; align-items: center;
    }

    /* Password rules */
    .rules { margin-top: 10px; display: flex; flex-direction: column; gap: 5px; }
    .rule  { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--muted); }
    .rule.ok  { color: var(--ok); }
    .rule-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--muted); flex-shrink: 0; }
    .rule.ok .rule-dot { display: none; }
    .rule.ok svg { width: 13px; height: 13px; }

    /* Messages */
    .err-banner {
      background: #FFF5F5; border: 1px solid #FED7D7; border-radius: 10px;
      padding: 10px 14px; font-size: 13px; color: var(--error);
      display: flex; align-items: flex-start; gap: 8px; margin-bottom: 16px;
    }
    .err-banner svg { flex-shrink: 0; margin-top: 1px; width: 15px; height: 15px; }

    /* Mismatch */
    .mismatch { font-size: 12px; color: var(--error); margin-top: 6px; display: flex; align-items: center; gap: 5px; }
    .mismatch svg { width: 12px; height: 12px; }

    /* Button */
    .btn {
      width: 100%; padding: 14px;
      border: none; border-radius: 14px; cursor: pointer;
      font-size: 15px; font-weight: 700; color: var(--white);
      background: linear-gradient(135deg, var(--purple), var(--purpleD));
      box-shadow: 0 4px 16px rgba(108,92,231,.35);
      transition: opacity .15s, transform .1s;
      margin-top: 8px;
    }
    .btn:disabled { background: var(--purple2); box-shadow: none; cursor: not-allowed; color: #9993CC; }
    .btn:not(:disabled):active { transform: scale(.98); }
    .btn-outline {
      background: transparent; color: var(--purple); border: 2px solid var(--purple);
      box-shadow: none; margin-top: 12px;
    }
    .btn-outline:hover { background: var(--purple1); }
  </style>
</head>
<body>
<div class="card">
  <div class="logo">
    <div class="logo-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    </div>
    <h1>CanYoldaşı</h1>
    <p class="subtitle">Şifre Sıfırla</p>
  </div>

  <!-- Loading -->
  <div id="state-loading">
    <div class="spinner"></div>
    <p class="loading-text">Bağlantı doğrulanıyor…</p>
  </div>

  <!-- Error states (expired / used / invalid) -->
  <div id="state-error">
    <div class="state-icon err">
      <svg viewBox="0 0 24 24" fill="none" stroke="#E53E3E" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    </div>
    <p class="state-title" id="error-title">Geçersiz Bağlantı</p>
    <p class="state-msg"  id="error-msg">Bu şifre sıfırlama bağlantısı geçersiz veya bozulmuş.</p>
    <button class="btn" onclick="location.href='/reset-password#forgot'">Yeni Bağlantı Talep Et</button>
  </div>

  <!-- Success -->
  <div id="state-success">
    <div class="state-icon ok">
      <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>
      </svg>
    </div>
    <p class="state-title">Şifren Güncellendi!</p>
    <p class="state-msg">Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.</p>
  </div>

  <!-- Form (token valid) -->
  <div id="state-form">
    <div id="err-banner" class="err-banner" style="display:none">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span id="err-text"></span>
    </div>

    <div class="field">
      <label for="pwd">Yeni Şifre</label>
      <div class="input-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <input id="pwd" type="password" placeholder="En az 8 karakter" autocomplete="new-password" oninput="checkRules()">
        <button class="toggle-pwd" type="button" onclick="togglePwd('pwd','eyePwd')" aria-label="Şifreyi göster/gizle">
          <svg id="eyePwd" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>
      <div class="rules" id="rules"></div>
    </div>

    <div class="field">
      <label for="cfm">Yeni Şifre Tekrar</label>
      <div class="input-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
        <input id="cfm" type="password" placeholder="Şifreni tekrar yaz" autocomplete="new-password" oninput="checkRules()">
        <button class="toggle-pwd" type="button" onclick="togglePwd('cfm','eyeCfm')" aria-label="Şifreyi göster/gizle">
          <svg id="eyeCfm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>
      <div id="mismatch" class="mismatch" style="display:none">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        Şifreler eşleşmiyor
      </div>
    </div>

    <button id="submit-btn" class="btn" disabled onclick="submitForm()">Şifremi Güncelle</button>
  </div>
</div>

<script>
  const RULES = [
    { label: "En az 8 karakter",     test: p => p.length >= 8 },
    { label: "Büyük harf (A-Z)",     test: p => /[A-Z]/.test(p) },
    { label: "Küçük harf (a-z)",     test: p => /[a-z]/.test(p) },
    { label: "Rakam (0-9)",          test: p => /[0-9]/.test(p) },
    { label: "Özel karakter (!@#…)", test: p => /[^A-Za-z0-9]/.test(p) },
  ];

  const CHECK_SVG = \`<svg viewBox="0 0 24 24" fill="none" stroke="#38A169" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>\`;

  // Build rules UI
  const rulesEl = document.getElementById('rules');
  RULES.forEach((r, i) => {
    const div = document.createElement('div');
    div.className = 'rule';
    div.id = 'rule-' + i;
    div.innerHTML = \`<span class="rule-dot"></span><span>\${r.label}</span>\`;
    rulesEl.appendChild(div);
  });

  function checkRules() {
    const pwd = document.getElementById('pwd').value;
    const cfm = document.getElementById('cfm').value;
    let allOk = true;
    RULES.forEach((r, i) => {
      const ok = r.test(pwd);
      const el = document.getElementById('rule-' + i);
      el.className = 'rule' + (ok ? ' ok' : '');
      el.innerHTML = ok
        ? CHECK_SVG + \`<span>\${r.label}</span>\`
        : \`<span class="rule-dot"></span><span>\${r.label}</span>\`;
      if (!ok) allOk = false;
    });
    const mismatch = cfm.length > 0 && pwd !== cfm;
    document.getElementById('mismatch').style.display = mismatch ? 'flex' : 'none';
    document.getElementById('submit-btn').disabled = !(allOk && pwd === cfm && cfm.length > 0);
  }

  function togglePwd(inputId, iconId) {
    const inp = document.getElementById(inputId);
    const ico = document.getElementById(iconId);
    const isHidden = inp.type === 'password';
    inp.type = isHidden ? 'text' : 'password';
    ico.innerHTML = isHidden
      ? \`<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>\`
      : \`<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>\`;
  }

  function show(id) {
    ['state-loading','state-error','state-success','state-form'].forEach(s => {
      document.getElementById(s).className = s === id ? id + ' active' : s;
    });
  }

  function showError(title, msg) {
    document.getElementById('error-title').textContent = title;
    document.getElementById('error-msg').textContent   = msg;
    show('state-error');
  }

  // Read token from URL — strip it from history immediately for security
  const params = new URLSearchParams(location.search);
  const token  = params.get('token') || '';
  if (token && history.replaceState) {
    history.replaceState(null, '', location.pathname);
  }

  show('state-loading');

  if (!token) {
    showError('Geçersiz Bağlantı', 'Şifre sıfırlama bağlantısı eksik veya bozulmuş.');
  } else {
    fetch('/api/auth/reset-password/verify?token=' + encodeURIComponent(token))
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          show('state-form');
        } else if (data.reason === 'used') {
          showError('Bağlantı Kullanıldı', 'Bu şifre sıfırlama bağlantısı daha önce kullanılmış.');
        } else if (data.reason === 'expired' || data.reason === 'not_found') {
          showError('Bağlantının Süresi Doldu', 'Bu bağlantı 30 dakika geçerliydi. Lütfen yeni bir bağlantı talep edin.');
        } else {
          showError('Geçersiz Bağlantı', 'Şifre sıfırlama bağlantısı geçersiz veya bozulmuş.');
        }
      })
      .catch(() => showError('Sunucu Hatası', 'Şifreniz güncellenemedi. Lütfen daha sonra tekrar deneyin.'));
  }

  let submitting = false;
  function submitForm() {
    if (submitting) return;
    const pwd = document.getElementById('pwd').value;
    const cfm = document.getElementById('cfm').value;
    if (!pwd || pwd !== cfm) return;

    submitting = true;
    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.textContent = 'Güncelleniyor…';
    document.getElementById('err-banner').style.display = 'none';

    fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword: pwd, confirmPassword: cfm }),
    })
      .then(r => r.json().then(d => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => {
        if (ok) {
          show('state-success');
        } else if (data.expired) {
          showError('Bağlantının Süresi Doldu', 'Bu bağlantı 30 dakika geçerliydi. Lütfen yeni bir bağlantı talep edin.');
        } else {
          document.getElementById('err-text').textContent = data.error || 'Şifre güncellenemedi. Lütfen tekrar deneyin.';
          document.getElementById('err-banner').style.display = 'flex';
          btn.disabled = false;
          btn.textContent = 'Şifremi Güncelle';
          submitting = false;
        }
      })
      .catch(() => {
        document.getElementById('err-text').textContent = 'Fotoğraf yüklenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.';
        document.getElementById('err-banner').style.display = 'flex';
        btn.disabled = false;
        btn.textContent = 'Şifremi Güncelle';
        submitting = false;
      });
  }
</script>
</body>
</html>`;
}
