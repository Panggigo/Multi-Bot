const { Client, RichPresence } = require('discord.js-selfbot-v13');
const moment = require('moment');

moment.locale('en');
const client = new Client({ checkUpdate: false });

const base = 0xdd50; // Unicode Base untuk Emoji Jam
let index = 0; // Indeks untuk pergantian tombol

// 🎯 Fungsi untuk mendapatkan emoji jam sesuai WIB
const clock = () => {
    const wibHour = (moment().utc().hour() + 7) % 12 || 12; // Konversi jam ke WIB (format 12 jam)
    return `\uD83D${String.fromCharCode(base + (wibHour - 1))}`; // Pilih emoji jam yang sesuai
};

// Array tombol yang akan berganti-ganti
const buttonSets = [
    [
        { label: '💻 Github', url: 'https://github.com/Panggigo' },
        { label: '📺 Youtube', url: 'https://www.youtube.com/@Panggigo2712' }
    ],
    [
        { label: '📷 Instagram', url: 'https://www.instagram.com/panggigo27/' },
        { label: '💬 Discord', url: 'https://discord.gg/aPBK3UrHzw' }
    ],
	[
        { label: '🐦 X', url: 'https://x.com/Panggigo2712' },
        { label: '🌍 VK', url: 'https://vk.com/panggigo' }
    ],
	[
		{ label: '📱 Tiktok', url: 'https://www.tiktok.com/@panggigo2712' },
        { label: '🖥️Project Reality💻', url: 'https://www.realitymod.com/downloads' }
    ]
];

async function setActivity(){
	const buttons = buttonSets[index];
    const status = new RichPresence() // Creates RPC
        .setName(`🌐 Social Media`) // Name
        .setType(`PLAYING`) // Type
		// .setURL(`https://www.youtube.com/@Panggigo2712`) (Hanya untuk STREAMING)
        .setApplicationId(`985875734633533461`) // Application ID https://discord.com/developers/applications/{applicationId}/information copy ApplicationId
        .setAssetsLargeImage(`1350869594876678194`) // Large Image ID https://discord.com/developers/applications/{applicationId}/rich-presence/assets upload image
        .setAssetsSmallImage(`1076405342960877608`) // Small Image ID https://discord.com/api/v9/oauth2/applications/{applicationId}/assets copy id
        .setAssetsLargeText(`Palestine number one!`) // Text Large Image
        .setAssetsSmallText(`Palestine number one!`) // Text Small Image
        .setState(`${clock()} ${moment().utcOffset('+07:00').format('h:mm:ss A')} Indonesia/Java`) // State
        .setDetails(`Palestine number one!`) // Details
		.setStartTimestamp(moment().unix()) // Konversi ke UTC
	
// ➕ Tambahkan Tombol dari Set Saat Ini
    buttons.forEach(btn => {
        status.addButton(btn.label, btn.url);
    });
        client.user.setActivity(status) // Activate
		index = (index + 1) % buttonSets.length; // Ganti tombol ke set berikutnya (looping)
}
// 🚀 Event Ketika Bot Siap
client.on('ready', async () => {
    console.log(`\x1b[32m✅ Bot Discord Terhubung!\x1b[0m`); // Warna Hijau di Konsol
    setInterval(() => {
        setActivity();
        //console.log(`\x1b[36m[🔘] Button Set Aktif: ${index + 1}/${buttonSets.length}\x1b[0m`); // Warna Biru Muda di Konsol
    }, 15000); // Perbarui setiap 1 detik
});

client.login(''); // how to get token? https://www.npmjs.com/package/discord.js-selfbot-v13