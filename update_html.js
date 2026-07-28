const fs = require('fs');

const gamesData = {
    'minecraft': {
        desc: 'Trò chơi sinh tồn thế giới mở nơi bạn có thể xây dựng bất cứ thứ gì bằng các khối vuông, khám phá hang động và chiến đấu với quái vật.',
        publisher: 'Mojang Studios',
        date: '18 tháng 11, 2011'
    },
    'outlast': {
        desc: 'Bạn vào vai nhà báo điều tra Miles Upshur thâm nhập vào một bệnh viện tâm thần bỏ hoang. Trò chơi kinh dị góc nhìn thứ nhất với không khí ngột ngạt và không có khả năng chiến đấu.',
        publisher: 'Red Barrels',
        date: '4 tháng 9, 2013'
    },
    'gta_v': {
        desc: 'Theo chân ba tên tội phạm trong thành phố Los Santos rộng lớn. Khám phá thế giới mở, tham gia các phi vụ trộm cắp và tận hưởng vô số hoạt động giải trí.',
        publisher: 'Rockstar Games',
        date: '17 tháng 9, 2013'
    },
    'witcher_3': {
        desc: 'Vào vai Geralt xứ Rivia, một thợ săn quái vật chuyên nghiệp. Khám phá Lục Địa rộng lớn, làm các nhiệm vụ hoành tráng và tìm kiếm đứa con gái nuôi Ciri.',
        publisher: 'CD Projekt RED',
        date: '19 tháng 5, 2015'
    },
    're4': {
        desc: 'Đặc vụ Leon S. Kennedy được cử đến một ngôi làng hẻo lánh ở châu Âu để giải cứu con gái tổng thống khỏi một giáo phái cuồng tín. Một tuyệt tác hành động kinh dị.',
        publisher: 'Capcom',
        date: '11 tháng 1, 2005'
    },
    'limbo': {
        desc: 'Trò chơi giải đố đi cảnh màn hình ngang với tông màu đen trắng đầy ám ảnh. Một cậu bé dấn thân vào thế giới Limbo tăm tối để tìm em gái mình.',
        publisher: 'Playdead',
        date: '21 tháng 7, 2010'
    },
    'subnautica': {
        desc: 'Sinh tồn dưới đáy đại dương của một hành tinh xa lạ sau khi phi thuyền của bạn gặp nạn. Khám phá các rạn san hô, vực sâu thẳm và tránh các sinh vật phù du nguy hiểm.',
        publisher: 'Unknown Worlds',
        date: '23 tháng 1, 2018'
    },
    'little_nightmares': {
        desc: 'Theo chân cô bé Six trong hành trình trốn thoát khỏi The Maw, một con tàu ngầm khổng lồ chứa đầy những linh hồn thối nát đang đói khát.',
        publisher: 'Bandai Namco',
        date: '28 tháng 4, 2017'
    },
    'terraria': {
        desc: 'Phiên bản 2D của Minecraft tập trung nhiều hơn vào chiến đấu và khám phá. Đào bới, chiến đấu, xây dựng và đánh bại những con trùm khổng lồ.',
        publisher: 'Re-Logic',
        date: '16 tháng 5, 2011'
    },
    'the_room': {
        desc: 'Đắm chìm vào những hộp giải đố cơ học phức tạp với đồ họa 3D chân thực và không khí bí ẩn. Một kiệt tác của thể loại giải đố.',
        publisher: 'Fireproof Games',
        date: '19 tháng 9, 2012'
    }
};

const originalDesc = "Silent Hill là một trò chơi kinh dị tâm lý kinh điển. Bạn sẽ vào vai Harry Mason tìm kiếm đứa con gái mất tích của mình trong thị trấn Silent Hill đầy sương mù và những sinh vật kinh hoàng. Trò chơi tập trung vào bầu không khí u ám, giải đố và sự sinh tồn trong một thế giới ác mộng.";
const originalPublisher = "Konami";
const originalDate = "31 tháng 1, 1999";

for (const slug in gamesData) {
    const filePath = `${slug}.html`;
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf-8');
        const data = gamesData[slug];
        
        content = content.replace(originalDesc, data.desc);
        content = content.replace(`<h4>Nhà phát hành</h4>\r\n                    <p>${originalPublisher}</p>`, `<h4>Nhà phát hành</h4>\r\n                    <p>${data.publisher}</p>`);
        content = content.replace(`<h4>Nhà phát hành</h4>\n                    <p>${originalPublisher}</p>`, `<h4>Nhà phát hành</h4>\n                    <p>${data.publisher}</p>`);

        content = content.replace(`<h4>Ngày phát hành</h4>\r\n                    <p>${originalDate}</p>`, `<h4>Ngày phát hành</h4>\r\n                    <p>${data.date}</p>`);
        content = content.replace(`<h4>Ngày phát hành</h4>\n                    <p>${originalDate}</p>`, `<h4>Ngày phát hành</h4>\n                    <p>${data.date}</p>`);
        
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Đã cập nhật thông tin cho ${slug}.html`);
    }
}

console.log("Cập nhật hoàn tất!");
