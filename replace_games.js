const mongoose = require('mongoose');
const fs = require('fs');

const gameSchema = new mongoose.Schema({
    name: String,
    slug: { type: String, unique: true },
    img: String,
    tags: [String]
});
const Game = mongoose.model('Game', gameSchema);

const newGames = [
    {
        name: 'Cyberpunk 2077',
        slug: 'cyberpunk_2077',
        img: 'https://cdn.akamai.steamstatic.com/steam/apps/1091500/header.jpg',
        tags: ['Khám phá'],
        desc: 'Trò chơi nhập vai hành động phiêu lưu thế giới mở lấy bối cảnh tại Night City, một siêu đô thị bị ám ảnh bởi quyền lực, sự hào nhoáng và việc cấy ghép cơ thể.',
        publisher: 'CD Projekt RED',
        date: '10 tháng 12, 2020'
    },
    {
        name: 'Hollow Knight',
        slug: 'hollow_knight',
        img: 'https://cdn.akamai.steamstatic.com/steam/apps/367520/header.jpg',
        tags: ['Khám phá', 'Giải đố'],
        desc: 'Một cuộc phiêu lưu hành động 2D hoành tráng qua một vương quốc đổ nát rộng lớn của các loài côn trùng và anh hùng. Khám phá hang động ngoằn ngoèo và chiến đấu với sinh vật kỳ dị.',
        publisher: 'Team Cherry',
        date: '24 tháng 2, 2017'
    },
    {
        name: 'Stardew Valley',
        slug: 'stardew_valley',
        img: 'https://cdn.akamai.steamstatic.com/steam/apps/413150/header.jpg',
        tags: ['Sinh tồn', 'Khám phá'],
        desc: 'Bạn được thừa kế trang trại cũ của ông nội ở Thung lũng Stardew. Được trang bị các công cụ thủ công và một vài đồng xu, bạn bắt đầu cuộc sống mới của mình.',
        publisher: 'ConcernedApe',
        date: '26 tháng 2, 2016'
    },
    {
        name: 'Sekiro: Shadows Die Twice',
        slug: 'sekiro',
        img: 'https://cdn.akamai.steamstatic.com/steam/apps/814380/header.jpg',
        tags: ['Sinh tồn', 'Khám phá'],
        desc: 'Vào vai Sói độc thủ, một chiến binh bị ruồng bỏ và bị hủy hoại được cứu thoát khỏi bờ vực của cái chết. Bắt tay vào nhiệm vụ bảo vệ một lãnh chúa trẻ tuổi.',
        publisher: 'Activision',
        date: '21 tháng 3, 2019'
    }
];

async function replaceGames() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gamestore');
        console.log('Connected to MongoDB');

        // 1. Xóa Minecraft và Silent Hill khỏi DB
        await Game.deleteOne({ slug: 'minecraft' });
        await Game.deleteOne({ slug: 'silent_hill' });
        console.log('Đã xóa Minecraft và Silent Hill khỏi Database.');

        // 2. Xóa file HTML cũ
        if (fs.existsSync('minecraft.html')) fs.unlinkSync('minecraft.html');
        if (fs.existsSync('silent_hill.html')) fs.unlinkSync('silent_hill.html');
        console.log('Đã xóa các file HTML cũ.');

        // 3. Thêm 4 game mới vào DB
        for (let g of newGames) {
            const exists = await Game.findOne({ slug: g.slug });
            if (!exists) {
                await Game.create({
                    name: g.name,
                    slug: g.slug,
                    img: g.img,
                    tags: g.tags
                });
                console.log(`Đã thêm vào DB: ${g.name}`);
            }
        }

        // 4. Tạo và cập nhật file HTML mới dựa trên mẫu the_forest.html
        const template = fs.readFileSync('the_forest.html', 'utf-8');
        
        // Mẫu mặc định trong the_forest.html
        const originalName = "The Forest";
        const originalSlug = "the_forest";
        const originalDesc = "The Forest là một trò chơi sinh tồn thế giới mở. Sau khi sống sót qua một vụ tai nạn máy bay chở khách, bạn thấy mình trong một khu rừng bí ẩn để chiến đấu chống lại một xã hội gồm những sinh vật ăn thịt người. Xây dựng, khám phá, sinh tồn trong trò chơi sinh tồn kinh dị góc nhìn thứ nhất đáng sợ này.";
        const originalPublisher = "Endnight Games";
        const originalDate = "30 tháng 4, 2018";

        for (let g of newGames) {
            const filePath = `${g.slug}.html`;
            let content = template.replace(new RegExp(originalName, 'g'), g.name);
            content = content.replace(new RegExp(originalSlug, 'g'), g.slug);
            
            // Thay thế thông tin chi tiết
            content = content.replace(originalDesc, g.desc);
            content = content.replace(new RegExp(`<h4>Nhà phát hành</h4>\\r?\\n\\s*<p>${originalPublisher}</p>`, 'g'), `<h4>Nhà phát hành</h4>\n                    <p>${g.publisher}</p>`);
            content = content.replace(new RegExp(`<h4>Ngày phát hành</h4>\\r?\\n\\s*<p>${originalDate}</p>`, 'g'), `<h4>Ngày phát hành</h4>\n                    <p>${g.date}</p>`);

            fs.writeFileSync(filePath, content, 'utf-8');
            console.log(`Đã tạo và cập nhật file giao diện: ${filePath}`);
        }

        console.log('Hoàn tất toàn bộ!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

replaceGames();
