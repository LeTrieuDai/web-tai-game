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
    { name: 'Minecraft', slug: 'minecraft', img: 'https://via.placeholder.com/200x150?text=Minecraft', tags: ['Sinh tồn', 'Khám phá'] },
    { name: 'Outlast', slug: 'outlast', img: 'https://via.placeholder.com/200x150?text=Outlast', tags: ['Kinh dị'] },
    { name: 'Grand Theft Auto V', slug: 'gta_v', img: 'https://via.placeholder.com/200x150?text=GTA+V', tags: ['Khám phá'] },
    { name: 'The Witcher 3', slug: 'witcher_3', img: 'https://via.placeholder.com/200x150?text=The+Witcher+3', tags: ['Khám phá'] },
    { name: 'Resident Evil 4', slug: 're4', img: 'https://via.placeholder.com/200x150?text=Resident+Evil+4', tags: ['Kinh dị'] },
    { name: 'Limbo', slug: 'limbo', img: 'https://via.placeholder.com/200x150?text=Limbo', tags: ['Giải đố', 'Kinh dị'] },
    { name: 'Subnautica', slug: 'subnautica', img: 'https://via.placeholder.com/200x150?text=Subnautica', tags: ['Sinh tồn', 'Khám phá'] },
    { name: 'Little Nightmares', slug: 'little_nightmares', img: 'https://via.placeholder.com/200x150?text=Little+Nightmares', tags: ['Kinh dị', 'Giải đố'] },
    { name: 'Terraria', slug: 'terraria', img: 'https://via.placeholder.com/200x150?text=Terraria', tags: ['Sinh tồn', 'Khám phá'] },
    { name: 'The Room', slug: 'the_room', img: 'https://via.placeholder.com/200x150?text=The+Room', tags: ['Giải đố'] }
];

async function addGames() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/gamestore');
        console.log('Connected to MongoDB');

        // Thêm vào Database
        for (let game of newGames) {
            const exists = await Game.findOne({ slug: game.slug });
            if (!exists) {
                await Game.create(game);
                console.log(`Đã thêm vào DB: ${game.name}`);
            }
        }

        // Tạo file HTML cho từng game dựa trên silent_hill.html
        const template = fs.readFileSync('silent_hill.html', 'utf-8');
        
        for (let game of newGames) {
            const filePath = `${game.slug}.html`;
            if (!fs.existsSync(filePath)) {
                let content = template.replace(/Silent Hill/g, game.name);
                content = content.replace(/silent_hill/g, game.slug);
                fs.writeFileSync(filePath, content, 'utf-8');
                console.log(`Đã tạo file giao diện: ${filePath}`);
            }
        }

        console.log('Hoàn tất!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

addGames();
