// script.js - Core interactivity for Game Store web app

const API_URL = 'http://localhost:3000/api';

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

  // Inject Cart HTML if not exists
  let cartContainer = document.getElementById('cart-container');
  if (!cartContainer && document.querySelector('.nav-links')) {
    const cartHTML = `
      <div id="user-balance-container" class="hidden" style="margin-right: 15px; font-weight: 600; color: var(--primary);">
          <span id="user-balance-text">0đ</span>
      </div>
      <div id="cart-container" class="hidden" style="margin-right: 20px; position: relative; cursor: pointer; display: flex; align-items: center;">
          <span id="cart-icon" style="font-size: 1.5rem;">🛒</span>
          <span id="cart-badge" style="position:absolute; top:-5px; right:-10px; background:red; color:white; border-radius:50%; padding: 2px 6px; font-size:0.7rem; display:none;">0</span>
          <div id="cart-dropdown" class="hidden" style="position:absolute; top:35px; right:0; width: 300px; background:var(--card-bg); border:1px solid var(--border); border-radius:8px; padding:10px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); z-index: 100; cursor: default;">
              <h4 style="margin-bottom: 10px; border-bottom: 1px solid var(--border); padding-bottom: 5px;">Giỏ hàng</h4>
              <div id="cart-items" style="max-height: 300px; overflow-y: auto;"></div>
              <button id="checkout-btn" style="width:100%; padding:8px; margin-top:10px; background:var(--primary); color:white; border:none; border-radius:4px; cursor:pointer; font-weight: 600;">Thanh toán</button>
          </div>
      </div>`;
    document.querySelector('.nav-links').insertAdjacentHTML('afterbegin', cartHTML);
    
    // Bind hover event for cart
    const cCont = document.getElementById('cart-container');
    const cDD = document.getElementById('cart-dropdown');
    cCont.addEventListener('mouseenter', () => cDD.classList.remove('hidden'));
    cCont.addEventListener('mouseleave', () => cDD.classList.add('hidden'));

    // Bind checkout btn
    document.getElementById('checkout-btn').addEventListener('click', async () => {
        const u = storage.get('currentUser');
        if (!u) return;
        const res = await fetch(`${API_URL}/checkout`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({username: u.username}) });
        const data = await res.json();
        if (res.ok) {
            storage.set('currentUser', data.user);
            await renderHeader();
            await renderGameDetailTags();
            showToast('Thanh toán thành công!');
        } else {
            alert(data.error || 'Lỗi thanh toán');
        }
    });
  }

  // Inject Toast HTML
  if (!document.getElementById('toast-notification')) {
    document.body.insertAdjacentHTML('beforeend', '<div id="toast-notification" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 15px 25px; border-radius: 8px; z-index: 9999; font-size: 1.2rem; pointer-events: none; opacity: 0; transition: opacity 0.3s;"></div>');
  }

  const registerBtn = document.getElementById('register-btn');
  const loginBtn = document.getElementById('login-btn');
  const userPanel = document.getElementById('user-panel');

  if (currentUser) {
    registerBtn.classList.add('hidden');
    loginBtn.classList.add('hidden');
    userPanel.classList.remove('hidden');
    
    let avatarText = currentUser.username.charAt(0).toUpperCase();
    if (currentUser.role === 'admin') avatarText = 'Ad';
    document.getElementById('user-avatar').src = `https://ui-avatars.com/api/?name=${avatarText}&background=20b2aa&color=fff&rounded=true&bold=true&font-size=0.4`;
    
    const balanceCont = document.getElementById('user-balance-container');
    const cartCont = document.getElementById('cart-container');
    if (balanceCont && cartCont) {
        if (currentUser.role === 'admin') {
            balanceCont.classList.add('hidden');
            cartCont.classList.add('hidden');
        } else {
            balanceCont.classList.remove('hidden');
            cartCont.classList.remove('hidden');
            document.getElementById('user-balance-text').textContent = (currentUser.money || 0).toLocaleString('vi-VN') + 'đ';
            updateCartUI(currentUser.cart || []);
        }
    }
  } else {
    registerBtn.classList.remove('hidden');
    loginBtn.classList.remove('hidden');
    userPanel.classList.add('hidden');
    
    const balanceCont = document.getElementById('user-balance-container');
    const cartCont = document.getElementById('cart-container');
    if(balanceCont) balanceCont.classList.add('hidden');
    if(cartCont) cartCont.classList.add('hidden');
  }
}

async function updateCartUI(cartSlugs) {
    const badge = document.getElementById('cart-badge');
    const itemsCont = document.getElementById('cart-items');
    if (!badge || !itemsCont) return;
    
    if (cartSlugs.length > 0) {
        badge.style.display = 'block';
        badge.textContent = cartSlugs.length;
    } else {
        badge.style.display = 'none';
    }
    
    itemsCont.innerHTML = '';
    if (cartSlugs.length === 0) {
        itemsCont.innerHTML = '<p style="color:var(--muted); text-align:center;">Giỏ hàng trống</p>';
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/games`);
        const games = await res.json();
        
        cartSlugs.forEach(slug => {
            const game = games.find(g => g.slug === slug);
            if (game) {
                const row = document.createElement('div');
                row.style.display = 'flex';
                row.style.alignItems = 'center';
                row.style.marginBottom = '10px';
                row.style.borderBottom = '1px solid hsla(0,0%,100%,0.1)';
                row.style.paddingBottom = '5px';
                
                row.innerHTML = `
                    <img src="${game.img}" style="width: 40px; height: 30px; object-fit: cover; border-radius: 4px; margin-right: 10px;">
                    <div style="flex: 1; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${game.name}</div>
                    <button class="remove-cart-btn" data-slug="${slug}" style="background: none; border: none; color: red; font-weight: bold; cursor: pointer; padding: 0 5px; font-size: 1.2rem;">-</button>
                `;
                itemsCont.appendChild(row);
            }
        });
        
        document.querySelectorAll('.remove-cart-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const slug = e.target.getAttribute('data-slug');
                const currentUser = storage.get('currentUser');
                const res = await fetch(`${API_URL}/cart/remove`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({username: currentUser.username, slug})
                });
                if (res.ok) {
                    const updatedUser = await res.json();
                    storage.set('currentUser', updatedUser);
                    renderHeader();
                    renderGameDetailTags();
                }
            });
        });
    } catch(e){}
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

    if (tagDD && nav && !nav.contains(e.target) && !tagDD.contains(e.target)) {
      tagDD.classList.add('hidden');
    }
    if (userDD && userP && !userP.contains(e.target) && !userDD.contains(e.target)) {
      userDD.classList.add('hidden');
    }
  });
}

async function renderGames(filterTag = null, searchQuery = null) {
  const container = document.getElementById('games-container');
  if (!container) return;
  
  try {
    const response = await fetch(`${API_URL}/games`);
    const games = await response.json();
    
    container.innerHTML = '';
    let filtered = filterTag ? games.filter(g => g.tags.includes(filterTag)) : games;
    
    // Sắp xếp kết quả tìm kiếm lên đầu
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matches = [];
      const nonMatches = [];
      filtered.forEach(g => {
        if (g.name.toLowerCase().includes(query)) {
          matches.push(g);
        } else {
          nonMatches.push(g);
        }
      });
      filtered = [...matches, ...nonMatches];
    }
    
    filtered.forEach(game => {
      const card = document.createElement('div');
      card.className = 'game-card';
      const img = document.createElement('img');
      img.src = game.img;
      const title = document.createElement('h3');
      title.textContent = game.name;
      card.appendChild(img);
      card.appendChild(title);
  
      card.addEventListener('click', () => {
        window.location.href = `${game.slug}.html`;
      });
      container.appendChild(card);
    });
  } catch (error) {
    console.error("Lỗi lấy games:", error);
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
      body: JSON.stringify({ username, password })
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
            newBtn.textContent = '10.000đ';
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

  } catch (error) {
    console.error("Lỗi tải chi tiết game:", error);
  }
}

async function initApp() {
  await renderHeader();
  await renderTagsDropdown();
  
  const urlParams = new URLSearchParams(window.location.search);
  const tagFilter = urlParams.get('tag');
  const searchFilter = urlParams.get('search');
  
  if (document.getElementById('games-container')) {
    await renderGames(tagFilter, searchFilter);
  }

  await renderGameDetailTags();
  bindEvents();
  setupOutsideClick();
}

document.addEventListener('DOMContentLoaded', initApp);

