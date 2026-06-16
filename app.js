// ============================================================
// PUBLIC GRIEVANCE REDRESSAL SYSTEM — FULL JAVASCRIPT
// ============================================================

// ===== DATA STORE (localStorage) =====
const DB = {
  getGrievances: () => JSON.parse(localStorage.getItem('grievances') || '[]'),
  saveGrievances: (data) => localStorage.setItem('grievances', JSON.stringify(data)),
  getFeedbacks: () => JSON.parse(localStorage.getItem('feedbacks') || '[]'),
  saveFeedbacks: (data) => localStorage.setItem('feedbacks', JSON.stringify(data)),
  getLiveLog: () => JSON.parse(localStorage.getItem('live_log') || '[]'),
  saveLiveLog: (data) => localStorage.setItem('live_log', JSON.stringify(data)),
};

// ===== RATINGS STATE =====
const ratings = { overall: 0, speed: 0, staff: 0, portal: 0 };
let recommendVal = '';
let otpCode = '';
let otpVerified = false;
let otpTimerInterval = null;
let currentAdminToken = '';
let adminLoggedIn = false;

// ===== SEED DEMO DATA =====
function seedDemoData() {
  if (DB.getGrievances().length > 0) return;
  const names = ['Ramesh Kumar', 'Priya Sharma', 'Ajay Singh', 'Sunita Devi', 'Mohan Lal', 'Kavita Rani', 'Suresh Verma', 'Pooja Gupta'];
  const categories = ['Water Supply', 'Roads & Infrastructure', 'Electricity', 'Sanitation', 'Health Services', 'Education', 'Police & Safety', 'Revenue & Tax'];
  const priorities = ['high', 'medium', 'low'];
  const statuses = ['Pending', 'In Progress', 'Resolved', 'Closed'];
  const grievances = [];
  const now = Date.now();

  for (let i = 0; i < 22; i++) {
    const name = names[Math.floor(Math.random() * names.length)];
    const cat = categories[Math.floor(Math.random() * categories.length)];
    const pri = priorities[Math.floor(Math.random() * priorities.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const daysAgo = Math.floor(Math.random() * 30);
    const ts = now - daysAgo * 86400000 - Math.random() * 3600000;
    const token = `GRV-2025-${String(i + 1).padStart(4, '0')}`;
    grievances.push({
      token, name,
      mobile: `98${Math.floor(10000000 + Math.random() * 89999999)}`,
      email: `${name.split(' ')[0].toLowerCase()}@email.com`,
      address: 'Near Old Market, Rohtak', district: 'Rohtak', state: 'Haryana',
      category: cat, priority: pri,
      title: `Issue regarding ${cat.toLowerCase()} in my area`,
      description: `There is a serious problem related to ${cat.toLowerCase()} that needs immediate attention. The issue has been persisting for several days now.`,
      status, timestamp: ts,
      timeline: [
        { status: 'Pending', remark: 'Grievance registered', time: ts },
        ...(status !== 'Pending' ? [{ status: 'In Progress', remark: 'Assigned to department', time: ts + 86400000 }] : []),
        ...(status === 'Resolved' || status === 'Closed' ? [{ status: status, remark: 'Issue resolved successfully', time: ts + 3 * 86400000 }] : []),
      ],
      files: []
    });
  }
  DB.saveGrievances(grievances);

  // Seed live log
  const log = grievances.slice(0, 8).map(g => ({
    type: g.status === 'Resolved' ? 'resolved' : g.status === 'In Progress' ? 'updated' : 'new',
    text: `${g.status === 'Resolved' ? '✅ Resolved' : g.status === 'In Progress' ? '🔄 Updated' : '📋 New'}: ${g.token} — ${g.title.substring(0, 48)}`,
    time: g.timestamp
  }));
  DB.saveLiveLog(log);
}

// ===== LIVE CLOCK =====
function startClock() {
  function tick() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour12: false });
    const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const el = document.getElementById('live-clock');
    const fe = document.getElementById('footer-clock');
    if (el) el.textContent = timeStr;
    if (fe) fe.textContent = dateStr;
  }
  tick();
  setInterval(tick, 1000);
}

// ===== TICKER =====
function updateTicker() {
  const grievances = DB.getGrievances();
  const resolved = grievances.filter(g => g.status === 'Resolved').length;
  const pending = grievances.filter(g => g.status === 'Pending').length;
  const today = grievances.filter(g => new Date(g.timestamp).toDateString() === new Date().toDateString()).length;
  const messages = [
    `📋 Total Grievances Filed: ${grievances.length}`,
    `✅ Resolved Today: ${resolved}`,
    `⏳ Pending: ${pending}`,
    `📅 Filed Today: ${today}`,
    `🔔 Grievance portal is LIVE and operational`,
    `📞 Helpline: 1800-XXX-XXXX (Toll Free, 9AM–6PM)`,
    `🔴 New: GRV-2025-0023 filed — Rohtak — Water Supply Issue`,
    `✅ Resolved: GRV-2025-0019 — Electricity restored in Sector 4`,
  ];
  const el = document.getElementById('ticker-content');
  if (el) el.textContent = messages.join('   •   ');
}

// ===== HOME STATS =====
function updateStats() {
  const g = DB.getGrievances();
  const today = g.filter(x => new Date(x.timestamp).toDateString() === new Date().toDateString());
  animateCounter('stat-total', g.length);
  animateCounter('stat-resolved', g.filter(x => x.status === 'Resolved' || x.status === 'Closed').length);
  animateCounter('stat-pending', g.filter(x => x.status === 'Pending').length);
  animateCounter('stat-today', today.length + 1);
  updateDashboard();
}

function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let val = 0;
  const step = Math.ceil(target / 40);
  const t = setInterval(() => {
    val = Math.min(val + step, target);
    el.textContent = val.toLocaleString('en-IN');
    if (val >= target) clearInterval(t);
  }, 30);
}

// ===== LIVE FEED =====
function updateLiveFeed() {
  const log = DB.getLiveLog();
  const feed = document.getElementById('live-feed');
  if (!feed) return;
  if (log.length === 0) {
    feed.innerHTML = '<div class="feed-empty">No recent activity</div>';
    return;
  }
  feed.innerHTML = log.slice(0, 10).reverse().map(item => `
    <div class="feed-item">
      <div class="feed-dot ${item.type}"></div>
      <div>${item.text}</div>
      <div class="feed-time">${formatTime(item.time)}</div>
    </div>
  `).join('');
}

function addToLiveLog(type, text) {
  const log = DB.getLiveLog();
  log.push({ type, text, time: Date.now() });
  if (log.length > 50) log.shift();
  DB.saveLiveLog(log);
  updateLiveFeed();
  updateTicker();
}

// ===== CATEGORY SELECT (from home) =====
function selectCategory(cat) {
  showPage('submit');
  setTimeout(() => {
    const el = document.getElementById('f-category');
    if (el) el.value = cat;
  }, 100);
}

// ===== PAGE NAVIGATION =====
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const page = document.getElementById('page-' + name);
  if (page) page.classList.add('active');
  const navIndex = { home: 0, submit: 1, track: 2, feedback: 3, dashboard: 4, admin: 5 };
  const btns = document.querySelectorAll('.nav-btn');
  if (btns[navIndex[name]]) btns[navIndex[name]].classList.add('active');
  if (name === 'dashboard') updateDashboard();
  if (name === 'home') { updateStats(); updateLiveFeed(); }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== OTP =====
function sendOTP() {
  const mobile = document.getElementById('otp-mobile').value.trim();
  if (!/^\d{10}$/.test(mobile)) { showToast('Enter a valid 10-digit mobile number', 'error'); return; }
  otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`[OTP for demo] ${otpCode}`);
  document.getElementById('otp-verify-row').style.display = 'flex';
  document.getElementById('otp-status').innerHTML = `<span style="color:green">✅ OTP sent to ${mobile.substring(0, 3)}XXXXXXX (Demo OTP: ${otpCode})</span>`;
  startOTPTimer(60);
  otpVerified = false;
}

function startOTPTimer(sec) {
  clearInterval(otpTimerInterval);
  const el = document.getElementById('otp-timer');
  let remaining = sec;
  otpTimerInterval = setInterval(() => {
    remaining--;
    if (el) el.textContent = `Resend in ${remaining}s`;
    if (remaining <= 0) {
      clearInterval(otpTimerInterval);
      if (el) el.textContent = '';
      otpCode = '';
    }
  }, 1000);
}

function verifyOTP() {
  const input = document.getElementById('otp-input').value.trim();
  const statusEl = document.getElementById('otp-status');
  if (input === otpCode && otpCode !== '') {
    otpVerified = true;
    statusEl.innerHTML = '<span style="color:green;font-weight:700">✅ Mobile number verified successfully!</span>';
    clearInterval(otpTimerInterval);
    document.getElementById('otp-timer').textContent = '';
  } else {
    statusEl.innerHTML = '<span style="color:red">❌ Invalid OTP. Please try again.</span>';
  }
}

// ===== FORM CHARACTER COUNT =====
function setupCharCount() {
  const desc = document.getElementById('f-desc');
  const count = document.getElementById('char-count');
  if (desc && count) {
    desc.addEventListener('input', () => {
      count.textContent = desc.value.length;
      if (desc.value.length > 900) count.style.color = 'red';
      else count.style.color = '';
    });
  }
}

// ===== FILE UPLOAD =====
function setupFileUpload() {
  const input = document.getElementById('f-files');
  const listEl = document.getElementById('file-list');
  if (!input) return;
  input.addEventListener('change', () => {
    listEl.innerHTML = '';
    [...input.files].forEach(f => {
      const div = document.createElement('div');
      div.className = 'file-list-item';
      div.innerHTML = `📄 ${f.name} <small>(${(f.size / 1024).toFixed(1)} KB)</small>`;
      listEl.appendChild(div);
    });
  });
}

// ===== GENERATE TOKEN =====
function generateToken() {
  const g = DB.getGrievances();
  const num = String(g.length + 1).padStart(4, '0');
  return `GRV-2025-${num}`;
}

// ===== SUBMIT GRIEVANCE =====
function submitGrievance() {
  const name = document.getElementById('f-name').value.trim();
  const mobile = document.getElementById('f-mobile').value.trim();
  const address = document.getElementById('f-address').value.trim();
  const district = document.getElementById('f-district').value;
  const state = document.getElementById('f-state').value;
  const category = document.getElementById('f-category').value;
  const priority = document.getElementById('f-priority').value;
  const title = document.getElementById('f-title').value.trim();
  const desc = document.getElementById('f-desc').value.trim();
  const declaration = document.getElementById('f-declaration').checked;

  if (!name) { showToast('Please enter your full name', 'error'); return; }
  if (!mobile) { showToast('Please enter your mobile number', 'error'); return; }
  if (!address) { showToast('Please enter your address', 'error'); return; }
  if (!district || !state) { showToast('Please select District and State', 'error'); return; }
  if (!category) { showToast('Please select a category', 'error'); return; }
  if (!priority) { showToast('Please select priority level', 'error'); return; }
  if (!title) { showToast('Please enter grievance title', 'error'); return; }
  if (!desc || desc.length < 20) { showToast('Please provide a detailed description (min 20 characters)', 'error'); return; }
  if (!declaration) { showToast('Please accept the declaration', 'error'); return; }

  const token = generateToken();
  const now = Date.now();
  const grievance = {
    token, name,
    mobile: document.getElementById('f-mobile').value.trim(),
    email: document.getElementById('f-email').value.trim(),
    aadhaar: document.getElementById('f-aadhaar').value.trim(),
    address, district, state,
    category, priority, title, description: desc,
    status: 'Pending', timestamp: now,
    timeline: [{ status: 'Pending', remark: 'Grievance registered successfully', time: now }],
    files: []
  };

  const grievances = DB.getGrievances();
  grievances.push(grievance);
  DB.saveGrievances(grievances);

  addToLiveLog('new', `📋 New: ${token} — ${title.substring(0, 50)} [${category}]`);
  document.getElementById('generated-token').textContent = token;
  document.getElementById('success-modal').classList.add('show');
  updateStats();
}

function printToken() {
  const token = document.getElementById('generated-token').textContent;
  const w = window.open('', '_blank', 'width=400,height=300');
  w.document.write(`
    <html><head><title>Grievance Token</title></head>
    <body style="font-family:monospace;padding:40px;text-align:center">
    <h2>🏛️ Grievance Receipt</h2>
    <hr/>
    <p>Public Grievance Redressal System</p>
    <h1 style="letter-spacing:4px;color:#1a3a6b">${token}</h1>
    <p>Date: ${new Date().toLocaleDateString('en-IN')}</p>
    <p>Please keep this token for tracking</p>
    <hr/>
    <p>Helpline: 1800-XXX-XXXX</p>
    </body></html>`);
  w.print();
}

function closeModal() {
  document.getElementById('success-modal').classList.remove('show');
  resetForm();
}

function resetForm() {
  ['f-name','f-mobile','f-email','f-aadhaar','f-address','f-title','f-desc','otp-mobile','otp-input'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['f-district','f-state','f-category','f-priority'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.selectedIndex = 0;
  });
  const decl = document.getElementById('f-declaration');
  if (decl) decl.checked = false;
  const otpRow = document.getElementById('otp-verify-row');
  if (otpRow) otpRow.style.display = 'none';
  const otpStatus = document.getElementById('otp-status');
  if (otpStatus) otpStatus.innerHTML = '';
  const fileList = document.getElementById('file-list');
  if (fileList) fileList.innerHTML = '';
  const charCount = document.getElementById('char-count');
  if (charCount) charCount.textContent = '0';
  otpVerified = false;
  otpCode = '';
  clearInterval(otpTimerInterval);
}

// ===== TRACK =====
function switchTrackTab(type) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  const tokenInput = document.getElementById('track-token-input');
  const mobileInput = document.getElementById('track-mobile-input');
  if (type === 'token') {
    tokenInput.style.display = 'block';
    mobileInput.style.display = 'none';
  } else {
    tokenInput.style.display = 'none';
    mobileInput.style.display = 'block';
  }
  document.getElementById('track-results').style.display = 'none';
}

function trackGrievance() {
  const tokenEl = document.getElementById('track-token');
  const mobileEl = document.getElementById('track-mobile');
  const query = (tokenEl.value.trim() || mobileEl.value.trim()).toUpperCase();

  if (!query) { showToast('Please enter a token number or mobile number', 'error'); return; }

  const grievances = DB.getGrievances();
  const results = grievances.filter(g =>
    g.token.includes(query) || g.token.includes(query.toLowerCase()) ||
    g.mobile.includes(query) || g.mobile.includes(query.toLowerCase())
  );

  const container = document.getElementById('track-results');
  container.style.display = 'block';

  if (results.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:#888">
      <div style="font-size:48px">🔍</div>
      <h3 style="margin:12px 0 8px">No Grievance Found</h3>
      <p>Check your token number or mobile number and try again.</p>
    </div>`;
    return;
  }

  container.innerHTML = results.map(g => `
    <div class="grievance-card">
      <div class="grievance-card-header">
        <span style="font-family:monospace;font-weight:700">${g.token}</span>
        <span class="status-badge ${g.status}">${g.status}</span>
      </div>
      <div class="grievance-card-body">
        <div class="info-grid">
          <div class="info-item"><label>Applicant</label><span>${g.name}</span></div>
          <div class="info-item"><label>Category</label><span>${g.category}</span></div>
          <div class="info-item"><label>Priority</label><span>${getPriorityBadge(g.priority)}</span></div>
          <div class="info-item"><label>Filed On</label><span>${formatDate(g.timestamp)}</span></div>
          <div class="info-item" style="grid-column:1/-1"><label>Title</label><span>${g.title}</span></div>
        </div>
        <div class="timeline">
          <h4>📍 Status Timeline</h4>
          ${g.timeline.map(t => `
            <div class="timeline-item">
              <div>
                <strong>${t.status}</strong> — ${t.remark}
                <div class="tl-time">${formatDateTime(t.time)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `).join('');
}

// ===== FEEDBACK =====
function setRating(key, val) {
  ratings[key] = val;
  const stars = document.querySelectorAll(`#stars-${key} span`);
  stars.forEach((s, i) => {
    s.classList.toggle('active', i < val);
  });
}

function setRecommend(val) {
  recommendVal = val;
  document.getElementById('rec-yes').className = 'rec-btn' + (val === 'yes' ? ' selected-yes' : '');
  document.getElementById('rec-no').className = 'rec-btn' + (val === 'no' ? ' selected-no' : '');
}

function submitFeedback() {
  const name = document.getElementById('fb-name').value.trim();
  const token = document.getElementById('fb-token').value.trim();
  const comment = document.getElementById('fb-comment').value.trim();
  const resolved = document.querySelector('input[name="resolved"]:checked');

  if (!resolved) { showToast('Please indicate if your grievance was resolved', 'error'); return; }
  if (!ratings.overall) { showToast('Please provide overall rating', 'error'); return; }

  const feedback = {
    id: Date.now(), name, token, comment,
    resolved: resolved.value, recommend: recommendVal,
    ratings: { ...ratings }, timestamp: Date.now()
  };

  const feedbacks = DB.getFeedbacks();
  feedbacks.push(feedback);
  DB.saveFeedbacks(feedbacks);

  addToLiveLog('updated', `⭐ New feedback submitted${token ? ' for ' + token : ''} — ${ratings.overall}/5 stars`);

  showToast('Thank you! Your feedback has been submitted successfully ✅', 'success');

  // Reset
  document.getElementById('fb-name').value = '';
  document.getElementById('fb-token').value = '';
  document.getElementById('fb-comment').value = '';
  Object.keys(ratings).forEach(k => { ratings[k] = 0; });
  document.querySelectorAll('.stars span').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('input[name="resolved"]').forEach(r => r.checked = false);
  recommendVal = '';
  document.getElementById('rec-yes').className = 'rec-btn';
  document.getElementById('rec-no').className = 'rec-btn';
}

// ===== DASHBOARD =====
function updateDashboard() {
  const g = DB.getGrievances();
  const feedbacks = DB.getFeedbacks();
  const today = g.filter(x => new Date(x.timestamp).toDateString() === new Date().toDateString());
  const resolved = g.filter(x => x.status === 'Resolved' || x.status === 'Closed');
  const pending = g.filter(x => x.status === 'Pending');
  const threeDaysAgo = Date.now() - 3 * 86400000;
  const overdue = g.filter(x => x.status === 'Pending' && x.timestamp < threeDaysAgo);

  animateCounter('d-total', g.length);
  animateCounter('d-resolved', resolved.length);
  animateCounter('d-pending', pending.length);
  animateCounter('d-overdue', overdue.length);
  animateCounter('d-today', today.length + 1);
  animateCounter('d-feedback', feedbacks.length);

  // Category chart
  const catCounts = {};
  g.forEach(x => { catCounts[x.category] = (catCounts[x.category] || 0) + 1; });
  const maxCat = Math.max(...Object.values(catCounts), 1);
  const catChart = document.getElementById('chart-category');
  if (catChart) {
    const colors = ['#1a3a6b','#2563aa','#ff6b00','#2e7d32','#c62828','#7b1fa2','#e65100','#1565c0'];
    catChart.innerHTML = Object.entries(catCounts).sort((a,b)=>b[1]-a[1]).map(([cat, count], i) => `
      <div class="bar-row">
        <label>${cat}</label>
        <div class="bar-fill" style="width:${Math.max((count/maxCat)*220,8)}px;background:${colors[i%colors.length]}"></div>
        <span class="bar-val">${count}</span>
      </div>
    `).join('');
  }

  // Priority pie
  const priChart = document.getElementById('chart-priority');
  if (priChart) {
    const priColors = { high: '#c62828', medium: '#e65100', low: '#2e7d32' };
    const priCount = { high: 0, medium: 0, low: 0 };
    g.forEach(x => { if (priCount[x.priority] !== undefined) priCount[x.priority]++; });
    priChart.innerHTML = Object.entries(priCount).map(([pri, count]) => `
      <div class="pie-item">
        <div class="pie-dot" style="background:${priColors[pri]}"></div>
        <span style="font-weight:600;text-transform:capitalize">${pri}</span>
        <span style="margin-left:auto;font-family:monospace">${count} (${g.length ? Math.round(count/g.length*100) : 0}%)</span>
      </div>
    `).join('');
  }

  // Recent table
  const tbody = document.getElementById('recent-tbody');
  if (tbody) {
    const recent = [...g].sort((a,b) => b.timestamp - a.timestamp).slice(0, 10);
    tbody.innerHTML = recent.map(x => `
      <tr>
        <td style="font-family:monospace;font-weight:600">${x.token}</td>
        <td>${x.name}</td>
        <td>${x.category}</td>
        <td>${getPriorityBadge(x.priority)}</td>
        <td><span class="status-badge ${x.status}">${x.status}</span></td>
        <td>${formatDate(x.timestamp)}</td>
      </tr>
    `).join('');
  }
}

// ===== ADMIN =====
function adminLogin() {
  const user = document.getElementById('admin-user').value;
  const pass = document.getElementById('admin-pass').value;
  if (user === 'admin' && pass === 'admin123') {
    adminLoggedIn = true;
    document.getElementById('admin-login-panel').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    loadAdminTable(DB.getGrievances());
    showToast('Admin login successful ✅', 'success');
  } else {
    showToast('Invalid credentials. Try admin / admin123', 'error');
  }
}

function adminLogout() {
  adminLoggedIn = false;
  document.getElementById('admin-login-panel').style.display = 'block';
  document.getElementById('admin-panel').style.display = 'none';
  document.getElementById('admin-user').value = '';
  document.getElementById('admin-pass').value = '';
}

function loadAdminTable(data) {
  const tbody = document.getElementById('admin-tbody');
  if (!tbody) return;
  tbody.innerHTML = data.map(g => `
    <tr>
      <td style="font-family:monospace;font-weight:600">${g.token}</td>
      <td>${g.name}</td>
      <td>${g.mobile}</td>
      <td>${g.category}</td>
      <td>${getPriorityBadge(g.priority)}</td>
      <td>${g.title.substring(0, 40)}...</td>
      <td><span class="status-badge ${g.status}">${g.status}</span></td>
      <td>${formatDate(g.timestamp)}</td>
      <td>
        <button class="btn-action edit" onclick="openUpdateModal('${g.token}')">✏️ Update</button>
        <button class="btn-action delete" onclick="deleteGrievance('${g.token}')">🗑️ Delete</button>
      </td>
    </tr>
  `).join('');
}

function adminSearch() {
  const q = document.getElementById('admin-search').value.toLowerCase();
  const statusF = document.getElementById('admin-filter-status').value;
  const priorityF = document.getElementById('admin-filter-priority').value;
  let data = DB.getGrievances();
  if (q) data = data.filter(g =>
    g.token.toLowerCase().includes(q) ||
    g.name.toLowerCase().includes(q) ||
    g.category.toLowerCase().includes(q) ||
    g.title.toLowerCase().includes(q)
  );
  if (statusF) data = data.filter(g => g.status === statusF);
  if (priorityF) data = data.filter(g => g.priority === priorityF);
  loadAdminTable(data);
}

function openUpdateModal(token) {
  currentAdminToken = token;
  const g = DB.getGrievances().find(x => x.token === token);
  if (!g) return;
  document.getElementById('update-token-label').textContent = `Token: ${token} | Current: ${g.status}`;
  document.getElementById('new-status').value = g.status;
  document.getElementById('update-remarks').value = '';
  document.getElementById('update-modal').classList.add('show');
}

function saveStatusUpdate() {
  const newStatus = document.getElementById('new-status').value;
  const remarks = document.getElementById('update-remarks').value.trim() || 'Status updated by admin';
  const grievances = DB.getGrievances();
  const idx = grievances.findIndex(g => g.token === currentAdminToken);
  if (idx === -1) return;
  grievances[idx].status = newStatus;
  grievances[idx].timeline.push({ status: newStatus, remark: remarks, time: Date.now() });
  DB.saveGrievances(grievances);
  addToLiveLog(newStatus === 'Resolved' ? 'resolved' : 'updated', `${newStatus === 'Resolved' ? '✅ Resolved' : '🔄 Updated'}: ${currentAdminToken} — ${remarks}`);
  closeUpdateModal();
  adminSearch();
  showToast(`Status updated to ${newStatus} ✅`, 'success');
}

function closeUpdateModal() {
  document.getElementById('update-modal').classList.remove('show');
  currentAdminToken = '';
}

function deleteGrievance(token) {
  if (!confirm(`Delete grievance ${token}? This cannot be undone.`)) return;
  let g = DB.getGrievances().filter(x => x.token !== token);
  DB.saveGrievances(g);
  adminSearch();
  showToast(`Grievance ${token} deleted`, 'error');
}

function exportCSV() {
  const g = DB.getGrievances();
  const headers = ['Token','Name','Mobile','Email','District','State','Category','Priority','Title','Status','Date'];
  const rows = g.map(x => [
    x.token, x.name, x.mobile, x.email, x.district, x.state,
    x.category, x.priority, `"${x.title}"`, x.status, formatDate(x.timestamp)
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `grievances_export_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exported successfully 📥', 'success');
}

// ===== LIVE SIMULATION =====
function startLiveSimulation() {
  const actions = [
    () => {
      const categories = ['Water Supply', 'Roads & Infrastructure', 'Electricity', 'Sanitation', 'Health Services'];
      const names = ['Vijay Kumar', 'Anita Singh', 'Rahul Sharma', 'Deepika Devi', 'Arun Verma'];
      const cat = categories[Math.floor(Math.random() * categories.length)];
      const name = names[Math.floor(Math.random() * names.length)];
      const g = DB.getGrievances();
      const token = `GRV-2025-${String(g.length + 1).padStart(4, '0')}`;
      const now = Date.now();
      g.push({
        token, name, mobile: `98${Math.floor(10000000 + Math.random() * 89999999)}`,
        email: '', aadhaar: '', address: 'Rohtak', district: 'Rohtak', state: 'Haryana',
        category: cat, priority: ['high','medium','low'][Math.floor(Math.random()*3)],
        title: `Auto-reported issue — ${cat}`,
        description: 'System-generated demo grievance for live simulation.',
        status: 'Pending', timestamp: now,
        timeline: [{ status: 'Pending', remark: 'Grievance registered', time: now }],
        files: []
      });
      DB.saveGrievances(g);
      addToLiveLog('new', `📋 New: ${token} — ${name} filed ${cat} grievance`);
      updateStats();
    },
    () => {
      const g = DB.getGrievances();
      const pending = g.filter(x => x.status === 'Pending');
      if (pending.length === 0) return;
      const idx = g.findIndex(x => x.token === pending[Math.floor(Math.random() * pending.length)].token);
      g[idx].status = 'In Progress';
      g[idx].timeline.push({ status: 'In Progress', remark: 'Assigned to field team', time: Date.now() });
      DB.saveGrievances(g);
      addToLiveLog('updated', `🔄 In Progress: ${g[idx].token} — Assigned to field team`);
      updateStats();
    },
    () => {
      const g = DB.getGrievances();
      const inProgress = g.filter(x => x.status === 'In Progress');
      if (inProgress.length === 0) return;
      const idx = g.findIndex(x => x.token === inProgress[Math.floor(Math.random() * inProgress.length)].token);
      g[idx].status = 'Resolved';
      g[idx].timeline.push({ status: 'Resolved', remark: 'Issue resolved successfully by department', time: Date.now() });
      DB.saveGrievances(g);
      addToLiveLog('resolved', `✅ Resolved: ${g[idx].token} — Issue resolved by department`);
      updateStats();
    }
  ];

  // Trigger random live action every 8-15 seconds
  function scheduleNext() {
    const delay = 8000 + Math.random() * 7000;
    setTimeout(() => {
      const action = actions[Math.floor(Math.random() * actions.length)];
      action();
      scheduleNext();
    }, delay);
  }
  scheduleNext();
}

// ===== HELPERS =====
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => { toast.classList.remove('show'); }, 3500);
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(ts) {
  return new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getPriorityBadge(priority) {
  const labels = { high: '🔴 High', medium: '🟡 Medium', low: '🟢 Low' };
  return `<span class="priority-badge ${priority}">${labels[priority] || priority}</span>`;
}

// ===== CLOSE MODAL ON BACKDROP =====
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('show');
  }
});

// ===== DRAG & DROP UPLOAD =====
function setupDragDrop() {
  const zone = document.getElementById('file-drop-zone');
  if (!zone) return;
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.style.borderColor = '#1a3a6b'; });
  zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.style.borderColor = '';
    const files = e.dataTransfer.files;
    const input = document.getElementById('f-files');
    const dt = new DataTransfer();
    [...files].forEach(f => dt.items.add(f));
    input.files = dt.files;
    input.dispatchEvent(new Event('change'));
  });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  seedDemoData();
  startClock();
  updateTicker();
  updateStats();
  updateLiveFeed();
  setupCharCount();
  setupFileUpload();
  setupDragDrop();
  startLiveSimulation();

  // Refresh ticker every 30s
  setInterval(updateTicker, 30000);
  // Refresh live feed every 10s
  setInterval(updateLiveFeed, 10000);
  // Refresh stats every 15s
  setInterval(updateStats, 15000);
});
