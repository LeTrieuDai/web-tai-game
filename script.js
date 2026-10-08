// script.js - Core interactivity for Game Store web app

const API_URL = (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port !== '3000' && window.location.port !== '') 
  ? 'http://localhost:3000/api' 
  : '/api';

/**
 * Utility: Lưu trữ thông tin đăng nhập (Session)
 */
const storage = {
  get(key, fallback) {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
};

/**
 * ===================================================
 * GIAO DIỆN SÁNG / TỐI (lưu theo từng user trong DB)
 * - Đã đăng nhập: theme lấy từ database (đồng bộ qua /api/sync-user)
 * - Khách: theme lưu tạm trong localStorage ('guestTheme')
 * ===================================================
 */
function getActiveTheme() {
  const u = storage.get('currentUser', null);
  if (u && u.theme) return u.theme;
  return localStorage.getItem('guestTheme') || 'dark';
}

function applyTheme(theme) {
  const t = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', t);
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) {
    btn.textContent = t === 'light' ? '🌙' : '☀️';
    btn.title = t === 'light' ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng';
  }
}

async function toggleTheme() {
  const next = getActiveTheme() === 'light' ? 'dark' : 'light';
  applyTheme(next);

  const u = storage.get('currentUser', null);
  if (u) {
    // Cập nhật session ngay để UI phản hồi tức thì, rồi lưu vào database
    u.theme = next;
    storage.set('currentUser', u);
    try {
      const res = await fetch(`${API_URL}/user/theme`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u.username, theme: next })
      });
      if (!res.ok) console.warn('Không lưu được theme lên server');
    } catch (e) {
      console.error('Lỗi lưu theme:', e);
    }
  } else {
    localStorage.setItem('guestTheme', next);
  }
}

// Áp dụng theme ngay khi script được tải (tránh nháy màn hình)
applyTheme(getActiveTheme());

/**
 * UI Rendering helpers
 */
async function renderHeader() {
  let currentUser = storage.get('currentUser', null);

  if (currentUser) {
      try {
          const res = await fetch(`${API_URL}/sync-user`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({username: currentUser.username})});
          if (res.ok) {
              currentUser = await res.json();
              storage.set('currentUser', currentUser);
          }
      } catch(e) {}
  }

  // Inject Cart HTML if not exists (khong inject o trang admin.html)
  let cartContainer = document.getElementById('cart-container');
  if (!cartContainer && document.querySelector('.nav-links') && !document.getElementById('admin-main-content')) {
    const cartHTML = `
      <div id="user-balance-container" class="hidden" style="margin-right: 15px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
          <span id="user-balance-text" style="color: var(--primary);">0đ</span>
          <button id="open-deposit-btn" style="background: rgba(32, 178, 170, 0.15); border: 1px solid var(--primary); color: var(--primary); padding: 3px 8px; border-radius: 6px; font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: 0.2s;">+ Nạp tiền</button>
      </div>
      <div id="cart-container" class="hidden" style="margin-right: 20px; position: relative; cursor: pointer; display: flex; align-items: center;" title="Giỏ hàng">
          <span id="cart-icon" style="font-size: 1.5rem; transition: transform 0.2s;">🛒</span>
          <span id="cart-badge" style="position:absolute; top:-5px; right:-10px; background:#ef4444; color:white; border-radius:50%; padding: 2px 6px; font-size:0.7rem; font-weight:700; display:none; box-shadow: 0 2px 6px rgba(239,68,68,0.5);">0</span>
          
          <div id="cart-dropdown" class="hidden" style="position:absolute; top:42px; right:0; width: 340px; background:var(--card-bg); border:1px solid var(--border); border-radius:12px; padding:14px; box-shadow: 0 10px 30px rgba(0,0,0,0.6); z-index: 1000; cursor: default;">
              <!-- Header -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
                  <h4 style="margin: 0; font-size: 1rem; display: flex; align-items: center; gap: 6px;">
                    🛒 Giỏ hàng (<span id="cart-count-header" style="color: var(--primary);">0</span>)
                  </h4>
                  <button type="button" id="close-cart-btn" style="background: none; border: none; font-size: 1.3rem; line-height: 1; color: var(--muted); cursor: pointer; padding: 2px 6px; border-radius: 4px;" title="Đóng giỏ hàng">&times;</button>
              </div>

              <!-- Danh sách game -->
              <div id="cart-items" style="max-height: 260px; overflow-y: auto; padding-right: 4px;"></div>

              <!-- Tổng tiền & Số dư -->
              <div id="cart-summary" style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--border); font-size: 0.88rem;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                      <span style="color: var(--muted);">Tổng cộng:</span>
                      <strong id="cart-total-price" style="color: #facc15; font-size: 0.95rem;">0đ</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                      <span style="color: var(--muted);">Số dư hiện có:</span>
                      <strong id="cart-user-balance" style="color: var(--primary);">0đ</strong>
                  </div>
              </div>

              <!-- Thông báo kết quả thanh toán / Cảnh báo thiếu tiền -->
              <div id="cart-checkout-feedback" style="display: none; margin: 8px 0;"></div>

              <!-- Nút thanh toán -->
              <button id="checkout-btn" style="width:100%; padding:10px; margin-top:8px; background:var(--primary); color:white; border:none; border-radius:8px; cursor:pointer; font-weight: 600; font-size: 0.95rem; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px;">
                  <span>💳 Thanh toán ngay</span>
              </button>
          </div>
      </div>`;
    document.querySelector('.nav-links').insertAdjacentHTML('afterbegin', cartHTML);
    
    const cCont = document.getElementById('cart-container');
    const cDD = document.getElementById('cart-dropdown');

    if (cCont && cDD) {
      // 1. Rê chuột vào: Mở giỏ hàng
      cCont.addEventListener('mouseenter', () => {
        cDD.classList.remove('hidden');
      });

      // 2. Click vào icon/container: Toggle Mở / Đóng (khi click vào trong dropdown thì không toggle)
      cCont.addEventListener('click', (e) => {
        if (cDD.contains(e.target)) return;
        cDD.classList.toggle('hidden');
      });

      // 3. Nút đóng giỏ hàng
      const closeBtn = document.getElementById('close-cart-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          cDD.classList.add('hidden');
        });
      }

      // 4. Ngăn chặn click bên trong dropdown bị lan ra ngoài
      cDD.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    // 5. Cài đặt sự kiện nút thanh toán
    setupCheckoutEvent();
  }

  // Inject Toast HTML
  if (!document.getElementById('toast-notification')) {
    document.body.insertAdjacentHTML('beforeend', '<div id="toast-notification" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 15px 25px; border-radius: 8px; z-index: 9999; font-size: 1.2rem; pointer-events: none; opacity: 0; transition: opacity 0.3s;"></div>');
  }

  // Inject nút chuyển sáng/tối vào header (mọi trang)
  const navLinks = document.querySelector('.nav-links');
  if (navLinks && !document.getElementById('theme-toggle-btn')) {
    navLinks.insertAdjacentHTML('afterbegin', '<button type="button" id="theme-toggle-btn" class="theme-toggle" aria-label="Đổi giao diện sáng/tối"></button>');
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
  }
  // Áp dụng theme theo user vừa đồng bộ từ DB (hoặc theme khách nếu chưa đăng nhập)
  applyTheme(getActiveTheme());

  // Inject Deposit Modal HTML if not exists (dành cho các trang game lẻ không có sẵn modal này, bỏ qua trang admin)
  if (!document.getElementById('deposit-modal') && !document.getElementById('admin-main-content')) {
    const depositModalHTML = `
      <div class="modal hidden" id="deposit-modal">
          <div class="modal-content" style="max-width: 440px; text-align: center;">
              <span class="close" data-close="deposit-modal">&times;</span>
              <h2 style="margin-bottom: 0.5rem; color: var(--primary);">Nạp Tiền Vào Tài Khoản</h2>
              <p style="color: var(--muted); font-size: 0.88rem; margin-bottom: 1.2rem;">Quét mã VietQR để nạp tiền tự động qua ngân hàng</p>

              <div style="margin-bottom: 1rem; text-align: left;">
                  <label style="font-size: 0.85rem; color: var(--muted); display: block; margin-bottom: 0.3rem;">Chọn số tiền cần nạp:</label>
                  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 8px;">
                      <button type="button" class="deposit-preset-btn" data-amount="5000" style="padding: 6px; background: rgba(255,255,255,0.08); border: 1px solid var(--border); color: var(--text); border-radius: 6px; cursor: pointer; font-size: 0.85rem;">5.000đ</button>
                      <button type="button" class="deposit-preset-btn" data-amount="10000" style="padding: 6px; background: var(--primary); border: 1px solid var(--primary); color: white; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600;">10.000đ</button>
                      <button type="button" class="deposit-preset-btn" data-amount="20000" style="padding: 6px; background: rgba(255,255,255,0.08); border: 1px solid var(--border); color: var(--text); border-radius: 6px; cursor: pointer; font-size: 0.85rem;">20.000đ</button>
                      <button type="button" class="deposit-preset-btn" data-amount="50000" style="padding: 6px; background: rgba(255,255,255,0.08); border: 1px solid var(--border); color: var(--text); border-radius: 6px; cursor: pointer; font-size: 0.85rem;">50.000đ</button>
                      <button type="button" class="deposit-preset-btn" data-amount="100000" style="padding: 6px; background: rgba(255,255,255,0.08); border: 1px solid var(--border); color: var(--text); border-radius: 6px; cursor: pointer; font-size: 0.85rem;">100.000đ</button>
                      <button type="button" class="deposit-preset-btn" data-amount="200000" style="padding: 6px; background: rgba(255,255,255,0.08); border: 1px solid var(--border); color: var(--text); border-radius: 6px; cursor: pointer; font-size: 0.85rem;">200.000đ</button>
                  </div>
                  <input type="number" id="custom-deposit-amount" value="10000" min="1000" step="1000" placeholder="Hoặc nhập số tiền tùy ý (VNĐ)" style="margin-bottom: 0.8rem;" />
              </div>

              <!-- Khung hiển thị QR code -->
              <div id="qr-display-container" style="background: white; padding: 12px; border-radius: 10px; display: inline-block; margin-bottom: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                  <img id="vietqr-image" src="" alt="Mã QR nạp tiền" style="width: 220px; height: 220px; display: block; object-fit: contain;" />
              </div>

              <!-- Chi tiết thông tin chuyển khoản -->
              <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; font-size: 0.85rem; text-align: left; margin-bottom: 12px; border: 1px dashed var(--border);">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                      <span style="color: var(--muted);">Ngân hàng:</span>
                      <strong style="color: #4ade80;">TPBank</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                      <span style="color: var(--muted);">Chủ tài khoản:</span>
                      <strong>LE TRIEU DAI</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                      <span style="color: var(--muted);">Số tài khoản:</span>
                      <strong id="qr-bank-num" style="color: #60a5fa;">00000540786</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                      <span style="color: var(--muted);">Số tiền:</span>
                      <strong id="qr-amount-text" style="color: #facc15;">10.000đ</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span style="color: var(--muted);">Nội dung CK:</span>
                      <strong id="qr-content-text" style="color: var(--primary); font-size: 0.95rem; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;"></strong>
                  </div>
              </div>

              <div id="deposit-status-loading" style="display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--muted); font-size: 0.85rem;">
                  <span class="loading-spinner" style="display: inline-block; width: 14px; height: 14px; border: 2px solid var(--muted); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite;"></span>
                  <span>Hệ thống tự động cộng tiền khi chuyển khoản thành công...</span>
              </div>
          </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', depositModalHTML);
  }

  const registerBtn = document.getElementById('register-btn');
  const loginBtn = document.getElementById('login-btn');
  const userPanel = document.getElementById('user-panel');
  const userAvatar = document.getElementById('user-avatar');

  if (currentUser) {
    if (registerBtn) registerBtn.classList.add('hidden');
    if (loginBtn) loginBtn.classList.add('hidden');
    if (userPanel) userPanel.classList.remove('hidden');
    
    let avatarText = currentUser.username.charAt(0).toUpperCase();
    if (currentUser.role === 'admin') avatarText = 'Ad';
    if (userAvatar) {
      userAvatar.src = `https://ui-avatars.com/api/?name=${avatarText}&background=20b2aa&color=fff&rounded=true&bold=true&font-size=0.4`;
    }
    
    const balanceCont = document.getElementById('user-balance-container');
    const cartCont = document.getElementById('cart-container');
    if (balanceCont && cartCont) {
        if (currentUser.role === 'admin') {
            balanceCont.classList.add('hidden');
            cartCont.classList.add('hidden');
        } else {
            balanceCont.classList.remove('hidden');
            cartCont.classList.remove('hidden');
            const balText = document.getElementById('user-balance-text');
            if (balText) balText.textContent = (currentUser.money || 0).toLocaleString('vi-VN') + 'đ';
            if (typeof updateCartUI === 'function') updateCartUI(currentUser.cart || []);
        }
    }
  } else {
    if (registerBtn) registerBtn.classList.remove('hidden');
    if (loginBtn) loginBtn.classList.remove('hidden');
    if (userPanel) userPanel.classList.add('hidden');
    
    const balanceCont = document.getElementById('user-balance-container');
    const cartCont = document.getElementById('cart-container');
    if (balanceCont) balanceCont.classList.add('hidden');
    if (cartCont) cartCont.classList.add('hidden');
  }

  // Inject Profile & Admin links vào user dropdown nếu chưa có
  const userDD = document.getElementById('user-dropdown');
  if (userDD) {
    if (!document.getElementById('open-profile-btn')) {
      userDD.insertAdjacentHTML('afterbegin', `
        <a href="#" id="open-profile-btn">👤 Hồ sơ & Thư viện</a>
        <a href="admin.html" id="open-admin-btn" class="hidden">⚙️ Quản trị hệ thống</a>
      `);
    }
    const adminLink = document.getElementById('open-admin-btn');
    if (adminLink) {
      if (currentUser && currentUser.role === 'admin') adminLink.classList.remove('hidden');
      else adminLink.classList.add('hidden');
    }
  }

  // Thêm nút "⚙️ Quản trị" nổi bật trực tiếp trên Header Navbar cho tài khoản Admin (khong hien o trang admin.html)
  const navLinksList = document.querySelector('.nav-links');
  if (navLinksList && !document.getElementById('admin-main-content')) {
    let navAdminBtn = document.getElementById('nav-admin-direct-btn');
    if (currentUser && currentUser.role === 'admin') {
      if (!navAdminBtn) {
        navLinksList.insertAdjacentHTML('afterbegin', `
          <a href="admin.html" id="nav-admin-direct-btn" style="background: rgba(234, 179, 8, 0.2); border: 1px solid #eab308; color: #facc15; padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 0.85rem; text-decoration: none; display: flex; align-items: center; gap: 4px; margin-right: 8px; transition: 0.2s;" title="Mở trang Quản trị Hệ thống">⚙️ Quản trị</a>
        `);
      } else {
        navAdminBtn.classList.remove('hidden');
      }
    } else if (navAdminBtn) {
      navAdminBtn.classList.add('hidden');
    }
  }

  // Cập nhật số lượng Wishlist trên nút trang chủ
  const wishlistBtnText = document.getElementById('wishlist-btn-text');
  if (wishlistBtnText) {
    const wCount = (currentUser && currentUser.wishlist) ? currentUser.wishlist.length : 0;
    wishlistBtnText.textContent = `Yêu thích (${wCount})`;
  }

  // Đảm bảo modal Hồ sơ và Admin tồn tại trên trang
  ensureModalsExist();
}

function setupCheckoutEvent() {
  const checkoutBtn = document.getElementById('checkout-btn');
  if (!checkoutBtn) return;

  checkoutBtn.onclick = async (e) => {
    e.stopPropagation();
    const u = storage.get('currentUser');
    if (!u) return;

    const feedback = document.getElementById('cart-checkout-feedback');
    const summary = document.getElementById('cart-summary');
    const itemsCont = document.getElementById('cart-items');
    const cDD = document.getElementById('cart-dropdown');

    if (!u.cart || u.cart.length === 0) {
      if (feedback) {
        feedback.style.display = 'block';
        feedback.innerHTML = `<div style="color: #f87171; font-size: 0.85rem; text-align: center; padding: 6px;">Giỏ hàng của bạn đang trống!</div>`;
      }
      return;
    }

    // Đổi trạng thái nút sang Đang thanh toán
    checkoutBtn.disabled = true;
    checkoutBtn.style.opacity = '0.7';
    checkoutBtn.innerHTML = '<span>⏳ Đang thanh toán...</span>';
    if (feedback) feedback.style.display = 'none';

    try {
      const res = await fetch(`${API_URL}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u.username })
      });
      const data = await res.json();

      if (res.ok) {
        // Lưu user đã cập nhật
        storage.set('currentUser', data.user);
        
        // Cập nhật số dư trên thanh header
        const balanceEl = document.getElementById('user-balance-text');
        if (balanceEl) balanceEl.textContent = (data.user.money || 0).toLocaleString('vi-VN') + 'đ';

        // Cập nhật huy hiệu giỏ hàng
        const badge = document.getElementById('cart-badge');
        if (badge) badge.style.display = 'none';

        const countHeader = document.getElementById('cart-count-header');
        if (countHeader) countHeader.textContent = '0';

        // Cập nhật nút ở trang chi tiết game nếu có
        await renderGameDetailTags();

        // Ẩn bảng tổng tiền và nút thanh toán
        if (summary) summary.style.display = 'none';
        checkoutBtn.style.display = 'none';

        // Hiển thị thông báo thành công TRỰC QUAN NGAY TRONG BẢNG GIỎ HÀNG (KHÔNG BỊ TẮT ĐỘT NGỘT)
        if (itemsCont) {
          itemsCont.innerHTML = `
            <div style="text-align: center; padding: 22px 10px; animation: fadeIn 0.3s ease;">
                <div style="font-size: 2.4rem; margin-bottom: 6px;">🎉</div>
                <h4 style="color: #4ade80; margin: 0 0 6px 0; font-size: 1.05rem;">Thanh toán thành công!</h4>
                <p style="color: var(--muted); font-size: 0.85rem; margin-bottom: 15px; line-height: 1.4;">Game đã được chuyển vào Thư viện của bạn.</p>
                <div style="display: flex; gap: 8px; justify-content: center;">
                    <button type="button" id="cart-goto-library-btn" style="background: var(--primary); color: white; border: none; padding: 7px 14px; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: 0.2s;">🎮 Vào Thư viện</button>
                    <button type="button" id="cart-close-success-btn" style="background: rgba(255,255,255,0.08); color: var(--text); border: 1px solid var(--border); padding: 7px 14px; border-radius: 6px; font-size: 0.85rem; cursor: pointer;">Đóng</button>
                </div>
            </div>
          `;

          const gotoLib = document.getElementById('cart-goto-library-btn');
          if (gotoLib) {
            gotoLib.onclick = (ev) => {
              ev.stopPropagation();
              if (cDD) cDD.classList.add('hidden');
              const profBtn = document.getElementById('open-profile-btn');
              if (profBtn) profBtn.click();
            };
          }
          const closeSuccess = document.getElementById('cart-close-success-btn');
          if (closeSuccess) {
            closeSuccess.onclick = (ev) => {
              ev.stopPropagation();
              if (cDD) cDD.classList.add('hidden');
            };
          }
        }

        showToast('🎉 Thanh toán thành công!');
      } else {
        // Thất bại (VD: Không đủ tiền) -> BẢNG GIỎ HÀNG VẪN MỞ NGUYÊN, không dùng alert làm mất bảng!
        checkoutBtn.disabled = false;
        checkoutBtn.style.opacity = '1';
        checkoutBtn.innerHTML = '<span>💳 Thanh toán ngay</span>';

        if (feedback) {
          feedback.style.display = 'block';
          feedback.innerHTML = `
            <div style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 8px; padding: 10px; color: #f87171; font-size: 0.85rem; text-align: center;">
                <div style="margin-bottom: 6px; font-weight: 600;">⚠️ ${data.error || 'Số dư không đủ để thanh toán!'}</div>
                <button type="button" id="cart-quick-deposit-btn" style="background: var(--primary); color: white; border: none; padding: 6px 14px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: 0.2s;">
                    + Nạp tiền nhanh qua VietQR
                </button>
            </div>
          `;
          const quickDeposit = document.getElementById('cart-quick-deposit-btn');
          if (quickDeposit) {
            quickDeposit.onclick = (ev) => {
              ev.stopPropagation();
              openModal('deposit-modal');
              const modal = getDepositModal();
              if (modal) updateQR(10000);
            };
          }
        }
      }
    } catch (err) {
      checkoutBtn.disabled = false;
      checkoutBtn.style.opacity = '1';
      checkoutBtn.innerHTML = '<span>💳 Thanh toán ngay</span>';
      if (feedback) {
        feedback.style.display = 'block';
        feedback.innerHTML = `<div style="color: #f87171; font-size: 0.85rem; text-align: center; padding: 6px;">Lỗi kết nối máy chủ</div>`;
      }
    }
  };
}

async function updateCartUI(cartSlugs) {
    const badge = document.getElementById('cart-badge');
    const itemsCont = document.getElementById('cart-items');
    const countHeader = document.getElementById('cart-count-header');
    const summary = document.getElementById('cart-summary');
    const checkoutBtn = document.getElementById('checkout-btn');
    const feedback = document.getElementById('cart-checkout-feedback');
    const balanceText = document.getElementById('cart-user-balance');
    const totalPriceEl = document.getElementById('cart-total-price');

    if (!itemsCont) return;

    const currentUser = storage.get('currentUser');
    const userMoney = currentUser ? (currentUser.money || 0) : 0;
    if (balanceText) balanceText.textContent = userMoney.toLocaleString('vi-VN') + 'đ';

    if (feedback) feedback.style.display = 'none';

    if (cartSlugs && cartSlugs.length > 0) {
        if (badge) {
            badge.style.display = 'block';
            badge.textContent = cartSlugs.length;
        }
        if (countHeader) countHeader.textContent = cartSlugs.length;
        if (summary) summary.style.display = 'block';
        if (checkoutBtn) {
            checkoutBtn.style.display = 'flex';
            checkoutBtn.disabled = false;
            checkoutBtn.style.opacity = '1';
            checkoutBtn.innerHTML = '<span>💳 Thanh toán ngay</span>';
        }
    } else {
        if (badge) badge.style.display = 'none';
        if (countHeader) countHeader.textContent = '0';
        if (summary) summary.style.display = 'none';
        if (checkoutBtn) checkoutBtn.style.display = 'none';
        itemsCont.innerHTML = '<p style="color:var(--muted); text-align:center; padding: 25px 0; margin: 0;">🛒 Giỏ hàng của bạn đang trống</p>';
        return;
    }

    itemsCont.innerHTML = '<p style="color:var(--muted); text-align:center; padding: 15px 0;">Đang tải danh sách game...</p>';

    try {
        const res = await fetch(`${API_URL}/games`);
        const games = await res.json();

        itemsCont.innerHTML = '';
        let totalPrice = 0;

        cartSlugs.forEach(slug => {
            const game = games.find(g => g.slug === slug);
            if (game) {
                const gamePrice = typeof game.price === 'number' ? game.price : 1000;
                totalPrice += gamePrice;

                const row = document.createElement('div');
                row.style.display = 'flex';
                row.style.alignItems = 'center';
                row.style.marginBottom = '8px';
                row.style.borderBottom = '1px solid var(--border)';
                row.style.paddingBottom = '8px';
                row.style.gap = '10px';

                row.innerHTML = `
                    <img src="${game.img}" style="width: 48px; height: 32px; object-fit: cover; border-radius: 4px; flex-shrink: 0;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 0.85rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text);">${game.name}</div>
                        <div style="font-size: 0.78rem; color: #facc15; font-weight: 600;">${gamePrice.toLocaleString('vi-VN')}đ</div>
                    </div>
                    <button class="remove-cart-btn" data-slug="${slug}" style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #f87171; font-weight: bold; cursor: pointer; border-radius: 4px; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; font-size: 1rem; transition: 0.2s;" title="Xóa khỏi giỏ hàng">&times;</button>
                `;
                itemsCont.appendChild(row);
            }
        });

        if (totalPriceEl) totalPriceEl.textContent = totalPrice.toLocaleString('vi-VN') + 'đ';

        // Gắn sự kiện nút xóa game
        itemsCont.querySelectorAll('.remove-cart-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const slug = btn.getAttribute('data-slug');
                const u = storage.get('currentUser');
                if (!u) return;

                btn.disabled = true;
                btn.style.opacity = '0.5';

                const r = await fetch(`${API_URL}/cart/remove`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ username: u.username, slug })
                });
                if (r.ok) {
                    const updatedUser = await r.json();
                    storage.set('currentUser', updatedUser);
                    await updateCartUI(updatedUser.cart || []);
                    await renderGameDetailTags();
                }
            });
        });
    } catch (e) {
        itemsCont.innerHTML = '<p style="color:var(--muted); text-align:center;">Không thể tải danh sách game</p>';
    }
}

function showToast(msg) {
    const toast = document.getElementById('toast-notification');
    if (toast) {
        toast.textContent = msg;
        toast.style.opacity = '1';
        setTimeout(() => toast.style.opacity = '0', 1300);
    }
}

async function renderTagsDropdown() {
  const container = document.getElementById('tags-dropdown');
  if (!container) return;

  try {
    const response = await fetch(`${API_URL}/tags`);
    const tags = await response.json();
    
    container.innerHTML = '';
    tags.forEach(tag => {
      const item = document.createElement('div');
      item.className = 'tag-item-wrapper';
      item.style.display = 'flex';
      item.style.justifyContent = 'space-between';
      item.style.alignItems = 'center';

      const span = document.createElement('span');
      span.textContent = tag;
      span.style.flex = '1';
      span.style.padding = '0.3rem 0';
      span.style.cursor = 'pointer';
      span.addEventListener('click', () => filterGamesByTag(tag));
      item.appendChild(span);

      const currentUser = storage.get('currentUser', null);
      if (currentUser && currentUser.role === 'admin') {
        const delBtn = document.createElement('button');
        delBtn.textContent = '×';
        delBtn.style.background = 'none';
        delBtn.style.border = 'none';
        delBtn.style.color = 'red';
        delBtn.style.cursor = 'pointer';
        delBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (confirm(`Xóa tag "${tag}" khỏi hệ thống?`)) {
            await fetch(`${API_URL}/tags/${encodeURIComponent(tag)}`, { method: 'DELETE' });
            renderTagsDropdown();
          }
        });
        item.appendChild(delBtn);
      }
      container.appendChild(item);
    });

    const currentUser = storage.get('currentUser', null);
    if (currentUser && currentUser.role === 'admin') {
      const addBtn = document.createElement('div');
      addBtn.textContent = '+ Thêm tag hệ thống';
      addBtn.style.padding = '0.5rem';
      addBtn.style.color = 'var(--primary)';
      addBtn.style.cursor = 'pointer';
      addBtn.style.fontWeight = 'bold';
      addBtn.style.borderTop = '1px solid rgba(0,0,0,0.1)';
      addBtn.addEventListener('click', async () => {
        const newTag = prompt('Nhập tên tag mới:');
        if (newTag && newTag.trim()) {
          await fetch(`${API_URL}/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newTag.trim() })
          });
          renderTagsDropdown();
        }
      });
      container.appendChild(addBtn);
    }
  } catch (error) {
    console.error("Lỗi lấy tags:", error);
  }
}

function filterGamesByTag(tag) {
  if (!document.getElementById('games-container')) {
    window.location.href = `index.html?tag=${encodeURIComponent(tag)}`;
  } else {
    renderGames(tag);
  }
}

function setupOutsideClick() {
  document.addEventListener('click', (e) => {
    const tagDD = document.getElementById('tags-dropdown');
    const userDD = document.getElementById('user-dropdown');
    const nav = document.getElementById('games-nav-item');
    const userP = document.getElementById('user-panel');
    const cartDD = document.getElementById('cart-dropdown');
    const cartCont = document.getElementById('cart-container');

    if (tagDD && nav && !nav.contains(e.target) && !tagDD.contains(e.target)) {
      tagDD.classList.add('hidden');
    }
    if (userDD && userP && !userP.contains(e.target) && !userDD.contains(e.target)) {
      userDD.classList.add('hidden');
    }
    if (cartDD && cartCont && !cartCont.contains(e.target)) {
      cartDD.classList.add('hidden');
    }
  });
}

let allGamesCache = [];
let allTagsList = [];
let activeTags = [];
let currentSort = 'default';
let wishlistOnly = false;
let currentPage = 1;
const PAGE_SIZE = 12;
let currentSearch = '';

async function fetchAllGamesAndTags() {
  try {
    const [gamesRes, tagsRes] = await Promise.all([
      fetch(`${API_URL}/games`),
      fetch(`${API_URL}/tags`)
    ]);
    allGamesCache = await gamesRes.json();
    allTagsList = await tagsRes.json();
  } catch (e) {
    console.error("Lỗi tải games hoặc tags:", e);
  }
}

async function renderGames(filterTag = null, searchQuery = null) {
  const container = document.getElementById('games-container');
  if (!container) return;

  if (allGamesCache.length === 0) {
    await fetchAllGamesAndTags();
  }

  if (filterTag && !activeTags.includes(filterTag)) {
    activeTags = [filterTag];
  }
  if (searchQuery !== null) {
    currentSearch = searchQuery.toLowerCase();
  }

  renderFilterChips();
  setupSectionActionEvents();
  renderFilteredGames();
}

function renderFilterChips() {
  const chipsContainer = document.getElementById('filter-chips-container');
  if (!chipsContainer) return;

  chipsContainer.innerHTML = '';

  // Chip 'Tất cả'
  const allChip = document.createElement('button');
  allChip.type = 'button';
  allChip.className = `filter-chip ${(activeTags.length === 0 && !wishlistOnly) ? 'active' : ''}`;
  allChip.textContent = '🌟 Tất cả';
  allChip.onclick = () => {
    activeTags = [];
    wishlistOnly = false;
    currentPage = 1;
    renderFilterChips();
    renderFilteredGames();
  };
  chipsContainer.appendChild(allChip);

  // Danh sách tags
  allTagsList.forEach(tag => {
    const chip = document.createElement('button');
    chip.type = 'button';
    const isActive = activeTags.includes(tag);
    chip.className = `filter-chip ${isActive ? 'active' : ''}`;
    chip.textContent = tag;
    chip.onclick = () => {
      wishlistOnly = false;
      currentPage = 1;
      if (activeTags.includes(tag)) {
        activeTags = activeTags.filter(t => t !== tag);
      } else {
        activeTags.push(tag);
      }
      renderFilterChips();
      renderFilteredGames();
    };
    chipsContainer.appendChild(chip);
  });
}

let sectionEventsBound = false;
function setupSectionActionEvents() {
  if (sectionEventsBound) return;
  sectionEventsBound = true;

  const wishlistBtn = document.getElementById('wishlist-filter-btn');
  if (wishlistBtn) {
    wishlistBtn.addEventListener('click', () => {
      const u = storage.get('currentUser');
      if (!u) {
        openModal('login-modal');
        return;
      }
      wishlistOnly = !wishlistOnly;
      if (wishlistOnly) activeTags = [];
      currentPage = 1;
      wishlistBtn.classList.toggle('active', wishlistOnly);
      renderFilterChips();
      renderFilteredGames();
    });
  }

  const sortSelect = document.getElementById('game-sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      currentPage = 1;
      renderFilteredGames();
    });
  }

  const clearBtn = document.getElementById('clear-filter-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      activeTags = [];
      wishlistOnly = false;
      currentSearch = '';
      currentSort = 'default';
      currentPage = 1;
      if (sortSelect) sortSelect.value = 'default';
      if (wishlistBtn) wishlistBtn.classList.remove('active');
      history.replaceState(null, '', window.location.pathname);
      renderFilterChips();
      renderFilteredGames();
    });
  }
}

function renderFilteredGames() {
  const container = document.getElementById('games-container');
  if (!container) return;

  const currentUser = storage.get('currentUser', null);
  const userWishlist = (currentUser && currentUser.wishlist) ? currentUser.wishlist : [];

  let filtered = [...allGamesCache];

  // 1. Lọc theo search
  if (currentSearch) {
    filtered = filtered.filter(g => g.name.toLowerCase().includes(currentSearch));
  }

  // 2. Lọc theo wishlist
  if (wishlistOnly) {
    filtered = filtered.filter(g => userWishlist.includes(g.slug));
  }

  // 3. Lọc theo multi-tags
  if (activeTags.length > 0) {
    filtered = filtered.filter(g => g.tags && activeTags.some(t => g.tags.includes(t)));
  }

  // 4. Sắp xếp
  if (currentSort === 'name_asc') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else if (currentSort === 'name_desc') {
    filtered.sort((a, b) => b.name.localeCompare(a.name));
  } else if (currentSort === 'rating_desc') {
    filtered.sort((a, b) => (b.ratingAvg || 5) - (a.ratingAvg || 5));
  } else if (currentSort === 'rating_count') {
    filtered.sort((a, b) => (b.ratingCount || 0) - (a.ratingCount || 0));
  } else if (currentSort === 'price_asc') {
    filtered.sort((a, b) => (a.price || 1000) - (b.price || 1000));
  } else if (currentSort === 'price_desc') {
    filtered.sort((a, b) => (b.price || 1000) - (a.price || 1000));
  }

  // Cập nhật tiêu đề & nút bỏ lọc
  const sectionTitle = document.getElementById('games-section-title');
  const countBadge = document.getElementById('games-filtered-count');
  const clearBtn = document.getElementById('clear-filter-btn');
  const wishlistBtn = document.getElementById('wishlist-filter-btn');

  if (countBadge) countBadge.textContent = `${filtered.length} game`;

  if (sectionTitle) {
    if (wishlistOnly) sectionTitle.textContent = 'Game Yêu Thích Của Bạn ❤️';
    else if (currentSearch) sectionTitle.textContent = `Kết quả cho "${currentSearch}"`;
    else if (activeTags.length > 0) sectionTitle.textContent = `Thể loại: ${activeTags.join(', ')}`;
    else sectionTitle.textContent = 'Tất cả game';
  }

  const hasFilter = activeTags.length > 0 || wishlistOnly || currentSearch !== '';
  if (clearBtn) clearBtn.classList.toggle('hidden', !hasFilter);
  if (wishlistBtn) wishlistBtn.classList.toggle('active', wishlistOnly);

  const heroCount = document.getElementById('hero-game-count');
  if (heroCount) heroCount.textContent = `${allGamesCache.length}+`;

  // 5. Phân trang
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageGames = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  // 6. Render game cards
  container.innerHTML = '';
  if (pageGames.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--muted);">
        <p style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</p>
        <p style="font-size: 1.1rem; font-weight: 600;">Không tìm thấy game nào phù hợp</p>
        <p style="font-size: 0.9rem; margin-top: 4px;">Hãy thử chọn thể loại khác hoặc bấm "Bỏ lọc" để xem lại toàn bộ game.</p>
      </div>`;
  } else {
    pageGames.forEach((game, index) => {
      const card = document.createElement('div');
      card.className = 'game-card';
      card.style.animationDelay = `${Math.min(index, 12) * 40}ms`;

      const isWishlisted = userWishlist.includes(game.slug);

      // Media + nút tim wishlist + overlay
      const media = document.createElement('div');
      media.className = 'game-card-media';
      media.innerHTML = `
        <img src="${game.img}" alt="${game.name}" loading="lazy" />
        <button type="button" class="game-card-wishlist-btn ${isWishlisted ? 'active' : ''}" data-slug="${game.slug}" title="${isWishlisted ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'}">
          ${isWishlisted ? '❤️' : '🤍'}
        </button>
        <div class="game-card-overlay">
          <span class="game-card-cta">Xem chi tiết →</span>
        </div>
      `;

      // Bắt sự kiện bấm tim yêu thích
      const wishBtn = media.querySelector('.game-card-wishlist-btn');
      wishBtn.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        await toggleWishlist(game.slug);
      });

      // Body
      const body = document.createElement('div');
      body.className = 'game-card-body';

      const metaRow = document.createElement('div');
      metaRow.className = 'game-card-meta-row';
      const ratingStars = game.ratingAvg ? `⭐ ${game.ratingAvg}` : '⭐ 5.0';
      const ratingCountText = game.ratingCount ? `(${game.ratingCount})` : '';
      metaRow.innerHTML = `
        <span class="game-card-rating">${ratingStars} <span style="color:var(--muted); font-size:0.7rem; font-weight:normal;">${ratingCountText}</span></span>
        <span class="game-card-platform">🖥️ PC</span>
      `;

      const title = document.createElement('h3');
      title.textContent = game.name;
      title.title = game.name;

      const tagsWrap = document.createElement('div');
      tagsWrap.className = 'game-card-tags';
      (game.tags || []).slice(0, 3).forEach(t => {
        const chip = document.createElement('span');
        chip.textContent = t;
        tagsWrap.appendChild(chip);
      });

      const footer = document.createElement('div');
      footer.className = 'game-card-footer';
      const owned = currentUser && (currentUser.role === 'admin' || (currentUser.purchased || []).includes(game.slug));
      const priceText = (game.price || 1000).toLocaleString('vi-VN') + 'đ';
      footer.innerHTML = `
        <span class="${owned ? 'game-card-owned' : 'game-card-price'}">
          ${owned ? '✓ Đã sở hữu' : priceText}
        </span>
      `;

      body.appendChild(metaRow);
      body.appendChild(title);
      body.appendChild(tagsWrap);
      body.appendChild(footer);

      card.appendChild(media);
      card.appendChild(body);

      card.addEventListener('click', () => {
        window.location.href = `${game.slug}.html`;
      });
      container.appendChild(card);
    });
  }

  // 7. Render thanh phân trang
  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const paginCont = document.getElementById('pagination-container');
  if (!paginCont) return;

  if (totalPages <= 1) {
    paginCont.innerHTML = '';
    return;
  }

  paginCont.innerHTML = '';

  // Nút Trước
  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'page-btn';
  prevBtn.textContent = '«';
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      renderFilteredGames();
      document.getElementById('games-section').scrollIntoView({ behavior: 'smooth' });
    }
  };
  paginCont.appendChild(prevBtn);

  // Các trang số
  for (let i = 1; i <= totalPages; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.type = 'button';
    pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
    pageBtn.textContent = i;
    pageBtn.onclick = () => {
      currentPage = i;
      renderFilteredGames();
      document.getElementById('games-section').scrollIntoView({ behavior: 'smooth' });
    };
    paginCont.appendChild(pageBtn);
  }

  // Nút Sau
  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'page-btn';
  nextBtn.textContent = '»';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.onclick = () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderFilteredGames();
      document.getElementById('games-section').scrollIntoView({ behavior: 'smooth' });
    }
  };
  paginCont.appendChild(nextBtn);
}

async function toggleWishlist(slug) {
  const currentUser = storage.get('currentUser', null);
  if (!currentUser) {
    openModal('login-modal');
    return;
  }

  try {
    const res = await fetch(`${API_URL}/user/wishlist/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser.username, slug })
    });
    if (res.ok) {
      const updatedUser = await res.json();
      storage.set('currentUser', updatedUser);
      const isNowWishlisted = (updatedUser.wishlist || []).includes(slug);
      showToast(isNowWishlisted ? '❤️ Đã thêm vào yêu thích' : '🤍 Đã bỏ khỏi yêu thích');
      renderHeader();
      renderFilteredGames();
    }
  } catch (err) {
    console.error("Lỗi toggle wishlist:", err);
  }
}

/**
 * Auth flows
 */
async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('register-username').value.trim();
  const password = document.getElementById('register-password').value;
  const errorEl = document.getElementById('register-error');

  try {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, theme: getActiveTheme() })
    });
    
    const data = await response.json();
    if (response.ok) {
      errorEl.textContent = '';
      storage.set('currentUser', data);
      closeModal('register-modal');
      renderHeader();
      renderTagsDropdown();
    } else {
      errorEl.textContent = data.error || 'Đăng ký thất bại';
    }
  } catch (error) {
    errorEl.textContent = 'Lỗi kết nối server';
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');

  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    if (response.ok) {
      errorEl.textContent = '';
      storage.set('currentUser', data);
      closeModal('login-modal');
      renderHeader();
      renderTagsDropdown();
    } else {
      errorEl.textContent = data.error || 'Sai tên đăng nhập hoặc mật khẩu';
    }
  } catch (error) {
    errorEl.textContent = 'Lỗi kết nối server';
  }
}

function logout() {
  localStorage.removeItem('currentUser');
  renderHeader();
  renderGames();
  renderTagsDropdown();
  if (window.location.pathname !== '/' && !window.location.pathname.includes('index.html')) {
    window.location.href = 'index.html';
  }
}

/**
 * Hàm tải game dùng cho các trang giới thiệu chi tiết
 */
function downloadGame(gameName) {
  const currentUser = storage.get('currentUser', null);
  if (currentUser) {
    alert(`Đang bắt đầu tải game: ${gameName}...`);
  } else {
    alert('Vui lòng đăng nhập để có quyền tải game!');
  }
}

/**
 * Helper UI interactions
 */
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('hidden');
}
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('hidden');
    const err = modal.querySelector('.error-msg');
    if (err) err.textContent = '';
  }
}

/**
 * Event listeners binding
 */
function bindEvents() {
  const loginBtn = document.getElementById('login-btn');
  const registerBtn = document.getElementById('register-btn');

  if (loginBtn) loginBtn.addEventListener('click', (e) => {
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
      e.preventDefault();
      openModal('login-modal');
    }
  });

  if (registerBtn) registerBtn.addEventListener('click', (e) => {
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
      e.preventDefault();
      openModal('register-modal');
    }
  });

  document.querySelectorAll('.modal .close').forEach(btn => {
    const target = btn.getAttribute('data-close');
    btn.addEventListener('click', () => closeModal(target));
  });

  const regForm = document.getElementById('register-form');
  if (regForm) regForm.addEventListener('submit', handleRegister);

  const loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });

  const navItem = document.getElementById('games-nav-item');
  const tagsDropdown = document.getElementById('tags-dropdown');
  if (navItem && tagsDropdown) {
    navItem.addEventListener('mouseenter', () => tagsDropdown.classList.remove('hidden'));
    navItem.addEventListener('mouseleave', () => tagsDropdown.classList.add('hidden'));
  }

  const userPanel = document.getElementById('user-panel');
  const userDropdown = document.getElementById('user-dropdown');
  if (userPanel && userDropdown) {
    userPanel.addEventListener('mouseenter', () => userDropdown.classList.remove('hidden'));
    userPanel.addEventListener('mouseleave', () => userDropdown.classList.add('hidden'));
  }

  // Search logic
  const searchIcon = document.getElementById('search-icon');
  const searchInput = document.getElementById('search-input');
  
  if (searchIcon && searchInput) {
    searchIcon.addEventListener('click', () => {
      searchIcon.classList.add('hidden');
      searchInput.classList.remove('hidden');
      searchInput.focus();
    });

    searchInput.addEventListener('blur', () => {
      if (searchInput.value.trim() === '') {
        searchInput.classList.add('hidden');
        searchIcon.classList.remove('hidden');
      }
    });

    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (query) {
          if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
            renderGames(null, query);
          } else {
            window.location.href = `index.html?search=${encodeURIComponent(query)}`;
          }
        }
      }
    });
  }
}

async function renderGameDetailTags() {
  const container = document.getElementById('detail-game-tags');
  const main = document.querySelector('.game-detail-container');
  const addBtn = document.getElementById('add-tag-to-game-btn');

  if (!container || !main) return;

  const slug = main.getAttribute('data-slug');
  
  try {
    const response = await fetch(`${API_URL}/games`);
    const games = await response.json();
    const game = games.find(g => g.slug === slug);

    if (!game) {
      console.error('Không tìm thấy game với slug:', slug);
      return;
    }

    // Tự động gán ảnh banner từ Database vào giao diện
    const bannerImg = document.querySelector('.game-image-large img');
    if (bannerImg) {
      bannerImg.src = game.img;
      // Để ảnh hiển thị đẹp hơn và FULL không bị cắt
      bannerImg.style.width = '100%';
      bannerImg.style.height = 'auto'; // Cho phép tự động điều chỉnh chiều cao theo tỉ lệ
      bannerImg.style.objectFit = 'contain';
      bannerImg.style.borderRadius = 'var(--radius)';
      bannerImg.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)'; // Thêm chút bóng cho đẹp
    }

    const currentUser = storage.get('currentUser', null);

    if (currentUser && currentUser.role === 'admin' && addBtn) {
      addBtn.style.display = 'inline-block';
      addBtn.onclick = async (e) => {
        e.stopPropagation();
        
        const tagsResponse = await fetch(`${API_URL}/tags`);
        const allTags = await tagsResponse.json();
        const availableTags = allTags.filter(t => !game.tags.includes(t));

        if (availableTags.length === 0) {
          alert('Không còn tag nào khả dụng!');
          return;
        }

        let menu = document.getElementById('tag-selection-menu');
        if (menu) menu.remove();

        menu = document.createElement('div');
        menu.id = 'tag-selection-menu';
        menu.className = 'custom-dropdown-menu';

        availableTags.forEach(tag => {
          const item = document.createElement('div');
          item.className = 'dropdown-item';
          item.textContent = tag;
          item.onclick = async () => {
            await fetch(`${API_URL}/games/${slug}/tags`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tag })
            });
            renderGameDetailTags();
            menu.remove();
          };
          menu.appendChild(item);
        });

        document.body.appendChild(menu);

        const rect = addBtn.getBoundingClientRect();
        menu.style.top = `${rect.bottom + window.scrollY + 5}px`;
        menu.style.left = `${rect.left + window.scrollX - 100}px`;

        const closeMenu = (ev) => {
          if (!menu.contains(ev.target) && ev.target !== addBtn) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
          }
        };
        document.addEventListener('click', closeMenu);
      };

    } else if (addBtn) {
      addBtn.style.display = 'none';
    }

    container.innerHTML = '';
    if (game.tags && game.tags.length > 0) {
      game.tags.forEach(tag => {
        const span = document.createElement('span');
        span.className = 'tag-badge';
        span.textContent = tag;

        if (currentUser && currentUser.role === 'admin') {
          span.style.cursor = 'pointer';
          span.title = 'Nhấp để xóa tag';
          span.addEventListener('click', async () => {
            if (confirm(`Xóa tag "${tag}" khỏi game này?`)) {
              await fetch(`${API_URL}/games/${slug}/tags/${encodeURIComponent(tag)}`, { method: 'DELETE' });
              renderGameDetailTags();
            }
          });
        }
        container.appendChild(span);
      });
    } else {
      container.innerHTML = '<span style="color:var(--muted); font-size:0.9rem;">Chưa có thể loại</span>';
    }

    // Logic thay đổi nút Tải Game
    const oldBtn = document.querySelector('.download-btn-large');
    if (oldBtn) {
        const newBtn = oldBtn.cloneNode(true);
        oldBtn.parentNode.replaceChild(newBtn, oldBtn);

        if (currentUser && currentUser.role === 'admin') {
            newBtn.textContent = 'Tải game';
            newBtn.onclick = () => alert('Đang tải game...');
        } else if (currentUser && currentUser.purchased && currentUser.purchased.includes(slug)) {
            newBtn.textContent = 'Tải game';
            newBtn.onclick = () => alert('Đang tải game...');
        } else {
            newBtn.textContent = '1.000đ';
            newBtn.onclick = async () => {
                if (!currentUser) {
                    openModal('login-modal');
                } else {
                    const res = await fetch(`${API_URL}/cart/add`, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({username: currentUser.username, slug})
                    });
                    if (res.ok) {
                        const updatedUser = await res.json();
                        storage.set('currentUser', updatedUser);
                        showToast('Đã thêm vào giỏ hàng');
                        renderHeader();
                    }
                }
            };
        }
    }

    // Render khối Đánh giá & Bình luận của game
    await renderGameDetailReviews(slug);

  } catch (error) {
    console.error("Lỗi tải chi tiết game:", error);
  }
}

/**
 * ===================================================
 * ĐÁNH GIÁ & BÌNH LUẬN TRANG CHI TIẾT (REVIEWS & RATINGS)
 * ===================================================
 */
async function renderGameDetailReviews(slug) {
  const mainSec = document.querySelector('.game-main-section');
  if (!mainSec) return;

  let reviewsWrap = document.getElementById('game-reviews-wrapper');
  if (!reviewsWrap) {
    reviewsWrap = document.createElement('div');
    reviewsWrap.id = 'game-reviews-wrapper';
    reviewsWrap.className = 'game-reviews-wrapper';
    mainSec.appendChild(reviewsWrap);
  }

  try {
    const res = await fetch(`${API_URL}/games/${slug}/reviews`);
    const data = await res.json();
    const reviews = data.reviews || [];
    const ratingAvg = data.ratingAvg || 5;
    const ratingCount = data.ratingCount || reviews.length;

    const currentUser = storage.get('currentUser', null);
    const hasPurchased = currentUser && (currentUser.role === 'admin' || (currentUser.purchased || []).includes(slug));

    let html = `
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1rem;">
        <div>
          <h3 style="margin-bottom: 4px;">Đánh giá từ cộng đồng</h3>
          <p style="color: var(--muted); font-size: 0.88rem; margin: 0;">Xem nhận xét và trải nghiệm của những người đã chơi tựa game này</p>
        </div>
      </div>

      <div class="reviews-header-score">
        <div class="reviews-big-score">${ratingAvg.toFixed(1)}</div>
        <div>
          <div style="color: #facc15; font-size: 1.1rem; margin-bottom: 2px;">
            ${'★'.repeat(Math.round(ratingAvg))}${'☆'.repeat(5 - Math.round(ratingAvg))}
          </div>
          <span style="color: var(--muted); font-size: 0.82rem;">Dựa trên ${ratingCount} lượt đánh giá</span>
        </div>
      </div>
    `;

    // Form viết đánh giá
    if (hasPurchased) {
      html += `
        <div class="review-card" style="margin-bottom: 1.5rem; background: hsla(265, 89%, 68%, 0.05); border-color: hsla(265, 89%, 68%, 0.25);">
          <h4 style="margin-bottom: 6px; color: var(--primary);">✍️ Viết đánh giá của bạn</h4>
          <form id="submit-review-form">
            <div style="margin-bottom: 8px;">
              <label style="font-size: 0.82rem; color: var(--muted); display: block; margin-bottom: 4px;">Chọn mức độ hài lòng:</label>
              <div class="star-rating-select" id="star-rating-select">
                <span data-val="1">★</span>
                <span data-val="2">★</span>
                <span data-val="3">★</span>
                <span data-val="4">★</span>
                <span data-val="5" class="selected">★</span>
              </div>
              <input type="hidden" id="review-rating-val" value="5" />
            </div>
            <div>
              <textarea id="review-comment-val" rows="3" class="custom-textarea" placeholder="Chia sẻ cảm nhận về đồ họa, cốt truyện, gameplay..." required style="margin-bottom: 8px;"></textarea>
            </div>
            <button type="submit" class="btn-primary" style="padding: 0.5rem 1.4rem; font-size: 0.88rem;">Gửi đánh giá</button>
          </form>
        </div>
      `;
    } else if (currentUser) {
      html += `
        <div style="padding: 12px 16px; background: hsla(0, 0%, 100%, 0.04); border: 1px dashed var(--border); border-radius: 12px; margin-bottom: 1.5rem; font-size: 0.88rem; color: var(--muted);">
          💡 Bạn cần mua tựa game này để có thể gửi đánh giá và nhận xét.
        </div>
      `;
    } else {
      html += `
        <div style="padding: 12px 16px; background: hsla(0, 0%, 100%, 0.04); border: 1px dashed var(--border); border-radius: 12px; margin-bottom: 1.5rem; font-size: 0.88rem; color: var(--muted);">
          💡 Hãy <a href="#" id="review-login-link" style="color: var(--primary); font-weight: 600;">đăng nhập</a> và sở hữu game để viết đánh giá.
        </div>
      `;
    }

    // Danh sách các bình luận
    if (reviews.length === 0) {
      html += `<p style="color: var(--muted); text-align: center; padding: 2rem;">Chưa có đánh giá nào cho game này. Hãy là người đầu tiên chia sẻ cảm nhận!</p>`;
    } else {
      html += `<div class="reviews-list">`;
      reviews.forEach(r => {
        const starsText = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
        const dateStr = new Date(r.createdAt).toLocaleDateString('vi-VN');
        html += `
          <div class="review-card">
            <div class="review-card-head">
              <div>
                <span class="review-author">👤 ${escapeHtml(r.username)}</span>
                <span class="review-stars" style="margin-left: 8px;">${starsText}</span>
              </div>
              <span class="review-date">${dateStr}</span>
            </div>
            <div class="review-content">${escapeHtml(r.comment)}</div>
          </div>
        `;
      });
      html += `</div>`;
    }

    reviewsWrap.innerHTML = html;

    // Gắn sự kiện chọn sao
    const starsCont = document.getElementById('star-rating-select');
    if (starsCont) {
      const stars = starsCont.querySelectorAll('span');
      const valInput = document.getElementById('review-rating-val');
      stars.forEach(s => {
        s.addEventListener('click', () => {
          const v = parseInt(s.dataset.val);
          valInput.value = v;
          stars.forEach(st => {
            if (parseInt(st.dataset.val) <= v) st.classList.add('selected');
            else st.classList.remove('selected');
          });
        });
      });
    }

    // Gắn sự kiện submit form review
    const reviewForm = document.getElementById('submit-review-form');
    if (reviewForm) {
      reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rating = document.getElementById('review-rating-val').value;
        const comment = document.getElementById('review-comment-val').value;
        try {
          const subRes = await fetch(`${API_URL}/games/${slug}/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: currentUser.username,
              rating,
              comment
            })
          });
          if (subRes.ok) {
            showToast('Đã gửi đánh giá thành công!');
            renderGameDetailReviews(slug);
            if (typeof fetchAllGamesAndTags === 'function') fetchAllGamesAndTags();
          } else {
            const errData = await subRes.json();
            alert(errData.error || 'Lỗi gửi đánh giá');
          }
        } catch (err) {
          console.error("Lỗi gửi review:", err);
        }
      });
    }

    const loginLink = document.getElementById('review-login-link');
    if (loginLink) {
      loginLink.addEventListener('click', (e) => {
        e.preventDefault();
        openModal('login-modal');
      });
    }

  } catch (e) {
    console.error("Lỗi tải reviews:", e);
  }
}

/**
 * ===================================================
 * CÁC HÀM TIỆN ÍCH & TỰ ĐỘNG CHÈN MODAL (CHO CẢ TRANG GAME LẺ)
 * ===================================================
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function ensureModalsExist() {
  // Neu dang o trang admin.html chuyen dung thi tuyet doi khong chen modal trung lap
  if (document.getElementById('admin-main-content')) {
    return;
  }

  if (!document.getElementById('profile-modal')) {
    const profileModalHTML = `
      <div class="modal hidden" id="profile-modal">
        <div class="modal-content modal-large">
          <span class="close" data-close="profile-modal">&times;</span>
          <div class="profile-header-info">
            <div class="profile-avatar-wrap">
              <img id="profile-user-avatar" src="avatar.png" alt="Avatar" class="avatar-large" />
            </div>
            <div>
              <h2 id="profile-user-name" style="margin-bottom: 2px;">Tên người dùng</h2>
              <p style="color: var(--muted); font-size: 0.88rem;">Số dư: <strong id="profile-user-money" style="color: #facc15;">0đ</strong> · Vai trò: <span id="profile-user-role" class="badge-role">User</span></p>
            </div>
          </div>
          <div class="custom-tabs">
            <button type="button" class="tab-btn active" data-tab="tab-user-library">🎮 Game đã mua (<span id="profile-games-count">0</span>)</button>
            <button type="button" class="tab-btn" data-tab="tab-user-history">💳 Lịch sử nạp tiền</button>
            <button type="button" class="tab-btn" data-tab="tab-user-password">🔒 Đổi mật khẩu</button>
          </div>
          <div class="tab-pane active" id="tab-user-library">
            <div id="profile-library-grid" class="library-grid">
              <p style="color: var(--muted); text-align: center; padding: 2rem;">Đang tải thư viện game...</p>
            </div>
          </div>
          <div class="tab-pane" id="tab-user-history">
            <div class="history-table-wrap">
              <table class="custom-table" id="profile-transactions-table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Mã GD</th>
                    <th>Số tiền</th>
                    <th>Nội dung</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody id="profile-transactions-body">
                  <tr><td colspan="5" style="text-align: center; color: var(--muted); padding: 2rem;">Chưa có giao dịch nạp tiền</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="tab-pane" id="tab-user-password">
            <form id="change-password-form" style="max-width: 360px; margin: 1rem auto 0;">
              <label style="font-size: 0.85rem; color: var(--muted); display: block; margin-bottom: 4px;">Mật khẩu hiện tại:</label>
              <input type="password" id="cp-old-password" placeholder="Nhập mật khẩu hiện tại" required />
              <label style="font-size: 0.85rem; color: var(--muted); display: block; margin-bottom: 4px;">Mật khẩu mới (ít nhất 6 ký tự):</label>
              <input type="password" id="cp-new-password" placeholder="Nhập mật khẩu mới" required />
              <label style="font-size: 0.85rem; color: var(--muted); display: block; margin-bottom: 4px;">Xác nhận mật khẩu mới:</label>
              <input type="password" id="cp-confirm-password" placeholder="Nhập lại mật khẩu mới" required />
              <button type="submit" style="margin-top: 0.5rem;">Cập nhật mật khẩu</button>
              <p class="error-msg" id="cp-error"></p>
              <p class="success-msg" id="cp-success" style="color: #4ade80; font-size: 0.9rem; text-align: center;"></p>
            </form>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', profileModalHTML);
  }

  if (!document.getElementById('admin-modal')) {
    const adminModalHTML = `
      <div class="modal hidden" id="admin-modal">
        <div class="modal-content modal-extra-large">
          <span class="close" data-close="admin-modal">&times;</span>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.2rem; border-bottom: 1px solid var(--border); padding-bottom: 0.8rem;">
            <div>
              <h2 style="margin: 0;" class="gradient-text">⚙️ Bảng Quản Trị Hệ Thống</h2>
              <p style="color: var(--muted); font-size: 0.85rem; margin: 0;">Theo dõi doanh thu, tài khoản và quản lý kho game GameStore</p>
            </div>
            <button type="button" id="admin-refresh-btn" class="btn-ghost" style="padding: 0.4rem 0.9rem; font-size: 0.85rem;">🔄 Làm mới</button>
          </div>
          <div class="custom-tabs">
            <button type="button" class="tab-btn active" data-tab="tab-admin-overview">📊 Thống kê & Doanh thu</button>
            <button type="button" class="tab-btn" data-tab="tab-admin-games">🕹️ Quản lý Game (CRUD)</button>
            <button type="button" class="tab-btn" data-tab="tab-admin-users">👥 Quản lý Khách hàng</button>
          </div>
          <div class="tab-pane active" id="tab-admin-overview">
            <div class="kpi-grid">
              <div class="kpi-card">
                <span class="kpi-icon">💰</span>
                <div class="kpi-info">
                  <span class="kpi-label">Tổng doanh thu</span>
                  <strong class="kpi-value" id="kpi-revenue" style="color: #4ade80;">0đ</strong>
                </div>
              </div>
              <div class="kpi-card">
                <span class="kpi-icon">👥</span>
                <div class="kpi-info">
                  <span class="kpi-label">Tổng người dùng</span>
                  <strong class="kpi-value" id="kpi-users">0</strong>
                </div>
              </div>
              <div class="kpi-card">
                <span class="kpi-icon">🎮</span>
                <div class="kpi-info">
                  <span class="kpi-label">Tổng số game</span>
                  <strong class="kpi-value" id="kpi-games">0</strong>
                </div>
              </div>
              <div class="kpi-card">
                <span class="kpi-icon">🛒</span>
                <div class="kpi-info">
                  <span class="kpi-label">Lượt mua game</span>
                  <strong class="kpi-value" id="kpi-purchases">0</strong>
                </div>
              </div>
            </div>
            <div class="admin-charts-grid">
              <div class="admin-chart-box">
                <h4 style="margin-bottom: 0.8rem; font-size: 0.95rem;">📈 Doanh thu nạp tiền 7 ngày gần nhất</h4>
                <div style="height: 220px; position: relative;">
                  <canvas id="admin-revenue-chart"></canvas>
                </div>
              </div>
              <div class="admin-bestsellers-box">
                <h4 style="margin-bottom: 0.8rem; font-size: 0.95rem;">🔥 Top 5 Game bán chạy nhất</h4>
                <div id="admin-bestsellers-list" class="bestsellers-list">
                  <p style="color: var(--muted); text-align: center; padding: 2rem;">Đang tải danh sách...</p>
                </div>
              </div>
            </div>
            <h4 style="margin: 1.5rem 0 0.6rem; font-size: 0.95rem;">🕒 Giao dịch nạp tiền gần nhất</h4>
            <div class="history-table-wrap">
              <table class="custom-table" id="admin-recent-tx-table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Tài khoản</th>
                    <th>Số tiền</th>
                    <th>Cổng / Mã</th>
                    <th>Nội dung</th>
                  </tr>
                </thead>
                <tbody id="admin-recent-tx-body">
                  <tr><td colspan="5" style="text-align: center; color: var(--muted);">Chưa có giao dịch</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="tab-pane" id="tab-admin-games">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <span style="color: var(--muted); font-size: 0.88rem;">Danh sách tất cả game trong cơ sở dữ liệu:</span>
              <button type="button" class="btn-primary" id="admin-add-game-btn" style="padding: 0.5rem 1.2rem; font-size: 0.88rem;">+ Thêm Game Mới</button>
            </div>
            <div id="admin-game-form-container" class="admin-form-box hidden">
              <h3 id="admin-game-form-title" style="margin-bottom: 1rem; color: var(--primary);">Thêm Game Mới</h3>
              <form id="admin-game-form">
                <input type="hidden" id="ag-is-edit" value="0" />
                <div class="form-grid-2">
                  <div>
                    <label style="font-size:0.85rem; color:var(--muted);">Tên Game:</label>
                    <input type="text" id="ag-name" placeholder="Ví dụ: Elden Ring" required />
                  </div>
                  <div>
                    <label style="font-size:0.85rem; color:var(--muted);">Slug (Định danh URL):</label>
                    <input type="text" id="ag-slug" placeholder="Ví dụ: elden_ring" required />
                  </div>
                </div>
                <div class="form-grid-2">
                  <div>
                    <label style="font-size:0.85rem; color:var(--muted);">Link ảnh bìa (Steam / Direct URL):</label>
                    <input type="url" id="ag-img" placeholder="https://cdn.akamai.steamstatic.com/..." required />
                  </div>
                  <div>
                    <label style="font-size:0.85rem; color:var(--muted);">Giá bán (VNĐ):</label>
                    <input type="number" id="ag-price" value="1000" min="0" step="500" required />
                  </div>
                </div>
                <div class="form-grid-2">
                  <div>
                    <label style="font-size:0.85rem; color:var(--muted);">Thể loại (phân tách bằng dấu phẩy):</label>
                    <input type="text" id="ag-tags" placeholder="Hành động, Khám phá, Nhập vai" required />
                  </div>
                  <div>
                    <label style="font-size:0.85rem; color:var(--muted);">Nhà phát hành:</label>
                    <input type="text" id="ag-publisher" placeholder="FromSoftware" />
                  </div>
                </div>
                <div>
                  <label style="font-size:0.85rem; color:var(--muted);">Mô tả ngắn về game:</label>
                  <textarea id="ag-desc" rows="3" class="custom-textarea" placeholder="Giới thiệu nội dung, lối chơi..."></textarea>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 1rem;">
                  <button type="submit" class="btn-primary" style="flex: 1;">💾 Lưu thông tin Game</button>
                  <button type="button" class="btn-ghost" id="ag-cancel-btn">Hủy bỏ</button>
                </div>
              </form>
            </div>
            <div class="history-table-wrap">
              <table class="custom-table" id="admin-games-table">
                <thead>
                  <tr>
                    <th>Ảnh</th>
                    <th>Tên Game</th>
                    <th>Slug</th>
                    <th>Thể loại</th>
                    <th>Giá</th>
                    <th>Đánh giá</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody id="admin-games-body">
                  <tr><td colspan="7" style="text-align: center; color: var(--muted);">Đang tải danh sách game...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <!-- Tab 3: Quản lý Khách hàng -->
          <div class="tab-pane" id="tab-admin-users">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.2rem; flex-wrap: wrap; gap: 10px;">
              <div>
                <span style="color: var(--muted); font-size: 0.9rem;">Danh sách tài khoản khách hàng, vai trò và quản lý số dư:</span>
              </div>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="text" id="admin-user-search-input" placeholder="🔍 Tìm tên khách hàng..." style="padding: 6px 12px; font-size: 0.85rem; border-radius: 6px; background: rgba(0,0,0,0.2); border: 1px solid var(--border); color: var(--text);" />
              </div>
            </div>

            <!-- Form Hộp thoại Điều chỉnh Số dư (Ẩn mặc định) -->
            <div id="admin-adjust-money-container" class="admin-form-box hidden" style="margin-bottom: 2rem; border-left: 4px solid var(--primary);">
              <h3 style="margin-bottom: 0.6rem; color: var(--primary);">💵 Điều Chỉnh Số Dư Khách Hàng</h3>
              <p style="color: var(--muted); font-size: 0.85rem; margin-bottom: 1.2rem;">
                Tài khoản: <strong id="adj-target-username" style="color: #60a5fa; font-size: 1.05rem;"></strong>
                · Số dư hiện tại: <strong id="adj-target-money" style="color: #facc15; font-size: 1.05rem;">0đ</strong>
              </p>

              <form id="admin-adjust-money-form">
                <input type="hidden" id="adj-username-input" />
                
                <div style="margin-bottom: 1.2rem;">
                  <label style="font-size:0.85rem; color:var(--muted); display: block; margin-bottom: 6px; font-weight: 600;">1. Chọn hình thức điều chỉnh:</label>
                  <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); padding: 8px 14px; border-radius: 8px; font-size: 0.88rem;">
                      <input type="radio" name="adj-action" value="add" checked /> 🟢 <strong>Cộng thêm tiền</strong>
                    </label>
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); padding: 8px 14px; border-radius: 8px; font-size: 0.88rem;">
                      <input type="radio" name="adj-action" value="subtract" /> 🔴 <strong>Trừ bớt tiền</strong>
                    </label>
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; background: rgba(234,179,8,0.1); border: 1px solid rgba(234,179,8,0.3); padding: 8px 14px; border-radius: 8px; font-size: 0.88rem;">
                      <input type="radio" name="adj-action" value="set" /> 🟡 <strong>Đặt lại số dư cụ thể</strong>
                    </label>
                  </div>
                </div>

                <!-- Mệnh giá nhanh -->
                <div style="margin-bottom: 1.2rem;">
                  <label style="font-size:0.85rem; color:var(--muted); display: block; margin-bottom: 6px; font-weight: 600;">2. Chọn nhanh mệnh giá:</label>
                  <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button type="button" class="btn-ghost adj-preset-btn" data-val="10000" style="padding: 5px 12px; font-size: 0.82rem;">+10.000đ</button>
                    <button type="button" class="btn-ghost adj-preset-btn" data-val="20000" style="padding: 5px 12px; font-size: 0.82rem;">+20.000đ</button>
                    <button type="button" class="btn-ghost adj-preset-btn" data-val="50000" style="padding: 5px 12px; font-size: 0.82rem;">+50.000đ</button>
                    <button type="button" class="btn-ghost adj-preset-btn" data-val="100000" style="padding: 5px 12px; font-size: 0.82rem;">+100.000đ</button>
                    <button type="button" class="btn-ghost adj-preset-btn" data-val="500000" style="padding: 5px 12px; font-size: 0.82rem;">+500.000đ</button>
                    <button type="button" class="btn-ghost adj-preset-btn" data-val="0" style="padding: 5px 12px; font-size: 0.82rem; color: #f87171; border-color: rgba(239,68,68,0.4);">❌ Đặt về 0đ (Xóa sạch)</button>
                  </div>
                </div>

                <div class="form-grid-2">
                  <div>
                    <label style="font-size:0.85rem; color:var(--muted); display: block; margin-bottom: 4px; font-weight: 600;">3. Số tiền (VNĐ):</label>
                    <input type="number" id="adj-amount-input" value="50000" min="0" step="1000" required style="font-size: 1.05rem; font-weight: 700; color: #facc15;" />
                  </div>
                  <div>
                    <label style="font-size:0.85rem; color:var(--muted); display: block; margin-bottom: 4px; font-weight: 600;">4. Lý do / Ghi chú giao dịch:</label>
                    <input type="text" id="adj-reason-input" placeholder="Ví dụ: Admin nạp bù / Thưởng sự kiện / Hoàn tiền" />
                  </div>
                </div>

                <div style="display: flex; gap: 10px; margin-top: 1.2rem;">
                  <button type="submit" class="btn-primary" style="padding: 0.6rem 1.6rem;">💾 Xác Nhận Cập Nhật</button>
                  <button type="button" class="btn-ghost" id="adj-cancel-btn">Hủy bỏ</button>
                </div>
              </form>
            </div>

            <!-- Bảng danh sách khách hàng -->
            <div class="history-table-wrap">
              <table class="custom-table" id="admin-users-table">
                <thead>
                  <tr>
                    <th>Tài khoản</th>
                    <th>Vai trò</th>
                    <th>Số dư</th>
                    <th>Game đã mua</th>
                    <th>Giỏ hàng</th>
                    <th style="width: 230px; text-align: center;">Thao tác</th>
                  </tr>
                </thead>
                <tbody id="admin-users-body">
                  <tr><td colspan="6" style="text-align: center; color: var(--muted); padding: 2rem;">Đang tải danh sách khách hàng...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', adminModalHTML);
  }
}

function setupTabs() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    const tabHeader = btn.closest('.custom-tabs');
    if (!tabHeader) return;
    const targetTabId = btn.getAttribute('data-tab');
    if (!targetTabId) return;

    // Xac dinh khung chua tabs (modal-content hoac admin-main-content hoac parent)
    const container = tabHeader.closest('.modal-content') || tabHeader.closest('#admin-main-content') || tabHeader.parentElement || document;

    tabHeader.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    container.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    const targetPane = container.querySelector(`#${targetTabId}`) || document.getElementById(targetTabId);
    if (targetPane) {
      targetPane.classList.add('active');
    }

    // Neu chuyen sang cac tab Admin ma bang chua co du lieu thi tu dong goi tai du lieu
    if (['tab-admin-overview', 'tab-admin-games', 'tab-admin-users'].includes(targetTabId)) {
      if (typeof window.loadAdminData === 'function') {
        const gamesBody = document.getElementById('admin-games-body');
        const usersBody = document.getElementById('admin-users-body');
        const needsLoad = (gamesBody && gamesBody.innerHTML.includes('Đang tải')) ||
                          (usersBody && usersBody.innerHTML.includes('Đang tải'));
        if (needsLoad) {
          window.loadAdminData();
        }
      }
    }
  });
}

function setupProfileModal() {
  document.addEventListener('click', async (e) => {
    const openBtn = e.target.closest('#open-profile-btn');
    if (!openBtn) return;
    e.preventDefault();

    const currentUser = storage.get('currentUser');
    if (!currentUser) return;

    openModal('profile-modal');
    // Set user info
    const nameEl = document.getElementById('profile-user-name');
    const moneyEl = document.getElementById('profile-user-money');
    const roleEl = document.getElementById('profile-user-role');
    const avatarEl = document.getElementById('profile-user-avatar');

    if (nameEl) nameEl.textContent = currentUser.username;
    if (moneyEl) moneyEl.textContent = (currentUser.money || 0).toLocaleString('vi-VN') + 'đ';
    if (roleEl) roleEl.textContent = currentUser.role === 'admin' ? 'Quản trị viên' : 'Thành viên';
    
    if (avatarEl) {
      const avatarText = currentUser.role === 'admin' ? 'Ad' : currentUser.username.charAt(0).toUpperCase();
      avatarEl.src = `https://ui-avatars.com/api/?name=${avatarText}&background=20b2aa&color=fff&rounded=true&bold=true&font-size=0.4`;
    }

    // Fetch user library & transactions
    try {
      const res = await fetch(`${API_URL}/user/library/${currentUser.username}`);
      if (res.ok) {
        const data = await res.json();
        // 1. Library games
        const grid = document.getElementById('profile-library-grid');
        const countEl = document.getElementById('profile-games-count');
        if (countEl) countEl.textContent = (data.purchasedGames || []).length;

        if (grid) {
          if (!data.purchasedGames || data.purchasedGames.length === 0) {
            grid.innerHTML = '<p style="color:var(--muted); text-align:center; padding:2.5rem; grid-column:1/-1;">Bạn chưa sở hữu tựa game nào. Hãy khám phá và mua game nhé!</p>';
          } else {
            grid.innerHTML = data.purchasedGames.map(g => `
              <div class="library-card">
                <img src="${g.img}" alt="${g.name}" />
                <div class="library-card-body">
                  <div class="library-card-title" title="${g.name}">${escapeHtml(g.name)}</div>
                  <div style="display:flex; gap:6px;">
                    <button type="button" class="btn-primary" style="padding:4px 8px; font-size:0.75rem; flex:1;" onclick="window.location.href='${g.slug}.html'">Chơi ngay 🚀</button>
                    <button type="button" class="btn-ghost" style="padding:4px 8px; font-size:0.75rem;" onclick="window.location.href='${g.slug}.html#game-reviews-wrapper'">⭐ Đánh giá</button>
                  </div>
                </div>
              </div>
            `).join('');
          }
        }

        // 2. Transactions
        const txBody = document.getElementById('profile-transactions-body');
        if (txBody) {
          if (!data.transactions || data.transactions.length === 0) {
            txBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--muted); padding:2rem;">Chưa có giao dịch nạp tiền</td></tr>';
          } else {
            txBody.innerHTML = data.transactions.map(t => {
              const dateStr = new Date(t.createdAt || t.transactionDate).toLocaleString('vi-VN');
              const amtStr = `+${(t.transferAmount || 0).toLocaleString('vi-VN')}đ`;
              return `
                <tr>
                  <td>${dateStr}</td>
                  <td><code style="color:var(--primary);">${escapeHtml(t.code || t.referenceCode || 'SePay')}</code></td>
                  <td style="color:#4ade80; font-weight:700;">${amtStr}</td>
                  <td style="font-size:0.8rem; color:var(--muted);">${escapeHtml(t.content || t.description || '')}</td>
                  <td><span style="color:#4ade80; font-size:0.75rem; background:rgba(74,222,128,0.15); padding:2px 6px; border-radius:4px;">Thành công</span></td>
                </tr>
              `;
            }).join('');
          }
        }
      }
    } catch (err) {
      console.error("Lỗi lấy hồ sơ thư viện:", err);
    }
  });

  // Change password form
  document.addEventListener('submit', async (e) => {
    if (e.target && e.target.id === 'change-password-form') {
      e.preventDefault();
      const currentUser = storage.get('currentUser');
      if (!currentUser) return;

      const oldPassword = document.getElementById('cp-old-password').value;
      const newPassword = document.getElementById('cp-new-password').value;
      const confirmPassword = document.getElementById('cp-confirm-password').value;
      const errEl = document.getElementById('cp-error');
      const succEl = document.getElementById('cp-success');
      if (errEl) errEl.textContent = '';
      if (succEl) succEl.textContent = '';

      if (newPassword !== confirmPassword) {
        if (errEl) errEl.textContent = 'Mật khẩu xác nhận không trùng khớp!';
        return;
      }

      try {
        const res = await fetch(`${API_URL}/user/change-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: currentUser.username,
            oldPassword,
            newPassword
          })
        });
        const data = await res.json();
        if (res.ok) {
          if (succEl) succEl.textContent = '✅ Đổi mật khẩu thành công!';
          e.target.reset();
        } else {
          if (errEl) errEl.textContent = data.error || 'Lỗi đổi mật khẩu';
        }
      } catch (err) {
        if (errEl) errEl.textContent = 'Lỗi kết nối máy chủ';
      }
    }
  });
}

let adminChartInstance = null;

function setupAdminDashboard() {
  let cachedAdminUsers = [];

  async function loadAdminData() {
    try {
      const [statsRes, gamesRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/admin/stats`),
        fetch(`${API_URL}/games`),
        fetch(`${API_URL}/admin/users`)
      ]);
      const stats = await statsRes.json();
      const games = await gamesRes.json();
      const users = await usersRes.json();

      // 1. KPI Cards
      const revEl = document.getElementById('kpi-revenue');
      const usersEl = document.getElementById('kpi-users');
      const gamesEl = document.getElementById('kpi-games');
      const purchasesEl = document.getElementById('kpi-purchases');

      if (revEl) revEl.textContent = (stats.totalRevenue || 0).toLocaleString('vi-VN') + 'đ';
      if (usersEl) usersEl.textContent = stats.totalUsers || 0;
      if (gamesEl) gamesEl.textContent = stats.totalGames || games.length;
      if (purchasesEl) purchasesEl.textContent = stats.totalPurchases || 0;

      // 2. Chart.js Doanh thu 7 ngày
      const chartCanvas = document.getElementById('admin-revenue-chart');
      if (chartCanvas && typeof Chart !== 'undefined') {
        const chartData = stats.chartData || [];
        const labels = chartData.map(d => d.date);
        const values = chartData.map(d => d.revenue);

        if (adminChartInstance) {
          adminChartInstance.destroy();
        }

        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        adminChartInstance = new Chart(chartCanvas, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: 'Doanh thu (VNĐ)',
              data: values,
              borderColor: '#8b5cf6',
              backgroundColor: 'rgba(139, 92, 246, 0.15)',
              fill: true,
              tension: 0.35,
              pointBackgroundColor: '#06b6d4',
              pointRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' },
                ticks: {
                  color: isLight ? '#64748b' : '#94a3b8',
                  callback: val => val.toLocaleString('vi-VN') + 'đ'
                }
              },
              x: {
                grid: { display: false },
                ticks: { color: isLight ? '#64748b' : '#94a3b8' }
              }
            }
          }
        });
      }

      // 3. Top Best Sellers
      const bsList = document.getElementById('admin-bestsellers-list');
      if (bsList) {
        if (!stats.bestSellers || stats.bestSellers.length === 0) {
          bsList.innerHTML = '<p style="color:var(--muted); text-align:center; padding:1.5rem;">Chưa có dữ liệu bán hàng</p>';
        } else {
          bsList.innerHTML = stats.bestSellers.map(b => `
            <div class="bestseller-item">
              <img src="${b.img}" alt="${b.name}" />
              <span class="bestseller-title">${escapeHtml(b.name)}</span>
              <span class="bestseller-badge">${b.sales} đã bán</span>
            </div>
          `).join('');
        }
      }

      // 4. Giao dịch gần nhất
      const txBody = document.getElementById('admin-recent-tx-body');
      if (txBody) {
        if (!stats.recentTransactions || stats.recentTransactions.length === 0) {
          txBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--muted);">Chưa có giao dịch</td></tr>';
        } else {
          txBody.innerHTML = stats.recentTransactions.map(t => `
            <tr>
              <td>${new Date(t.createdAt || t.transactionDate).toLocaleString('vi-VN')}</td>
              <td><strong style="color:var(--primary);">${escapeHtml(t.username || 'Khách')}</strong></td>
              <td style="color:#4ade80; font-weight:700;">+${(t.transferAmount || 0).toLocaleString('vi-VN')}đ</td>
              <td><code>${escapeHtml(t.gateway || 'VietQR')}</code></td>
              <td style="font-size:0.8rem; color:var(--muted);">${escapeHtml(t.content || t.description || '')}</td>
            </tr>
          `).join('');
        }
      }

      // 5. Quản lý Game (CRUD)
      renderAdminGamesTable(games);

      // 6. Quản lý Khách hàng (User Management)
      renderAdminUsersTable(users);

    } catch (e) {
      console.error("Lỗi tải admin stats:", e);
    }
  }

  function renderAdminGamesTable(games) {
    const tbody = document.getElementById('admin-games-body');
    if (!tbody) return;

    tbody.innerHTML = games.map(g => `
      <tr>
        <td><img src="${g.img}" alt="${g.name}" style="width:45px; height:25px; object-fit:cover; border-radius:4px;" /></td>
        <td><strong>${escapeHtml(g.name)}</strong></td>
        <td><code>${escapeHtml(g.slug)}</code></td>
        <td style="font-size:0.75rem; color:var(--muted);">${(g.tags || []).join(', ')}</td>
        <td style="color:#facc15; font-weight:700;">${(g.price || 1000).toLocaleString('vi-VN')}đ</td>
        <td>⭐ ${g.ratingAvg || 5.0}</td>
        <td>
          <button type="button" class="btn-ghost edit-game-btn" data-slug="${g.slug}" style="padding:3px 8px; font-size:0.75rem; margin-right:4px;">✏️ Sửa</button>
          <button type="button" class="btn-ghost delete-game-btn" data-slug="${g.slug}" style="padding:3px 8px; font-size:0.75rem; color:#f87171; border-color:rgba(239,68,68,0.3);">🗑️ Xóa</button>
        </td>
      </tr>
    `).join('');

    // Bắt sự kiện Sửa và Xóa
    tbody.querySelectorAll('.edit-game-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const slug = btn.dataset.slug;
        const g = games.find(x => x.slug === slug);
        if (g) openGameForm(true, g);
      });
    });

    tbody.querySelectorAll('.delete-game-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const slug = btn.dataset.slug;
        if (confirm(`Bạn có chắc muốn xóa game "${slug}" khỏi hệ thống?`)) {
          const res = await fetch(`${API_URL}/admin/games/${slug}`, { method: 'DELETE' });
          if (res.ok) {
            showToast(`Đã xóa game ${slug}`);
            if (typeof fetchAllGamesAndTags === 'function') await fetchAllGamesAndTags();
            loadAdminData();
            if (document.getElementById('games-container')) renderGames();
          }
        }
      });
    });
  }

  function renderAdminUsersTable(usersList) {
    cachedAdminUsers = usersList || [];
    const tbody = document.getElementById('admin-users-body');
    if (!tbody) return;

    if (!usersList || usersList.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--muted); padding:2rem;">Chưa có người dùng nào</td></tr>';
      return;
    }

    tbody.innerHTML = usersList.map(u => {
      const isAdmin = u.role === 'admin';
      const roleBadge = isAdmin 
        ? '<span style="background:rgba(234,179,8,0.2); border:1px solid #eab308; color:#facc15; padding:2px 8px; border-radius:4px; font-size:0.75rem; font-weight:700;">Admin</span>'
        : '<span style="background:rgba(59,130,246,0.15); border:1px solid #3b82f6; color:#60a5fa; padding:2px 8px; border-radius:4px; font-size:0.75rem;">User</span>';

      return `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="width:28px; height:28px; border-radius:50%; background:var(--primary); color:white; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.8rem; flex-shrink:0;">
                ${u.username.charAt(0).toUpperCase()}
              </span>
              <strong>${escapeHtml(u.username)}</strong>
            </div>
          </td>
          <td>${roleBadge}</td>
          <td><strong style="color:#facc15; font-size:0.95rem;">${(u.money || 0).toLocaleString('vi-VN')}đ</strong></td>
          <td>${u.purchasedCount || 0} game</td>
          <td>${u.cartCount || 0} món</td>
          <td>
            <div style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
              <button type="button" class="btn-ghost open-adjust-money-btn" data-username="${escapeHtml(u.username)}" data-money="${u.money || 0}" style="padding:3px 8px; font-size:0.75rem; color:#4ade80; border-color:rgba(74,222,128,0.4);" title="Cộng tiền / Trừ tiền">💵 Nạp/Trừ tiền</button>
              ${!isAdmin ? `
                <button type="button" class="btn-ghost set-role-btn" data-username="${escapeHtml(u.username)}" data-role="admin" style="padding:3px 8px; font-size:0.75rem; color:#facc15; border-color:rgba(234,179,8,0.3);" title="Thăng cấp lên Admin">⭐ Set Admin</button>
                <button type="button" class="btn-ghost delete-user-btn" data-username="${escapeHtml(u.username)}" style="padding:3px 8px; font-size:0.75rem; color:#f87171; border-color:rgba(239,68,68,0.3);" title="Xóa tài khoản">🗑️ Xóa</button>
              ` : `
                ${u.username !== 'admin' ? `
                  <button type="button" class="btn-ghost set-role-btn" data-username="${escapeHtml(u.username)}" data-role="user" style="padding:3px 8px; font-size:0.75rem; color:var(--muted);" title="Hạ xuống User">Gỡ Admin</button>
                ` : '<span style="font-size:0.75rem; color:var(--muted); padding:3px 6px;">Mặc định</span>'}
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Bắt sự kiện các nút trong bảng khách hàng
    tbody.querySelectorAll('.open-adjust-money-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const username = btn.dataset.username;
        const money = parseInt(btn.dataset.money) || 0;
        openAdjustMoneyForm(username, money);
      });
    });

    tbody.querySelectorAll('.set-role-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const username = btn.dataset.username;
        const newRole = btn.dataset.role;
        if (confirm(`Bạn có chắc muốn đổi vai trò của "${username}" thành ${newRole.toUpperCase()}?`)) {
          const res = await fetch(`${API_URL}/admin/users/${encodeURIComponent(username)}/change-role`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ role: newRole })
          });
          if (res.ok) {
            showToast(`Đã đổi vai trò ${username} thành ${newRole}`);
            loadAdminData();
          }
        }
      });
    });

    tbody.querySelectorAll('.delete-user-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const username = btn.dataset.username;
        if (confirm(`CẢNH BÁO: Bạn có chắc muốn xóa tài khoản "${username}"?`)) {
          const res = await fetch(`${API_URL}/admin/users/${encodeURIComponent(username)}`, { method: 'DELETE' });
          if (res.ok) {
            showToast(`Đã xóa tài khoản ${username}`);
            loadAdminData();
          } else {
            const data = await res.json();
            alert(data.error || 'Lỗi xóa tài khoản');
          }
        }
      });
    });
  }

  function openAdjustMoneyForm(username, currentMoney) {
    const box = document.getElementById('admin-adjust-money-container');
    if (!box) return;

    box.classList.remove('hidden');
    const uNameEl = document.getElementById('adj-target-username');
    const uMoneyEl = document.getElementById('adj-target-money');
    const uInput = document.getElementById('adj-username-input');
    const aInput = document.getElementById('adj-amount-input');
    const rInput = document.getElementById('adj-reason-input');

    if (uNameEl) uNameEl.textContent = username;
    if (uMoneyEl) uMoneyEl.textContent = currentMoney.toLocaleString('vi-VN') + 'đ';
    if (uInput) uInput.value = username;
    if (aInput) aInput.value = 50000;
    if (rInput) rInput.value = 'Admin nạp thưởng';
    box.scrollIntoView({ behavior: 'smooth' });
  }

  function openGameForm(isEdit, game = null) {
    const formBox = document.getElementById('admin-game-form-container');
    const title = document.getElementById('admin-game-form-title');
    const isEditInput = document.getElementById('ag-is-edit');
    const slugInput = document.getElementById('ag-slug');

    if (!formBox) return;

    formBox.classList.remove('hidden');
    isEditInput.value = isEdit ? '1' : '0';

    if (isEdit && game) {
      title.textContent = `Chỉnh sửa game: ${game.name}`;
      document.getElementById('ag-name').value = game.name || '';
      slugInput.value = game.slug || '';
      slugInput.disabled = true; // Không cho sửa slug khi update
      document.getElementById('ag-img').value = game.img || '';
      document.getElementById('ag-price').value = game.price || 1000;
      document.getElementById('ag-tags').value = (game.tags || []).join(', ');
      document.getElementById('ag-publisher').value = game.publisher || '';
      document.getElementById('ag-desc').value = game.desc || '';
    } else {
      title.textContent = 'Thêm Game Mới';
      document.getElementById('admin-game-form').reset();
      slugInput.disabled = false;
    }
    formBox.scrollIntoView({ behavior: 'smooth' });
  }

  // Delegated event listener cho các nút của Admin modal & trang Admin
  document.addEventListener('click', (e) => {
    const openBtn = e.target.closest('#open-admin-btn');
    if (openBtn) {
      const modal = document.getElementById('admin-modal');
      if (modal) {
        e.preventDefault();
        openModal('admin-modal');
        loadAdminData();
      }
    }

    const refreshBtn = e.target.closest('#admin-refresh-btn, #admin-page-refresh-btn');
    if (refreshBtn) {
      loadAdminData();
    }

    const addBtn = e.target.closest('#admin-add-game-btn');
    if (addBtn) {
      openGameForm(false);
    }

    const cancelBtn = e.target.closest('#ag-cancel-btn');
    if (cancelBtn) {
      const formBox = document.getElementById('admin-game-form-container');
      if (formBox) formBox.classList.add('hidden');
    }

    const adjCancelBtn = e.target.closest('#adj-cancel-btn');
    if (adjCancelBtn) {
      const box = document.getElementById('admin-adjust-money-container');
      if (box) box.classList.add('hidden');
    }

    // Các nút preset mệnh giá nhanh
    const presetBtn = e.target.closest('.adj-preset-btn');
    if (presetBtn) {
      const val = parseInt(presetBtn.dataset.val) || 0;
      const amountInput = document.getElementById('adj-amount-input');
      const reasonInput = document.getElementById('adj-reason-input');
      if (amountInput) amountInput.value = val;
      if (val === 0) {
        const setRadio = document.querySelector('input[name="adj-action"][value="set"]');
        if (setRadio) setRadio.checked = true;
        if (reasonInput) reasonInput.value = 'Admin xóa sạch số dư';
      }
    }
  });

  // Tìm kiếm khách hàng
  document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'admin-user-search-input') {
      const kw = e.target.value.trim().toLowerCase();
      const filtered = cachedAdminUsers.filter(u => u.username.toLowerCase().includes(kw));
      renderAdminUsersTable(filtered);
    }
  });

  // Submit Game form
  document.addEventListener('submit', async (e) => {
    if (e.target && e.target.id === 'admin-game-form') {
      e.preventDefault();
      const isEdit = document.getElementById('ag-is-edit').value === '1';
      const name = document.getElementById('ag-name').value;
      const slug = document.getElementById('ag-slug').value;
      const img = document.getElementById('ag-img').value;
      const price = document.getElementById('ag-price').value;
      const tags = document.getElementById('ag-tags').value;
      const publisher = document.getElementById('ag-publisher').value;
      const desc = document.getElementById('ag-desc').value;

      const bodyData = { name, slug, img, price, tags, publisher, desc };

      try {
        const url = isEdit ? `${API_URL}/admin/games/${slug}` : `${API_URL}/admin/games`;
        const method = isEdit ? 'PUT' : 'POST';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData)
        });

        if (res.ok) {
          showToast(isEdit ? 'Cập nhật game thành công!' : 'Đã thêm game mới!');
          document.getElementById('admin-game-form-container').classList.add('hidden');
          if (typeof fetchAllGamesAndTags === 'function') await fetchAllGamesAndTags();
          loadAdminData();
          if (document.getElementById('games-container')) renderGames();
        } else {
          const errData = await res.json();
          alert(errData.error || 'Lỗi thao tác game');
        }
      } catch (err) {
        alert('Lỗi kết nối máy chủ');
      }
    }

    // Submit Điều chỉnh Số dư khách hàng
    if (e.target && e.target.id === 'admin-adjust-money-form') {
      e.preventDefault();
      const username = document.getElementById('adj-username-input').value;
      const actionRadio = document.querySelector('input[name="adj-action"]:checked');
      const action = actionRadio ? actionRadio.value : 'add';
      const amount = parseInt(document.getElementById('adj-amount-input').value) || 0;
      const reason = document.getElementById('adj-reason-input').value;

      try {
        const res = await fetch(`${API_URL}/admin/users/${encodeURIComponent(username)}/adjust-money`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, amount, reason })
        });
        const data = await res.json();

        if (res.ok) {
          showToast(`🎉 ${data.message}`);
          const box = document.getElementById('admin-adjust-money-container');
          if (box) box.classList.add('hidden');
          loadAdminData();

          // Nếu tài khoản được sửa chính là tài khoản đang đăng nhập
          const curr = storage.get('currentUser', null);
          if (curr && curr.username === username) {
            curr.money = data.newMoney;
            storage.set('currentUser', curr);
            const balanceEl = document.getElementById('user-balance-text');
            if (balanceEl) balanceEl.textContent = data.newMoney.toLocaleString('vi-VN') + 'đ';
          }
        } else {
          alert(data.error || 'Lỗi điều chỉnh số dư');
        }
      } catch (err) {
        alert('Lỗi kết nối máy chủ');
      }
    }
  });

  // Expose ra window de co the goi tu ngoai (vi du admin.html hoac tab clicks)
  window.loadAdminData = loadAdminData;

  // Tu dong tai du lieu neu dang o trang admin.html hoac co bang admin
  if (document.getElementById('admin-games-table') || document.getElementById('admin-users-table') || document.getElementById('admin-main-content')) {
    const u = storage.get('currentUser', null);
    if (u && u.role === 'admin') {
      loadAdminData();
    }
  }
}

/**
 * Hệ thống Nạp tiền VietQR tự động qua SePay
 */
let depositPollingInterval = null;

function setupDepositModal() {
  function getDepositModal() {
    return document.getElementById('deposit-modal');
  }

  function updateQR(amount) {
    const modal = getDepositModal();
    if (!modal) return;
    const user = storage.get('currentUser');
    if (!user) return;

    const qrImg = modal.querySelector('#vietqr-image');
    const amountText = modal.querySelector('#qr-amount-text');
    const contentText = modal.querySelector('#qr-content-text');

    const safeAmount = Math.max(1000, parseInt(amount) || 10000);
    const memo = `NAP ${user.username.toUpperCase()}`;

    // Cấu hình thông tin TPBank
    const bankId = 'TPB'; // Mã ngân hàng TPBank chuẩn Napas
    const accountNo = '00000540786';
    const accountName = 'LE TRIEU DAI';
    const template = 'compact2';

    // Tạo link ảnh VietQR chuẩn Napas 247
    const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${safeAmount}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(accountName)}`;
    
    if (qrImg) qrImg.src = qrUrl;
    if (amountText) amountText.textContent = safeAmount.toLocaleString('vi-VN') + 'đ';
    if (contentText) contentText.textContent = memo;
  }

  // Bắt sự kiện toàn cục: Click nút Nạp tiền, Nút preset, Nút đóng (X)
  document.addEventListener('click', (e) => {
    // 1. Mở hoặc Đóng modal nạp tiền (Toggle khi bấm nút "+ Nạp tiền")
    if (e.target && e.target.closest('#open-deposit-btn')) {
      const user = storage.get('currentUser');
      if (!user) {
        openModal('login-modal');
        return;
      }

      const modal = getDepositModal();
      if (modal && !modal.classList.contains('hidden')) {
        // Nếu modal nạp tiền ĐANG MỞ -> Bấm lại nút này sẽ ĐÓNG
        closeModal('deposit-modal');
        stopDepositPolling();
        return;
      }

      // Nếu đang đóng -> MỞ ra
      openModal('deposit-modal');
      const customInput = modal ? modal.querySelector('#custom-deposit-amount') : null;
      const initialAmount = customInput ? (customInput.value || 10000) : 10000;
      updateQR(initialAmount);

      // Bắt đầu lắng nghe biến động số dư tự động (Polling mỗi 2 giây)
      startDepositPolling(user.username);
      return;
    }

    // 2. Nhấn nút đóng (dấu X) của modal nạp tiền
    if (e.target && (e.target.closest('#deposit-modal .close') || e.target.getAttribute('data-close') === 'deposit-modal')) {
      closeModal('deposit-modal');
      stopDepositPolling();
      return;
    }

    // 3. Chọn các nút mệnh giá có sẵn trong modal nạp tiền
    const presetBtn = e.target.closest('.deposit-preset-btn');
    if (presetBtn) {
      const modal = getDepositModal();
      if (!modal) return;
      const allPresets = modal.querySelectorAll('.deposit-preset-btn');
      allPresets.forEach(b => {
        b.style.background = 'rgba(255,255,255,0.08)';
        b.style.borderColor = 'var(--border)';
        b.style.color = 'var(--text)';
        b.style.fontWeight = 'normal';
      });
      presetBtn.style.background = 'var(--primary)';
      presetBtn.style.borderColor = 'var(--primary)';
      presetBtn.style.color = 'white';
      presetBtn.style.fontWeight = '600';

      const amount = presetBtn.getAttribute('data-amount');
      const customInput = modal.querySelector('#custom-deposit-amount');
      if (customInput) customInput.value = amount;
      updateQR(amount);
      return;
    }
  });

  // Bắt sự kiện gõ số tiền tùy ý
  document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'custom-deposit-amount') {
      const modal = getDepositModal();
      if (!modal) return;
      const allPresets = modal.querySelectorAll('.deposit-preset-btn');
      allPresets.forEach(b => {
        b.style.background = 'rgba(255,255,255,0.08)';
        b.style.borderColor = 'var(--border)';
        b.style.color = 'var(--text)';
        b.style.fontWeight = 'normal';
      });
      updateQR(e.target.value);
    }
  });
}

function startDepositPolling(username) {
  stopDepositPolling();
  const initialUser = storage.get('currentUser');
  const initialMoney = initialUser ? (initialUser.money || 0) : 0;

  depositPollingInterval = setInterval(async () => {
    try {
      const res = await fetch(`${API_URL}/user/balance/${encodeURIComponent(username)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.money > initialMoney) {
          // Tiền đã được cộng qua SePay Webhook!
          stopDepositPolling();
          
          // Cập nhật session và giao diện
          const u = storage.get('currentUser');
          if (u) {
            u.money = data.money;
            storage.set('currentUser', u);
          }
          await renderHeader();
          closeModal('deposit-modal');
          showToast(`🎉 Nạp thành công +${(data.money - initialMoney).toLocaleString('vi-VN')}đ vào tài khoản!`);
        }
      }
    } catch(err) {
      console.error('Lỗi kiểm tra số dư:', err);
    }
  }, 2000);
}

function stopDepositPolling() {
  if (depositPollingInterval) {
    clearInterval(depositPollingInterval);
    depositPollingInterval = null;
  }
}

/**
 * ===================================================
 * HỆ THỐNG TRỢ LÝ AI TƯ VẤN GAME (KẾT NỐI n8n)
 * ===================================================
 */
const N8N_CHAT_URL = 'http://localhost:5678/webhook/chat-ai';

function setupAIChatWidget() {
  // 1. Tự động chèn HTML của Chatbot vào trang nếu chưa có (dành cho các trang game lẻ)
  if (!document.getElementById('ai-chat-btn')) {
    const chatHTML = `
      <div id="ai-chat-btn" title="Trợ lý AI tư vấn game">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </div>
      
      <div id="ai-chat-box" class="hidden">
        <div class="ai-chat-header">
          <div class="ai-chat-title">
            <span class="ai-chat-status"></span>
            <strong>Trợ lý GameStore AI</strong>
          </div>
          <button class="ai-chat-close" id="ai-chat-close-btn">&times;</button>
        </div>

        <div class="ai-chat-messages" id="ai-chat-messages">
          <div class="ai-msg bot">
            👋 Xin chào! Tôi là Trợ lý AI của GameStore. Bạn đang tìm thể loại game nào (kinh dị, sinh tồn, thế giới mở...) để tôi tư vấn cho bạn nhé?
          </div>
        </div>

        <form class="ai-chat-input-area" id="ai-chat-form">
          <input type="text" id="ai-chat-input" class="ai-chat-input" placeholder="Hỏi tôi bất cứ điều gì về game..." autocomplete="off" required />
          <button type="submit" class="ai-chat-send" id="ai-chat-send-btn">➤</button>
        </form>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', chatHTML);
  }

  const chatBtn = document.getElementById('ai-chat-btn');
  const chatBox = document.getElementById('ai-chat-box');
  const closeBtn = document.getElementById('ai-chat-close-btn');
  const chatForm = document.getElementById('ai-chat-form');
  const chatInput = document.getElementById('ai-chat-input');
  const chatMessages = document.getElementById('ai-chat-messages');

  // Bật/Tắt chatbox
  chatBtn.addEventListener('click', () => {
    chatBox.classList.toggle('hidden');
    if (!chatBox.classList.contains('hidden')) {
      chatInput.focus();
    }
  });

  closeBtn.addEventListener('click', () => {
    chatBox.classList.add('hidden');
  });

  // Nút "Hỏi trợ lý AI" trên banner trang chủ
  const heroAiBtn = document.getElementById('hero-ai-btn');
  if (heroAiBtn) {
    heroAiBtn.addEventListener('click', () => {
      chatBox.classList.remove('hidden');
      chatInput.focus();
    });
  }

  // Gửi tin nhắn
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (!message || chatInput.disabled) return;

    const sendBtn = document.getElementById('ai-chat-send-btn');
    chatInput.disabled = true;
    if (sendBtn) sendBtn.disabled = true;

    // Hiển thị tin nhắn người dùng
    appendMessage(message, 'user');
    chatInput.value = '';

    // Hiển thị bong bóng typing...
    const typingEl = showTypingIndicator();

    try {
      const user = storage.get('currentUser', null);
      const res = await fetch(N8N_CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          username: user ? user.username : 'khach_hang'
        })
      });

      typingEl.remove();

      if (res.ok) {
        const data = await res.json();
        // Lấy câu trả lời (hỗ trợ cả reply, output hoặc text)
        const reply = data.reply || data.output || data.text || (typeof data === 'string' ? data : 'Rất tiếc, tôi chưa thể trả lời lúc này.');
        appendMessage(reply, 'bot');
      } else {
        appendMessage('⚠️ Xin lỗi, máy chủ AI đang bận hoặc n8n chưa bật chế độ Test/Active. Vui lòng thử lại sau!', 'bot');
      }
    } catch (err) {
      typingEl.remove();
      console.error('Lỗi gọi n8n AI:', err);
      appendMessage('❌ Lỗi kết nối đến n8n. Bạn hãy kiểm tra xem n8n đã bấm "Listen for test event" hoặc Active chưa nhé!', 'bot');
    } finally {
      chatInput.disabled = false;
      if (sendBtn) sendBtn.disabled = false;
      chatInput.focus();
    }
  });

  function appendMessage(text, sender) {
    const msg = document.createElement('div');
    msg.className = `ai-msg ${sender}`;
    // Format markdown đơn giản (in đậm, xuống dòng)
    msg.innerHTML = formatChatText(text);
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function showTypingIndicator() {
    const typing = document.createElement('div');
    typing.className = 'ai-chat-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    chatMessages.appendChild(typing);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return typing;
  }

  function formatChatText(text) {
    if (!text) return '';
    return text
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  }
}

async function initApp() {
  try { await renderHeader(); } catch (e) { console.error('Loi renderHeader:', e); }
  try { await renderTagsDropdown(); } catch (e) { console.error('Loi renderTagsDropdown:', e); }
  
  const urlParams = new URLSearchParams(window.location.search);
  const tagFilter = urlParams.get('tag');
  const searchFilter = urlParams.get('search');
  
  if (document.getElementById('games-container')) {
    try { await renderGames(tagFilter, searchFilter); } catch (e) { console.error('Loi renderGames:', e); }
  }

  try { await renderGameDetailTags(); } catch (e) { console.error('Loi renderGameDetailTags:', e); }
  try { bindEvents(); } catch (e) { console.error('Loi bindEvents:', e); }
  try { setupDepositModal(); } catch (e) { console.error('Loi setupDepositModal:', e); }
  try { setupAIChatWidget(); } catch (e) { console.error('Loi setupAIChatWidget:', e); }
  try { setupOutsideClick(); } catch (e) { console.error('Loi setupOutsideClick:', e); }
  try { setupTabs(); } catch (e) { console.error('Loi setupTabs:', e); }
  try { setupProfileModal(); } catch (e) { console.error('Loi setupProfileModal:', e); }
  try { setupAdminDashboard(); } catch (e) { console.error('Loi setupAdminDashboard:', e); }
}

document.addEventListener('DOMContentLoaded', initApp);


