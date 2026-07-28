const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

const searchHTML = `            <div class="search-container" id="search-container">
                <span class="search-icon" id="search-icon">🔍</span>
                <input type="text" id="search-input" class="search-input hidden" placeholder="Tìm kiếm game..." />
            </div>
        </div>`;

let count = 0;
for (const file of files) {
    let content = fs.readFileSync(file, 'utf-8');
    if (!content.includes('search-container')) {
        const target = '</div>\\r?\\n\\s*</div>\\r?\\n\\s*<nav class="nav-links">';
        const regex = new RegExp(target);
        
        if (regex.test(content)) {
            content = content.replace(regex, '</div>\n' + searchHTML + '\n\n        <nav class="nav-links">');
            fs.writeFileSync(file, content, 'utf-8');
            count++;
        }
    }
}
console.log('Injected search into ' + count + ' files');
