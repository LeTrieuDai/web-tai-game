// games_data.js - Danh sách game bổ sung (dùng chung cho server.js seed và generate_games.js tạo trang HTML)
// Ảnh lấy từ Steam CDN theo App ID.

const steamImg = (appId) => `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;

const extraGames = [
    {
        name: 'Elden Ring', slug: 'elden_ring', appId: 1245620,
        tags: ['Hành động', 'Nhập vai', 'Khám phá'],
        publisher: 'FromSoftware / Bandai Namco', release: '25 tháng 2, 2022',
        desc: 'Bước vào Vùng Đất Giữa rộng lớn, nơi bạn trở thành một Kẻ Tàn Tạ trên hành trình khôi phục Elden Ring. Thế giới mở liền mạch, những con trùm khổng lồ và hệ thống chiến đấu khắc nghiệt đặc trưng của FromSoftware sẽ thử thách bản lĩnh của bạn.'
    },
    {
        name: 'Red Dead Redemption 2', slug: 'rdr2', appId: 1174180,
        tags: ['Hành động', 'Khám phá'],
        publisher: 'Rockstar Games', release: '5 tháng 12, 2019',
        desc: 'Năm 1899, Arthur Morgan cùng băng đảng Van der Linde phải chạy trốn khắp miền Tây hoang dã nước Mỹ. Một câu chuyện điện ảnh sâu sắc về lòng trung thành, cùng thế giới mở sống động đến từng chi tiết.'
    },
    {
        name: 'Hades', slug: 'hades', appId: 1145360,
        tags: ['Hành động', 'Nhập vai'],
        publisher: 'Supergiant Games', release: '17 tháng 9, 2020',
        desc: 'Vào vai Zagreus, hoàng tử Âm Phủ, tìm cách thoát khỏi vương quốc của cha mình. Mỗi lần chết là một lần mạnh hơn nhờ sức mạnh từ các vị thần Olympus trong tựa game roguelike đầy cuốn hút.'
    },
    {
        name: 'Celeste', slug: 'celeste', appId: 504230,
        tags: ['Giải đố', 'Hành động'],
        publisher: 'Maddy Makes Games', release: '25 tháng 1, 2018',
        desc: 'Giúp Madeline chinh phục ngọn núi Celeste qua hàng trăm màn chơi platformer được thiết kế tinh xảo. Một câu chuyện cảm động về việc đối mặt với nỗi lo âu của chính mình.'
    },
    {
        name: 'Dead Cells', slug: 'dead_cells', appId: 588650,
        tags: ['Hành động', 'Khám phá'],
        publisher: 'Motion Twin', release: '7 tháng 8, 2018',
        desc: 'Khám phá hòn đảo luôn thay đổi trong tựa game roguevania tốc độ cao. Chiến đấu nhanh, kho vũ khí phong phú và mỗi lần chơi lại là một hành trình hoàn toàn mới.'
    },
    {
        name: "Don't Starve Together", slug: 'dont_starve_together', appId: 322330,
        tags: ['Sinh tồn', 'Khám phá'],
        publisher: 'Klei Entertainment', release: '21 tháng 4, 2016',
        desc: 'Cùng bạn bè sinh tồn trong một thế giới hoang dã kỳ quái đầy quái vật và bí ẩn. Thu thập tài nguyên, chế tạo vật dụng và đừng để bản thân chết đói.'
    },
    {
        name: 'Valheim', slug: 'valheim', appId: 892970,
        tags: ['Sinh tồn', 'Khám phá'],
        publisher: 'Iron Gate AB / Coffee Stain', release: '2 tháng 2, 2021',
        desc: 'Là một chiến binh Viking được gửi tới Valheim, vùng luyện ngục thứ mười. Xây dựng nhà cửa, đóng thuyền vượt biển và đánh bại các sinh vật huyền thoại để chứng minh mình xứng đáng với Valhalla.'
    },
    {
        name: 'Phasmophobia', slug: 'phasmophobia', appId: 739630,
        tags: ['Kinh dị'],
        publisher: 'Kinetic Games', release: '18 tháng 9, 2020',
        desc: 'Lập đội săn ma tối đa 4 người, sử dụng thiết bị chuyên dụng để điều tra những ngôi nhà bị ám. Thu thập bằng chứng và xác định loại hồn ma trước khi nó tìm thấy bạn.'
    },
    {
        name: 'Amnesia: The Dark Descent', slug: 'amnesia', appId: 57300,
        tags: ['Kinh dị', 'Giải đố'],
        publisher: 'Frictional Games', release: '8 tháng 9, 2010',
        desc: 'Tỉnh dậy trong một lâu đài u tối mà không còn chút ký ức nào. Không vũ khí, không cách phản kháng – bạn chỉ có thể trốn chạy và giữ cho mình khỏi phát điên.'
    },
    {
        name: 'Inside', slug: 'inside', appId: 304430,
        tags: ['Giải đố', 'Kinh dị'],
        publisher: 'Playdead', release: '7 tháng 7, 2016',
        desc: 'Tác phẩm tiếp nối Limbo của Playdead. Một cậu bé đơn độc bị cuốn vào trung tâm của một dự án đen tối, trong thế giới u ám với những câu đố đầy ám ảnh.'
    },
    {
        name: 'Portal 2', slug: 'portal_2', appId: 620,
        tags: ['Giải đố'],
        publisher: 'Valve', release: '19 tháng 4, 2011',
        desc: 'Quay trở lại Aperture Science cùng khẩu súng cổng huyền thoại. Chế độ chơi đơn hài hước cùng chế độ co-op 2 người đầy thử thách đã đưa Portal 2 thành tượng đài thể loại giải đố.'
    },
    {
        name: 'The Witness', slug: 'the_witness', appId: 210970,
        tags: ['Giải đố', 'Khám phá'],
        publisher: 'Thekla, Inc.', release: '26 tháng 1, 2016',
        desc: 'Tỉnh dậy một mình trên hòn đảo bí ẩn với hơn 500 câu đố. Không lời dẫn dắt, bạn phải tự quan sát, suy luận và khám phá bí mật của hòn đảo.'
    },
    {
        name: 'Dark Souls III', slug: 'dark_souls_3', appId: 374320,
        tags: ['Hành động', 'Nhập vai', 'Kinh dị'],
        publisher: 'FromSoftware / Bandai Namco', release: '12 tháng 4, 2016',
        desc: 'Khi ngọn lửa tàn lụi, thế giới chìm vào hủy diệt. Hãy bước vào một thế giới u tối đầy rẫy kẻ thù và những con trùm khó nhằn trong phần kết hoành tráng của series Dark Souls.'
    },
    {
        name: 'Monster Hunter: World', slug: 'monster_hunter_world', appId: 582010,
        tags: ['Hành động', 'Nhập vai'],
        publisher: 'Capcom', release: '9 tháng 8, 2018',
        desc: 'Trở thành thợ săn quái vật tại Tân Thế Giới. Theo dấu, chiến đấu và chế tạo trang bị từ những con quái vật khổng lồ – một mình hoặc cùng tối đa 3 người bạn.'
    },
    {
        name: "Baldur's Gate 3", slug: 'baldurs_gate_3', appId: 1086940,
        tags: ['Nhập vai', 'Khám phá'],
        publisher: 'Larian Studios', release: '3 tháng 8, 2023',
        desc: 'Tập hợp đồng đội và trở lại Forgotten Realms trong câu chuyện về tình bạn, phản bội và sự hy sinh. Mọi lựa chọn của bạn đều định hình thế giới trong siêu phẩm nhập vai dựa trên Dungeons & Dragons.'
    },
    {
        name: 'Raft', slug: 'raft', appId: 648800,
        tags: ['Sinh tồn', 'Khám phá'],
        publisher: 'Redbeet Interactive / Axolot Games', release: '20 tháng 6, 2022',
        desc: 'Lênh đênh giữa đại dương trên một chiếc bè nhỏ. Vớt rác, mở rộng bè, chống lại cá mập và khám phá những hòn đảo bí ẩn – một mình hoặc cùng bạn bè.'
    },
    {
        name: 'Green Hell', slug: 'green_hell', appId: 815370,
        tags: ['Sinh tồn', 'Kinh dị'],
        publisher: 'Creepy Jar', release: '5 tháng 9, 2019',
        desc: 'Bị bỏ lại giữa rừng rậm Amazon mà không có thức ăn hay trang bị. Bạn phải chăm sóc cả thể chất lẫn tinh thần để sống sót trong môi trường khắc nghiệt nhất hành tinh.'
    },
    {
        name: 'Dying Light', slug: 'dying_light', appId: 239140,
        tags: ['Kinh dị', 'Sinh tồn', 'Hành động'],
        publisher: 'Techland', release: '27 tháng 1, 2015',
        desc: 'Thành phố Harran bị dịch zombie tàn phá. Di chuyển bằng parkour linh hoạt ban ngày và cố gắng sống sót khi màn đêm buông xuống, lúc những sinh vật đáng sợ nhất xuất hiện.'
    },
    {
        name: 'Cuphead', slug: 'cuphead', appId: 268910,
        tags: ['Hành động'],
        publisher: 'Studio MDHR', release: '29 tháng 9, 2017',
        desc: 'Game bắn súng chạy cảnh với phong cách hoạt hình thập niên 1930 được vẽ tay hoàn toàn. Cuphead và Mugman phải đánh bại hàng loạt con trùm để trả món nợ với Quỷ dữ.'
    },
    {
        name: 'It Takes Two', slug: 'it_takes_two', appId: 1426210,
        tags: ['Giải đố', 'Khám phá'],
        publisher: 'Hazelight Studios / EA', release: '26 tháng 3, 2021',
        desc: 'Cody và May – cặp vợ chồng sắp ly hôn – bị biến thành búp bê và phải hợp tác để trở về. Tựa game co-op bắt buộc 2 người từng đoạt giải Game of the Year 2021.'
    },
];

module.exports = { extraGames, steamImg };
