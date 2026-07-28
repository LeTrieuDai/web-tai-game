const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// 1. KẾT NỐI DATABASE
mongoose.connect('mongodb://127.0.0.1:27017/gamestore')
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
    purchased: [{ type: String }]
});
const User = mongoose.model('User', userSchema);

const gameSchema = new mongoose.Schema({
    name: String,
    slug: { type: String, unique: true },
    img: String,
    tags: [String]
});
const Game = mongoose.model('Game', gameSchema);

const tagSchema = new mongoose.Schema({
    name: { type: String, unique: true }
});
const Tag = mongoose.model('Tag', tagSchema);

// 3. TẠO DỮ LIỆU MẪU (SEEDING) - Chạy 1 lần đầu tiên
async function seedData() {
    try {
        const userCount = await User.countDocuments();
        if (userCount === 0) {
            await User.create({ username: 'admin', password: '123', role: 'admin' });
            console.log('🌱 Đã tạo tài khoản admin mặc định.');
        }

        const tagCount = await Tag.countDocuments();
        if (tagCount === 0) {
            const defaultTags = ['Kinh dị', 'Sinh tồn', 'Khám phá', 'Giải đố'];
            await Tag.insertMany(defaultTags.map(t => ({ name: t })));
            console.log('🌱 Đã tạo danh sách thể loại mặc định.');
        }

        const gameCount = await Game.countDocuments();
        if (gameCount === 0) {
            const sampleGames = [
                { name: 'Silent Hill', slug: 'silent_hill', img: 'https://via.placeholder.com/200x150?text=Silent+Hill', tags: ['Kinh dị'] },
                { name: 'The Forest', slug: 'the_forest', img: 'https://via.placeholder.com/200x150?text=The+Forest', tags: ['Sinh tồn', 'Khám phá'] },
                { name: 'Portal', slug: 'portal', img: 'https://via.placeholder.com/200x150?text=Portal', tags: ['Giải đố'] }
            ];
            await Game.insertMany(sampleGames);
            console.log('🌱 Đã tạo danh sách game mẫu.');
        }
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
    if (user) res.json({ username: user.username, role: user.role, money: user.money, cart: user.cart, purchased: user.purchased });
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
    res.json({ username: user.username, role: user.role, money: user.money, cart: user.cart, purchased: user.purchased });
});

// Remove from cart
app.post('/api/cart/remove', async (req, res) => {
    const { username, slug } = req.body;
    const user = await User.findOne({ username });
    if (user) {
        user.cart = user.cart.filter(item => item !== slug);
        await user.save();
    }
    res.json({ username: user.username, role: user.role, money: user.money, cart: user.cart, purchased: user.purchased });
});

// Checkout
app.post('/api/checkout', async (req, res) => {
    const { username } = req.body;
    const user = await User.findOne({ username });
    if (user) {
        const cost = user.cart.length * 10000;
        if (cost === 0) return res.status(400).json({ error: 'Giỏ hàng trống' });
        if (user.money >= cost) {
            user.money -= cost;
            user.purchased.push(...user.cart);
            user.cart = [];
            await user.save();
            res.json({ success: true, user: { username: user.username, role: user.role, money: user.money, cart: user.cart, purchased: user.purchased } });
        } else {
            res.status(400).json({ error: 'Không đủ tiền để thanh toán!' });
        }
    } else {
        res.status(400).json({ error: 'Lỗi tài khoản' });
    }
});

// Đăng nhập
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (user) {
        res.json({ username: user.username, role: user.role, money: user.money, cart: user.cart, purchased: user.purchased });
    } else {
        res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
    }
});

// Đăng ký
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const newUser = await User.create({ username, password, role: 'user', money: 0, cart: [], purchased: [] });
        res.json({ username: newUser.username, role: newUser.role, money: newUser.money, cart: newUser.cart, purchased: newUser.purchased });
    } catch (err) {
        res.status(400).json({ error: 'Tài khoản đã tồn tại' });
    }
});

// 5. CHẠY SERVER
app.listen(PORT, () => {
    console.log(`🚀 Server Backend đang chạy tại: http://localhost:${PORT}`);
});
