const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
    name: String,
    slug: { type: String, unique: true },
    img: String,
    tags: [String]
});
const Game = mongoose.model('Game', gameSchema);

// Sử dụng ảnh từ máy chủ CDN của Steam (rất nhanh và ổn định)
const imageUrls = {
    'minecraft': 'https://store-images.s-microsoft.com/image/apps.60323.13774133678237924.758ba2a1-eb53-4430-bfeb-00e008ba856c.c95e1eb2-bc9c-4829-87a2-fde904eb2e3a?q=90&w=460&h=215',
    'outlast': 'https://cdn.akamai.steamstatic.com/steam/apps/238320/header.jpg',
    'gta_v': 'https://cdn.akamai.steamstatic.com/steam/apps/271590/header.jpg',
    'witcher_3': 'https://cdn.akamai.steamstatic.com/steam/apps/292030/header.jpg',
    're4': 'https://cdn.akamai.steamstatic.com/steam/apps/2050650/header.jpg',
    'limbo': 'https://cdn.akamai.steamstatic.com/steam/apps/48000/header.jpg',
    'subnautica': 'https://cdn.akamai.steamstatic.com/steam/apps/264710/header.jpg',
    'little_nightmares': 'https://cdn.akamai.steamstatic.com/steam/apps/424840/header.jpg',
    'terraria': 'https://cdn.akamai.steamstatic.com/steam/apps/105600/header.jpg',
    'the_room': 'https://cdn.akamai.steamstatic.com/steam/apps/288160/header.jpg',
    'silent_hill': 'https://upload.wikimedia.org/wikipedia/en/a/a7/Silent_Hill_PlayStation_cover.png',
    'the_forest': 'https://cdn.akamai.steamstatic.com/steam/apps/242760/header.jpg',
    'portal': 'https://cdn.akamai.steamstatic.com/steam/apps/400/header.jpg'
};

async function updateImages() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/gamestore');
        console.log('Connected to MongoDB');

        for (const slug in imageUrls) {
            const result = await Game.updateOne({ slug: slug }, { img: imageUrls[slug] });
            if (result.modifiedCount > 0) {
                console.log(`Đã cập nhật ảnh đẹp cho game: ${slug}`);
            } else {
                console.log(`Bỏ qua (đã có ảnh) hoặc không tìm thấy: ${slug}`);
            }
        }

        console.log('Cập nhật hoàn tất!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

updateImages();
