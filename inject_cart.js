const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

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

const toastHTML = `\n    <div id="toast-notification" class="toast-hidden">Đã thêm vào giỏ hàng</div>\n`;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf-8');
    if (!content.includes('cart-container')) {
        content = content.replace('<div class="user-panel hidden" id="user-panel">', cartHTML + '\n            <div class="user-panel hidden" id="user-panel">');
    }
    if (!content.includes('toast-notification')) {
        content = content.replace('</body>', toastHTML + '</body>');
    }
    fs.writeFileSync(file, content, 'utf-8');
}
console.log('Đã thêm HTML giỏ hàng và Toast vào tất cả các file HTML');
