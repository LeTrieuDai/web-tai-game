const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { extraGames, steamImg } = require('./games_data');

const SALT_ROUNDS = 10;
const isHashed = (pw) => typeof pw === 'string' && /^\$2[aby]\$\d{2}\$/.test(pw);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Giúp truy cập thẳng được file index.html qua cổng 3000

// 1. KẾT NỐI DATABASE
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gamestore')
    .then(() => {
        console.log('✅ Đã kết nối thành công với MongoDB');
        seedData(); // Gọi hàm tạo dữ liệu mẫu
    })
    .catch(err => console.error('❌ Lỗi kết nối MongoDB:', err));

// 2. TẠO SCHEMA & MODEL
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' }, // 'admin' hoặc 'user'
    money: { type: Number, default: 0 },
    cart: [{ type: String }],
    purchased: [{ type: String }],
    wishlist: [{ type: String }],
    theme: { type: String, enum: ['dark', 'light'], default: 'dark' } // Giao diện sáng/tối riêng của từng user
});
const User = mongoose.model('User', userSchema);

// Dữ liệu user trả về cho frontend (không bao gồm mật khẩu)
function publicUser(u) {
    return {
        username: u.username,
        role: u.role,
        money: u.money,
        cart: u.cart || [],
        purchased: u.purchased || [],
        wishlist: u.wishlist || [],
        theme: u.theme || 'dark'
    };
}

const transactionSchema = new mongoose.Schema({
    gateway: String,
    transactionDate: String,
    accountNumber: String,
    code: String,
    content: String,
    transferType: String,
    transferAmount: Number,
    accumulated: Number,
    subAccount: String,
    referenceCode: String,
    description: String,
    username: String,
    createdAt: { type: Date, default: Date.now }
});
const Transaction = mongoose.model('Transaction', transactionSchema);

const gameSchema = new mongoose.Schema({
    name: String,
    slug: { type: String, unique: true },
    img: String,
    tags: [String],
    ratingAvg: { type: Number, default: 5 },
    ratingCount: { type: Number, default: 0 },
    price: { type: Number, default: 1000 },
    desc: { type: String, default: '' },
    publisher: { type: String, default: '' },
    release: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});
const Game = mongoose.model('Game', gameSchema);

const reviewSchema = new mongoose.Schema({
    gameSlug: { type: String, required: true },
    username: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const Review = mongoose.model('Review', reviewSchema);

const tagSchema = new mongoose.Schema({
    name: { type: String, unique: true }
});
const Tag = mongoose.model('Tag', tagSchema);

// 3. TẠO DỮ LIỆU MẪU (SEEDING) - Chạy 1 lần đầu tiên
async function seedData() {
    try {
        const userCount = await User.countDocuments();
        if (userCount === 0) {
            await User.create({ username: 'admin', password: await bcrypt.hash('123', SALT_ROUNDS), role: 'admin' });
            console.log('🌱 Đã tạo tài khoản admin mặc định.');
        }

        // Chuyển mật khẩu cũ (đang lưu dạng chữ thường) sang dạng mã hóa bcrypt
        const users = await User.find({}, 'username password');
        let migrated = 0;
        for (const u of users) {
            if (!isHashed(u.password)) {
                u.password = await bcrypt.hash(u.password, SALT_ROUNDS);
                await u.save();
                migrated++;
            }
        }
        if (migrated > 0) console.log(`🔐 Đã mã hóa mật khẩu cho ${migrated} tài khoản cũ.`);

        const tagCount = await Tag.countDocuments();
        if (tagCount === 0) {
            const defaultTags = ['Kinh dị', 'Sinh tồn', 'Khám phá', 'Giải đố'];
            await Tag.insertMany(defaultTags.map(t => ({ name: t })));
            console.log('🌱 Đã tạo danh sách thể loại mặc định.');
        }

        // Xóa các game không còn file HTML khỏi DB
        const removedSlugs = ['silent_hill', 'minecraft'];
        for (const slug of removedSlugs) {
            const deleted = await Game.deleteOne({ slug });
            if (deleted.deletedCount > 0) console.log(`🗑️ Đã xóa game cũ: ${slug}`);
        }

        const allGames = [
            { name: 'Outlast',           slug: 'outlast',           img: 'https://cdn.akamai.steamstatic.com/steam/apps/238320/header.jpg',   tags: ['Kinh dị'] },
            { name: 'Grand Theft Auto V',slug: 'gta_v',             img: 'https://cdn.akamai.steamstatic.com/steam/apps/271590/header.jpg',   tags: ['Khám phá'] },
            { name: 'The Witcher 3',     slug: 'witcher_3',         img: 'https://cdn.akamai.steamstatic.com/steam/apps/292030/header.jpg',   tags: ['Khám phá'] },
            { name: 'Resident Evil 4',   slug: 're4',               img: 'https://cdn.akamai.steamstatic.com/steam/apps/2050650/header.jpg',  tags: ['Kinh dị'] },
            { name: 'Limbo',             slug: 'limbo',             img: 'https://cdn.akamai.steamstatic.com/steam/apps/48000/header.jpg',    tags: ['Giải đố', 'Kinh dị'] },
            { name: 'Subnautica',        slug: 'subnautica',        img: 'https://cdn.akamai.steamstatic.com/steam/apps/264710/header.jpg',   tags: ['Sinh tồn', 'Khám phá'] },
            { name: 'Little Nightmares', slug: 'little_nightmares', img: 'https://cdn.akamai.steamstatic.com/steam/apps/424840/header.jpg',   tags: ['Kinh dị', 'Giải đố'] },
            { name: 'Terraria',          slug: 'terraria',          img: 'https://cdn.akamai.steamstatic.com/steam/apps/105600/header.jpg',   tags: ['Sinh tồn', 'Khám phá'] },
            { name: 'The Room',          slug: 'the_room',          img: 'https://cdn.akamai.steamstatic.com/steam/apps/288160/header.jpg',   tags: ['Giải đố'] },
            { name: 'The Forest',        slug: 'the_forest',        img: 'https://cdn.akamai.steamstatic.com/steam/apps/242760/header.jpg',   tags: ['Sinh tồn', 'Khám phá'] },
            { name: 'Portal',            slug: 'portal',            img: 'https://cdn.akamai.steamstatic.com/steam/apps/400/header.jpg',      tags: ['Giải đố'] },
            { name: 'Cyberpunk 2077',    slug: 'cyberpunk_2077',    img: 'https://cdn.akamai.steamstatic.com/steam/apps/1091500/header.jpg',  tags: ['Khám phá'] },
            { name: 'Sekiro',            slug: 'sekiro',            img: 'https://cdn.akamai.steamstatic.com/steam/apps/814380/header.jpg',   tags: ['Khám phá', 'Kinh dị'] },
            { name: 'Hollow Knight',     slug: 'hollow_knight',     img: 'https://cdn.akamai.steamstatic.com/steam/apps/367520/header.jpg',   tags: ['Khám phá', 'Giải đố'] },
            { name: 'Stardew Valley',    slug: 'stardew_valley',    img: 'https://cdn.akamai.steamstatic.com/steam/apps/413150/header.jpg',   tags: ['Sinh tồn', 'Khám phá'] },
            // 20 game bổ sung (dữ liệu trong games_data.js)
            ...extraGames.map(g => ({ name: g.name, slug: g.slug, img: steamImg(g.appId), tags: g.tags })),
        ];

        // Đảm bảo mọi thể loại mà game sử dụng đều có trong danh sách Tag hệ thống
        const usedTags = [...new Set(allGames.flatMap(g => g.tags))];
        for (const t of usedTags) {
            await Tag.updateOne({ name: t }, { $setOnInsert: { name: t } }, { upsert: true });
        }

        // Thêm từng game nếu chưa có (không xóa data cũ)
        let added = 0;
        for (const game of allGames) {
            const exists = await Game.findOne({ slug: game.slug });
            if (!exists) {
                await Game.create(game);
                added++;
            }
        }
        const reviewCount = await Review.countDocuments();
        if (reviewCount === 0) {
            const sampleReviews = [
                { gameSlug: 'elden_ring', username: 'GamerPro', rating: 5, comment: 'Siêu phẩm hay nhất từng chơi, đồ họa và độ khó đỉnh cao!' },
                { gameSlug: 'elden_ring', username: 'SoulHunter', rating: 5, comment: 'Đánh trùm Malenia mất 3 ngày mới qua nhưng cực kỳ thỏa mãn.' },
                { gameSlug: 'rdr2', username: 'ArthurFan', rating: 5, comment: 'Cốt truyện cảm động đến rơi nước mắt, chi tiết đến từng ngọn cỏ.' },
                { gameSlug: 'hades', username: 'RoguelikeFan', rating: 5, comment: 'Gameplay cuốn hút, nhạc nền sôi động, chết không nản.' },
                { gameSlug: 'outlast', username: 'HorrorLover', rating: 5, comment: 'Chơi mà giật bắn tim, không dành cho người yếu tim!' },
                { gameSlug: 'gta_v', username: 'Franklin99', rating: 5, comment: 'Thế giới mở sống động, quẩy cùng bạn bè rất vui.' },
                { gameSlug: 'witcher_3', username: 'GeraltRivia', rating: 5, comment: '10/10 không có điểm trừ, thế giới quá hoành tráng.' },
                { gameSlug: 'subnautica', username: 'DiverDeep', rating: 4, comment: 'Vừa thư giãn vừa sợ hãi biển sâu, xây căn cứ rất chill.' },
                { gameSlug: 'hollow_knight', username: 'BugKnight', rating: 5, comment: 'Metroidvania tuyệt tác, bản đồ rộng lớn và bí ẩn.' },
                { gameSlug: 'stardew_valley', username: 'FarmerChill', rating: 5, comment: 'Game nông trại chữa lành tâm hồn, chơi mãi không chán.' }
            ];
            await Review.insertMany(sampleReviews);
            for (const r of sampleReviews) {
                const reviews = await Review.find({ gameSlug: r.gameSlug });
                const avg = reviews.reduce((s, x) => s + x.rating, 0) / reviews.length;
                await Game.updateOne({ slug: r.gameSlug }, { ratingAvg: Math.round(avg * 10) / 10, ratingCount: reviews.length });
            }
            console.log('🌱 Đã tạo đánh giá mẫu.');
        }

        if (added > 0) console.log(`🌱 Đã bổ sung ${added} game vào database.`);
        else console.log('✅ Database đã có đủ game, bỏ qua seed.');

    } catch (err) {
        console.error('Lỗi khi seed data:', err);
    }
}

// 4. CÁC API CHO FRONTEND GỌI ĐẾN

// Lấy danh sách thể loại (Global Tags)
app.get('/api/tags', async (req, res) => {
    const tags = await Tag.find();
    res.json(tags.map(t => t.name));
});

// Admin tạo thể loại mới vào hệ thống
app.post('/api/tags', async (req, res) => {
    try {
        const { name } = req.body;
        const newTag = await Tag.create({ name });
        res.json({ message: 'Đã thêm', tag: newTag.name });
    } catch (err) {
        res.status(400).json({ error: 'Tag đã tồn tại hoặc lỗi' });
    }
});

// Admin xóa thể loại khỏi hệ thống
app.delete('/api/tags/:name', async (req, res) => {
    await Tag.deleteOne({ name: req.params.name });
    res.json({ message: 'Đã xóa' });
});

// Lấy danh sách toàn bộ Game
app.get('/api/games', async (req, res) => {
    const games = await Game.find();
    res.json(games);
});

// Admin thêm tag vào một game cụ thể
app.post('/api/games/:slug/tags', async (req, res) => {
    const { slug } = req.params;
    const { tag } = req.body;
    const game = await Game.findOne({ slug });
    if (game && !game.tags.includes(tag)) {
        game.tags.push(tag);
        await game.save();
    }
    res.json(game);
});

// Admin xóa tag khỏi một game cụ thể
app.delete('/api/games/:slug/tags/:tag', async (req, res) => {
    const { slug, tag } = req.params;
    const game = await Game.findOne({ slug });
    if (game) {
        game.tags = game.tags.filter(t => t !== tag);
        await game.save();
    }
    res.json(game);
});

// Sync user
app.post('/api/sync-user', async (req, res) => {
    const user = await User.findOne({ username: req.body.username });
    if (user) res.json(publicUser(user));
    else res.status(404).json({ error: 'Not found' });
});

// Add to cart
app.post('/api/cart/add', async (req, res) => {
    const { username, slug } = req.body;
    const user = await User.findOne({ username });
    if (user && !user.cart.includes(slug) && !user.purchased.includes(slug)) {
        user.cart.push(slug);
        await user.save();
    }
    res.json(publicUser(user));
});

// Remove from cart
app.post('/api/cart/remove', async (req, res) => {
    const { username, slug } = req.body;
    const user = await User.findOne({ username });
    if (user) {
        user.cart = user.cart.filter(item => item !== slug);
        await user.save();
    }
    res.json(publicUser(user));
});

// Checkout
app.post('/api/checkout', async (req, res) => {
    const { username } = req.body;
    const user = await User.findOne({ username });
    if (user) {
        const cost = user.cart.length * 1000; // Mỗi game giá 1.000đ
        if (cost === 0) return res.status(400).json({ error: 'Giỏ hàng trống' });
        if (user.money >= cost) {
            user.money -= cost;
            user.purchased.push(...user.cart);
            user.cart = [];
            await user.save();
            res.json({ success: true, user: publicUser(user) });
        } else {
            res.status(400).json({ error: 'Không đủ tiền để thanh toán!' });
        }
    } else {
        res.status(400).json({ error: 'Lỗi tài khoản' });
    }
});

// Đăng nhập
app.post('/api/login', async (req, res) => {
    try {
        // Ép kiểu chuỗi để chặn tấn công NoSQL Injection (vd: {"$ne": ""})
        const username = String(req.body.username || '').trim();
        const password = String(req.body.password || '');

        const user = await User.findOne({ username });
        const ok = user && isHashed(user.password) && await bcrypt.compare(password, user.password);
        if (!ok) {
            return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
        }
        res.json(publicUser(user));
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Đăng ký
app.post('/api/register', async (req, res) => {
    try {
        const username = String(req.body.username || '').trim();
        const password = String(req.body.password || '');
        const theme = req.body.theme;

        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
            return res.status(400).json({ error: 'Tên đăng nhập 3-20 ký tự, chỉ gồm chữ, số hoặc dấu _' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
        }
        if (await User.exists({ username })) {
            return res.status(400).json({ error: 'Tài khoản đã tồn tại' });
        }

        const hashed = await bcrypt.hash(password, SALT_ROUNDS);
        const newUser = await User.create({
            username, password: hashed, role: 'user', money: 0, cart: [], purchased: [],
            theme: theme === 'light' ? 'light' : 'dark' // Giữ giao diện khách đang dùng lúc đăng ký
        });
        res.json(publicUser(newUser));
    } catch (err) {
        res.status(400).json({ error: 'Không thể tạo tài khoản' });
    }
});

// Lưu lựa chọn giao diện sáng/tối của user vào database
app.post('/api/user/theme', async (req, res) => {
    try {
        const { username, theme } = req.body;
        if (!['light', 'dark'].includes(theme)) {
            return res.status(400).json({ error: 'Theme không hợp lệ' });
        }
        const user = await User.findOneAndUpdate({ username }, { theme }, { new: true });
        if (!user) return res.status(404).json({ error: 'User không tồn tại' });
        res.json(publicUser(user));
    } catch (e) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Webhook SePay đón dữ liệu biến động số dư tự động
app.post('/api/sepay-webhook', async (req, res) => {
    try {
        console.log('🔔 [SePay Webhook Received]:', req.body);
        const data = req.body;

        // Bỏ qua nếu không phải tiền vào (transferType !== 'in')
        if (data.transferType && data.transferType !== 'in') {
            return res.json({ success: true, message: 'Bỏ qua giao dịch không phải tiền vào' });
        }

        const amount = Number(data.transferAmount || 0);
        if (amount <= 0) {
            return res.json({ success: true, message: 'Số tiền không hợp lệ' });
        }

        // Nội dung chuyển khoản (content)
        const content = (data.content || '').toUpperCase();
        console.log(`🔎 Phân tích nội dung chuyển khoản: "${content}", Số tiền: ${amount}đ`);

        // Tìm username trong nội dung: Cú pháp quy ước NAP <username> (ví dụ: NAP ADMIN hoặc NAP USER1)
        // SePay có thể ghép thêm ký tự ngân hàng như "NAP ADMIN MBVCB..."
        let matchedUser = null;

        // Cách 1: Regex tìm chữ sau từ khóa NAP hoặc NAPTIEN
        const match = content.match(/(?:NAP|NAPTIEN)\s*([A-Z0-9_]+)/i);
        if (match && match[1]) {
            const candidateUsername = match[1].toLowerCase();
            matchedUser = await User.findOne({ username: { $regex: new RegExp(`^${candidateUsername}$`, 'i') } });
        }

        // Cách 2: Nếu chưa tìm thấy, quét tất cả users xem tên user nào xuất hiện trong content
        if (!matchedUser) {
            const allUsers = await User.find({}, 'username');
            for (const u of allUsers) {
                if (content.includes(u.username.toUpperCase())) {
                    matchedUser = await User.findOne({ username: u.username });
                    break;
                }
            }
        }

        if (matchedUser) {
            // Tự động cộng tiền cho User
            matchedUser.money = (matchedUser.money || 0) + amount;
            await matchedUser.save();

            // Lưu log lịch sử giao dịch
            await Transaction.create({
                gateway: data.gateway,
                transactionDate: data.transactionDate,
                accountNumber: data.accountNumber,
                code: data.code,
                content: data.content,
                transferType: data.transferType,
                transferAmount: amount,
                accumulated: data.accumulated,
                subAccount: data.subAccount,
                referenceCode: data.referenceCode,
                description: data.description,
                username: matchedUser.username
            });

            console.log(`✅ [Nạp tiền thành công]: Đã cộng +${amount}đ cho user "${matchedUser.username}". Số dư mới: ${matchedUser.money}đ`);
            return res.json({ success: true, message: `Đã cộng ${amount}đ cho user ${matchedUser.username}` });
        } else {
            console.log(`⚠️ Không tìm thấy user nào khớp với nội dung: "${content}"`);
            return res.json({ success: false, message: 'Không tìm thấy user tương ứng' });
        }
    } catch (err) {
        console.error('❌ Lỗi xử lý SePay Webhook:', err);
        return res.status(500).json({ error: 'Lỗi máy chủ khi xử lý webhook' });
    }
});

// API kiểm tra số dư mới nhất (dùng cho frontend tự động cập nhật sau khi quét QR)
app.get('/api/user/balance/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });
        if (user) {
            res.json({ username: user.username, money: user.money || 0 });
        } else {
            res.status(404).json({ error: 'User không tồn tại' });
        }
    } catch (e) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// ==========================================
// CÁC API MỚI CHO 4 TÍNH NĂNG NÂNG CẤP
// ==========================================

// 1. TÍNH NĂNG WISHLIST (DANH SÁCH YÊU THÍCH)
app.post('/api/user/wishlist/toggle', async (req, res) => {
    try {
        const { username, slug } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ error: 'User không tồn tại' });
        if (!user.wishlist) user.wishlist = [];
        const idx = user.wishlist.indexOf(slug);
        if (idx > -1) {
            user.wishlist.splice(idx, 1);
        } else {
            user.wishlist.push(slug);
        }
        await user.save();
        res.json(publicUser(user));
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// 2. TÍNH NĂNG ĐỔI MẬT KHẨU
app.post('/api/user/change-password', async (req, res) => {
    try {
        const { username, oldPassword, newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
        }
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ error: 'User không tồn tại' });
        const match = isHashed(user.password) && await bcrypt.compare(String(oldPassword || ''), user.password);
        if (!match) return res.status(400).json({ error: 'Mật khẩu hiện tại không chính xác' });

        user.password = await bcrypt.hash(String(newPassword), SALT_ROUNDS);
        await user.save();
        res.json({ success: true, message: 'Đổi mật khẩu thành công!' });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// 3. TÍNH NĂNG HỒ SƠ / THƯ VIỆN & LỊCH SỬ NẠP TIỀN
app.get('/api/user/library/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });
        if (!user) return res.status(404).json({ error: 'User không tồn tại' });
        const purchasedSlugs = user.purchased || [];
        const games = await Game.find({ slug: { $in: purchasedSlugs } });
        const transactions = await Transaction.find({ username: user.username }).sort({ createdAt: -1 });
        res.json({
            purchasedGames: games,
            transactions: transactions,
            totalPurchased: purchasedSlugs.length,
            money: user.money
        });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// 4. TÍNH NĂNG ĐÁNH GIÁ & BÌNH LUẬN (REVIEWS & RATINGS)
app.get('/api/games/:slug/reviews', async (req, res) => {
    try {
        const { slug } = req.params;
        const reviews = await Review.find({ gameSlug: slug }).sort({ createdAt: -1 });
        const game = await Game.findOne({ slug });
        res.json({
            reviews,
            ratingAvg: game ? (game.ratingAvg || 5) : 5,
            ratingCount: game ? (game.ratingCount || reviews.length) : reviews.length
        });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

app.post('/api/games/:slug/reviews', async (req, res) => {
    try {
        const { slug } = req.params;
        const { username, rating, comment } = req.body;
        if (!username || !rating || !comment || !comment.trim()) {
            return res.status(400).json({ error: 'Vui lòng chọn số sao và nhập nhận xét' });
        }
        const user = await User.findOne({ username });
        if (!user) return res.status(401).json({ error: 'Vui lòng đăng nhập' });
        const isPurchased = (user.purchased || []).includes(slug) || user.role === 'admin';
        if (!isPurchased) {
            return res.status(403).json({ error: 'Bạn cần sở hữu game này để có thể đánh giá!' });
        }
        const numRating = Math.max(1, Math.min(5, parseInt(rating) || 5));
        await Review.findOneAndUpdate(
            { gameSlug: slug, username },
            { rating: numRating, comment: comment.trim(), createdAt: new Date() },
            { upsert: true, new: true }
        );
        // Tính lại điểm trung bình
        const allReviews = await Review.find({ gameSlug: slug });
        const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        await Game.updateOne(
            { slug },
            { ratingAvg: Math.round(avg * 10) / 10, ratingCount: allReviews.length }
        );
        const updatedGame = await Game.findOne({ slug });
        res.json({ success: true, reviews: allReviews, ratingAvg: updatedGame.ratingAvg, ratingCount: updatedGame.ratingCount });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// 5. TÍNH NĂNG BẢNG ĐIỀU KHIỂN QUẢN TRỊ (ADMIN DASHBOARD STATS & GAME CRUD)
app.get('/api/admin/stats', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalGames = await Game.countDocuments();
        const transactions = await Transaction.find().sort({ createdAt: -1 });
        const totalRevenue = transactions.reduce((sum, t) => sum + (t.transferAmount || 0), 0);

        // Tính top game bán chạy và tổng lượt mua
        const users = await User.find({}, 'purchased');
        const gameSales = {};
        let totalPurchases = 0;
        users.forEach(u => {
            (u.purchased || []).forEach(slug => {
                totalPurchases++;
                gameSales[slug] = (gameSales[slug] || 0) + 1;
            });
        });

        const allGames = await Game.find({}, 'name slug img price');
        const bestSellers = allGames.map(g => ({
            name: g.name,
            slug: g.slug,
            img: g.img,
            sales: gameSales[g.slug] || 0
        })).sort((a, b) => b.sales - a.sales).slice(0, 5);

        // Thống kê doanh thu 7 ngày gần nhất
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            last7Days.push({ date: dateStr, revenue: 0 });
        }

        transactions.forEach(t => {
            const tDate = new Date(t.createdAt || t.transactionDate || Date.now());
            const str = tDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            const item = last7Days.find(x => x.date === str);
            if (item) item.revenue += (t.transferAmount || 0);
        });

        res.json({
            totalUsers,
            totalGames,
            totalRevenue,
            totalPurchases,
            bestSellers,
            recentTransactions: transactions.slice(0, 8),
            chartData: last7Days
        });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Admin: Thêm game mới
app.post('/api/admin/games', async (req, res) => {
    try {
        const { name, slug, img, tags, price, desc, publisher, release } = req.body;
        if (!name || !slug) return res.status(400).json({ error: 'Thiếu tên hoặc slug của game' });
        const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const exists = await Game.findOne({ slug: cleanSlug });
        if (exists) return res.status(400).json({ error: 'Slug game đã tồn tại' });
        
        const newGame = await Game.create({
            name,
            slug: cleanSlug,
            img: img || 'https://via.placeholder.com/460x215?text=Game',
            tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t=>t.trim()).filter(Boolean) : []),
            price: Number(price) || 1000,
            desc: desc || 'Mô tả game đang được cập nhật.',
            publisher: publisher || 'GameStore Studio',
            release: release || new Date().toLocaleDateString('vi-VN')
        });

        // Tự động tạo file HTML chi tiết cho game nếu chưa có
        const fs = require('fs');
        const path = require('path');
        const htmlPath = path.join(__dirname, `${cleanSlug}.html`);
        if (!fs.existsSync(htmlPath)) {
            const templatePath = path.join(__dirname, 'cyberpunk_2077.html');
            if (fs.existsSync(templatePath)) {
                let html = fs.readFileSync(templatePath, 'utf8');
                html = html.replace(/Cyberpunk 2077/g, newGame.name);
                html = html.replace(/cyberpunk_2077/g, cleanSlug);
                fs.writeFileSync(htmlPath, html, 'utf8');
            }
        }

        res.json(newGame);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server khi tạo game' });
    }
});

// Admin: Cập nhật game
app.put('/api/admin/games/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const { name, img, tags, price, desc, publisher, release } = req.body;
        const game = await Game.findOne({ slug });
        if (!game) return res.status(404).json({ error: 'Không tìm thấy game' });

        if (name) game.name = name;
        if (img) game.img = img;
        if (tags) game.tags = Array.isArray(tags) ? tags : tags.split(',').map(t=>t.trim()).filter(Boolean);
        if (price !== undefined) game.price = Number(price);
        if (desc) game.desc = desc;
        if (publisher) game.publisher = publisher;
        if (release) game.release = release;

        await game.save();
        res.json(game);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi cập nhật game' });
    }
});

// Admin: Xóa game
app.delete('/api/admin/games/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        await Game.deleteOne({ slug });
        await Review.deleteMany({ gameSlug: slug });
        res.json({ success: true, message: `Đã xóa game ${slug}` });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi xóa game' });
    }
});

// ===================================================
// 6. QUẢN LÝ KHÁCH HÀNG (CUSTOMER MANAGEMENT - ADMIN)
// ===================================================

// Admin: Lấy danh sách toàn bộ khách hàng
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await User.find({}, '-password').sort({ _id: -1 });
        const result = users.map(u => ({
            _id: u._id,
            username: u.username,
            role: u.role || 'user',
            money: u.money || 0,
            purchasedCount: (u.purchased || []).length,
            cartCount: (u.cart || []).length,
            wishlistCount: (u.wishlist || []).length,
            theme: u.theme || 'dark'
        }));
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi lấy danh sách khách hàng' });
    }
});

// Admin: Điều chỉnh số dư khách hàng (Thêm tiền, Trừ tiền, Đặt lại số dư)
app.post('/api/admin/users/:username/adjust-money', async (req, res) => {
    try {
        const { username } = req.params;
        const { action, amount, reason } = req.body;
        const numAmount = Math.max(0, parseInt(amount) || 0);

        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });

        const oldMoney = user.money || 0;
        let transType = 'in';

        if (action === 'add') {
            user.money = oldMoney + numAmount;
            transType = 'in';
        } else if (action === 'subtract') {
            user.money = Math.max(0, oldMoney - numAmount);
            transType = 'out';
        } else if (action === 'set') {
            user.money = numAmount;
            transType = numAmount >= oldMoney ? 'in' : 'out';
        } else {
            return res.status(400).json({ error: 'Hành động không hợp lệ (hỗ trợ: add, subtract, set)' });
        }

        await user.save();

        // Ghi lại lịch sử giao dịch để minh bạch dòng tiền
        const note = reason && reason.trim() ? reason.trim() : (action === 'add' ? 'Admin cộng tiền' : (action === 'subtract' ? 'Admin trừ tiền' : 'Admin đặt lại số dư'));
        await Transaction.create({
            gateway: 'ADMIN_MANUAL',
            transactionDate: new Date(),
            accountNumber: 'ADMIN',
            code: `AD_${Date.now()}`,
            content: `${note} (${oldMoney.toLocaleString('vi-VN')}đ ➔ ${user.money.toLocaleString('vi-VN')}đ)`,
            transferType: transType,
            transferAmount: numAmount,
            username: user.username
        });

        res.json({
            success: true,
            username: user.username,
            oldMoney,
            newMoney: user.money,
            message: `Đã cập nhật số dư tài khoản "${user.username}" thành ${user.money.toLocaleString('vi-VN')}đ`
        });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi điều chỉnh số dư người dùng' });
    }
});

// Admin: Thay đổi vai trò người dùng (user <-> admin)
app.post('/api/admin/users/:username/change-role', async (req, res) => {
    try {
        const { username } = req.params;
        const { role } = req.body;
        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'Vai trò không hợp lệ' });
        }
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
        user.role = role;
        await user.save();
        res.json({ success: true, username: user.username, role: user.role });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi cập nhật vai trò' });
    }
});

// Admin: Xóa tài khoản khách hàng
app.delete('/api/admin/users/:username', async (req, res) => {
    try {
        const { username } = req.params;
        if (username === 'admin') {
            return res.status(400).json({ error: 'Không thể xóa tài khoản Admin mặc định!' });
        }
        await User.deleteOne({ username });
        await Review.deleteMany({ username });
        res.json({ success: true, message: `Đã xóa tài khoản "${username}"` });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi xóa người dùng' });
    }
});

// 5. CHẠY SERVER
app.listen(PORT, () => {
    console.log(`🚀 Server Backend đang chạy tại: http://localhost:${PORT}`);
});
