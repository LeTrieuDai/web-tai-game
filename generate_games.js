// generate_games.js - Tạo trang chi tiết HTML cho các game trong games_data.js
// Chạy: node generate_games.js   (bỏ qua file đã tồn tại, thêm --force để ghi đè)
const fs = require('fs');
const path = require('path');
const { extraGames, steamImg } = require('./games_data');

const force = process.argv.includes('--force');

const esc = (s) => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function buildPage(g) {
    return `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(g.name)} - Game Store</title>
    <link rel="stylesheet" href="style.css" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet" />
</head>
<body>
    <header id="main-header">
        <div class="header-left">
            <a href="index.html" class="logo">GameStore</a>
            <div class="games-nav" id="games-nav-item">
                <span class="nav-item">Thể loại</span>
                <div class="tags-dropdown hidden" id="tags-dropdown"></div>
            </div>
            <div class="search-container" id="search-container">
                <span class="search-icon" id="search-icon">🔍</span>
                <input type="text" id="search-input" class="search-input hidden" placeholder="Tìm kiếm game..." />
            </div>
        </div>

        <nav class="nav-links">
            <a href="index.html#register" id="register-btn">Đăng ký</a>
            <a href="index.html#login" id="login-btn">Đăng nhập</a>
        </nav>
        <div class="user-panel hidden" id="user-panel">
            <img src="avatar.png" alt="User" class="avatar" id="user-avatar" />
            <div class="user-dropdown hidden" id="user-dropdown">
                <a href="#" id="logout-btn">Đăng xuất</a>
            </div>
        </div>
    </header>

    <main class="game-detail-container" data-slug="${g.slug}">
        <div class="game-detail-layout">
            <!-- Section mô tả chính (Bên trái - 7) -->
            <section class="game-main-section">
                <div class="game-detail-header">
                    <h1>${esc(g.name)}</h1>
                </div>

                <div class="game-image-large">
                    <img src="${steamImg(g.appId)}" alt="${esc(g.name)}" />
                </div>

                <div class="game-description-box">
                    <h3>Mô tả game</h3>
                    <p>${esc(g.desc)}</p>

                    <button class="download-btn-large" onclick="downloadGame('${esc(g.name).replace(/'/g, "\\'")}')">Tải Game Ngay</button>
                </div>
            </section>

            <!-- Section thông tin phụ (Bên phải - 3) -->
            <section class="game-info-section">
                <h3 class="info-section-title">Thông tin game</h3>

                <div class="info-item">
                    <h4>Nhà phát hành</h4>
                    <p>${esc(g.publisher)}</p>
                </div>

                <div class="info-item">
                    <h4>Ngày phát hành</h4>
                    <p>${esc(g.release)}</p>
                </div>

                <div class="info-item">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                        <h4 style="margin: 0;">Thể loại</h4>
                        <span id="add-tag-to-game-btn" title="Thêm thể loại từ CSDL" style="cursor: pointer; color: var(--primary); font-size: 1.5rem; font-weight: bold; line-height: 1; display: none;">+</span>
                    </div>
                    <div class="game-tags" id="detail-game-tags">
                        <!-- Sẽ được render bởi JS -->
                    </div>
                </div>
            </section>
        </div>
    </main>

    <script src="script.js"></script>
</body>
</html>
`;
}

let created = 0, skipped = 0;
for (const g of extraGames) {
    const file = path.join(__dirname, `${g.slug}.html`);
    if (fs.existsSync(file) && !force) {
        skipped++;
        continue;
    }
    fs.writeFileSync(file, buildPage(g), 'utf8');
    created++;
    console.log(`✅ Đã tạo ${g.slug}.html`);
}
console.log(`Hoàn tất: tạo ${created} trang, bỏ qua ${skipped} trang đã có.`);
