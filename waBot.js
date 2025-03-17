const { 
    default: makeWASocket, 
    downloadContentFromMessage, 
    DisconnectReason, 
    useMultiFileAuthState, 
    getContentType 
} = require('@whiskeysockets/baileys');

const fs = require('fs');
const path = "./session/";
const pino = require('pino');
const qrcode = require("qrcode-terminal");

//=========== Function ==============\\
const { TextReply, ImgReply, isUrl, sleep, getGroupAdmins } = require('./Lib/function');

//=========== Database ==============\\
const setting = JSON.parse(fs.readFileSync('./Database/settings.json'));

let prefix = setting.prefix;
let publicMode = setting.public; // Ubah nama variabel agar lebih jelas
let ownerNumber = setting.noOwner; // Nomor pemilik bot
let bot = setting.bot;

//=================== Start Bot ===================\\
async function StartBot() {
    const { state, saveCreds } = await useMultiFileAuthState("./session");

    const client = makeWASocket({
        logger: pino({ level: "silent" }),
        printQRInTerminal: true,
        auth: state
    });

    // ✅ Pastikan `saveCreds` adalah fungsi sebelum digunakan
    if (typeof saveCreds === "function") {
        client.ev.on("creds.update", saveCreds);
    } else {
        console.error("❌ ERROR: saveCreds bukan fungsi yang valid.");
    }

    // ✅ Event untuk menangani koneksi
    client.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log("📌 Scan QR Code ini untuk login:");
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'close') {
            if (lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut) {
                console.log("❌ Sesi kadaluarsa! Silakan scan ulang QR Code.");
                process.exit();
            } else {
                console.log("🔄 Bot terputus, mencoba menyambung ulang...");
                StartBot();
            }
        } else if (connection === "open") {
            // 🔄 Hapus file session setiap 5 menit, kecuali creds.json
            setInterval(() => {
                fs.readdir(path, (err, files) => {
                    if (err) return console.error("❌ Error membaca folder session:", err);

                    let deletedFiles = []; // 📌 Array untuk menyimpan nama file yang berhasil dihapus

                    files.forEach(file => {
                        if (file !== "creds.json") { // Jangan hapus creds.json
                            fs.unlink(`${path}/${file}`, (err) => {
                                if (!err) deletedFiles.push(file);
                            });
                        }
                    });

                    // 🗑️ Cetak hanya satu log jika ada file yang berhasil dihapus
                    setTimeout(() => {
                        if (deletedFiles.length > 0) {
                            console.log(`🗑️ Menghapus ${deletedFiles.length} file session: ${deletedFiles.join(", ")}`);
                        }
                    }, 1000); // 🔄 Beri sedikit delay agar fs.unlink() selesai
                });
            }, 5 * 60 * 1000); // ✅ Setiap 5 menit (5 * 60 * 1000 ms)
            console.log(`\x1b[32m✅ Bot WhatsApp Terhubung!\x1b[0m`);
        }
    });

    // ✅ Event untuk menangani pesan masuk
    client.ev.on('messages.upsert', async ({ messages }) => {
        const info = messages[0];
        if (!info.message) return;
        if (!info.key.fromMe) return;

        const from = info.key.remoteJid;
        const type = getContentType(info.message);
        const fromMe = info.key.fromMe;
        const isGroup = from.endsWith("@g.us");
        const pushname = info.pushName ? info.pushName: `${bot}`
        const isCreator = (info.key.fromMe || from === ownerNumber); // Perbaiki cek kepemilikan bot

        // ✅ Ambil isi pesan
        var body = (type === 'conversation') ? info.message.conversation :
            (type == 'imageMessage') ? info.message.imageMessage.caption :
            (type == 'videoMessage') ? info.message.videoMessage.caption :
            (type == 'extendedTextMessage') ? info.message.extendedTextMessage.text :
            (type == 'buttonsResponseMessage') ? info.message.buttonsResponseMessage.selectedButtonId :
            (type == 'listResponseMessage') ? info.message.listResponseMessage.singleSelectReply.selectedRowId :
            (type == 'templateButtonReplyMessage') ? info.message.templateButtonReplyMessage.selectedId :
            (type === 'messageContextInfo') ? (info.message.buttonsResponseMessage?.selectedButtonId || info.message.listResponseMessage?.singleSelectReply.selectedRowId || info.text) : '';

        const args = body.trim().split(/ +/).slice(1);
        const isCmd = body.startsWith(prefix);
        const command = isCmd ? body.slice(1).trim().split(/ +/).shift().toLowerCase() : null;

        //Function Message
        const reply = (text) => { TextReply(client, from, text, info); }
        const ImgMessage = (text, image) => { ImgReply(client, from, text, image, info); }
        //Log Console
        if (isCmd) { console.log(`📩 Command: ${command} | Dari: ${pushname}`); }

        if (!publicMode) { // ✅ Gunakan `publicMode` yang benar
            if (!isCreator) return; // Jika bukan owner, bot tidak akan merespon
        }
        try {
            switch(command) {
                case 'setprefix':
                    try {
                        if (!isCreator) return reply('⚠️ Hanya pemilik bot yang bisa mengubah prefix!');
                        if (!args[0]) return reply(`❌ Gunakan: ${prefix}setprefix [prefix_baru]`);

                        // ✅ Ubah prefix dalam settings.json
                        setting.prefix = args[0];
                        fs.writeFileSync('./Database/settings.json', JSON.stringify(setting, null, '\t'));

                        // ✅ Perbarui variabel prefix yang sedang digunakan
                        prefix = setting.prefix;
                        reply(`✅ Prefix berhasil diubah menjadi *${args[0]}*`);
                    } catch (error) {
                        console.error("❌ Error saat mengubah prefix:", error); // ✅ Log error di console
                        reply("❌ Terjadi kesalahan saat mengubah prefix. Coba lagi nanti.");
                    }
                break;
                case 'setmode':
                    try {
                        if (!isCreator) return reply('⚠️ Hanya pemilik bot yang bisa mengubah mode bot!');
                        if (!args || args.length === 0) return reply(`❌ Gunakan: ${prefix}setmode [public/private]`);
                        const mode = args[0].toLowerCase();
                        if (mode !== "public" && mode !== "private") {
                            return reply(`❌ Pilihan tidak valid! Gunakan: \n• ${prefix}setmode public\n• ${prefix}setmode private`);
                        }

                        // ✅ Ubah mode dalam settings.json
                        setting.public = mode === "public";
                        fs.writeFileSync('./Database/settings.json', JSON.stringify(setting, null, '\t'));

                        // ✅ Perbarui mode bot secara langsung
                        publicMode = setting.public;

                        reply(`✅ Mode bot berhasil diubah menjadi *${mode.toUpperCase()}*`);
                    } catch (error) {
                        console.error("❌ Error saat mengubah mode:", error);
                        reply("❌ Terjadi kesalahan saat mengubah mode bot. Coba lagi nanti.");
                    }
                break;
// ========================= 📌 FITUR PRIBADI ========================= \\
                case 'setpp': 
                    try {
                        if (!isCreator) return reply("⚠️ Hanya pemilik bot yang bisa mengganti foto profil!");
                        if (!info.message.imageMessage) return reply("❌ Kirim gambar dengan caption *!setpp* untuk mengubah foto profil!");

                        const buffer = await downloadContentFromMessage(info.message.imageMessage, "image");
                        let data = Buffer.from([]);
                        for await (const chunk of buffer) {
                            data = Buffer.concat([data, chunk]);
                        }

                        await client.updateProfilePicture(from, data);
                        reply("✅ Foto profil berhasil diperbarui!");
                    } catch (error) {
                        console.error("❌ Error saat mengganti foto profil:", error);
                        reply("❌ Gagal mengubah foto profil.");
                    }
                break;

                case 'setbio': 
                    try {
                        if (!isCreator) return reply("⚠️ Hanya pemilik bot yang bisa mengubah bio!");
                        if (!args.length) return reply("❌ Gunakan: *!setbio [teks_baru]*");

                        const newBio = args.join(" ");
                        await client.updateProfileStatus(newBio);
                        reply(`✅ Bio berhasil diperbarui menjadi:\n_${newBio}_`);
                    } catch (error) {
                        console.error("❌ Error saat mengganti bio:", error);
                        reply("❌ Gagal mengubah bio.");
                    }
                break;

                case 'block': 
                    try {
                        if (!isCreator) return reply("⚠️ Hanya pemilik bot yang bisa memblokir nomor!");
                        if (!info.message.extendedTextMessage) return reply("❌ Balas pesan seseorang dengan caption *!block* untuk memblokirnya!");

                        const target = info.message.extendedTextMessage.contextInfo.participant;
                        await client.updateBlockStatus(target, "block");
                        reply(`✅ @${target.split("@")[0]} telah diblokir.`);
                    } catch (error) {
                        console.error("❌ Error saat memblokir:", error);
                        reply("❌ Gagal memblokir nomor.");
                    }
                break;

                case 'unblock': 
                    try {
                        if (!isCreator) return reply("⚠️ Hanya pemilik bot yang bisa membuka blokir!");
                        if (!info.message.extendedTextMessage) return reply("❌ Balas pesan seseorang dengan caption *!unblock* untuk membuka blokir!");

                        const target = info.message.extendedTextMessage.contextInfo.participant;
                        await client.updateBlockStatus(target, "unblock");
                        reply(`✅ @${target.split("@")[0]} telah dibuka blokirnya.`);
                    } catch (error) {
                        console.error("❌ Error saat membuka blokir:", error);
                        reply("❌ Gagal membuka blokir.");
                    }
                break;
// ========================= 📌 FITUR GRUP ========================= \\
                case 'kick': 
                    try {
                        if (!isGroup) return reply("⚠️ Perintah ini hanya bisa digunakan di dalam grup!");
                        if (!isCreator) return reply("⚠️ Hanya admin yang bisa mengeluarkan anggota!");
                        if (!info.message.extendedTextMessage) return reply("❌ Balas pesan seseorang dengan caption *!kick* untuk mengeluarkan!");

                        const target = info.message.extendedTextMessage.contextInfo.participant;
                        await client.groupParticipantsUpdate(from, [target], "remove");
                        reply(`✅ Berhasil mengeluarkan @${target.split("@")[0]}`);
                    } catch (error) {
                        console.error("❌ Error saat mengeluarkan anggota:", error);
                        reply("❌ Gagal mengeluarkan anggota.");
                    }
                break;

                case 'add': 
                    try {
                        if (!isGroup) return reply("⚠️ Perintah ini hanya bisa digunakan di dalam grup!");
                        if (!isCreator) return reply("⚠️ Hanya admin yang bisa menambahkan anggota!");
                        if (!args[0]) return reply("❌ Gunakan: *!add 628xxx*");

                        const number = args[0].replace(/\D/g, "") + "@s.whatsapp.net";
                        await client.groupParticipantsUpdate(from, [number], "add");
                        reply(`✅ Berhasil menambahkan @${args[0]}`);
                    } catch (error) {
                        console.error("❌ Error saat menambahkan anggota:", error);
                        reply("❌ Gagal menambahkan anggota.");
                    }
                break;

                case 'promote': 
                    try {
                        if (!isGroup) return reply("⚠️ Perintah ini hanya bisa digunakan di dalam grup!");
                        if (!isCreator) return reply("⚠️ Hanya admin yang bisa mempromosikan anggota!");
                        if (!info.message.extendedTextMessage) return reply("❌ Balas pesan seseorang dengan caption *!promote* untuk menjadikannya admin!");

                        const target = info.message.extendedTextMessage.contextInfo.participant;
                        await client.groupParticipantsUpdate(from, [target], "promote");
                        reply(`✅ @${target.split("@")[0]} telah menjadi admin!`);
                    } catch (error) {
                        console.error("❌ Error saat mempromosikan:", error);
                        reply("❌ Gagal mempromosikan anggota.");
                    }
                break;

                case 'demote': 
                    try {
                        if (!isGroup) return reply("⚠️ Perintah ini hanya bisa digunakan di dalam grup!");
                        if (!isCreator) return reply("⚠️ Hanya admin yang bisa menurunkan jabatan!");
                        if (!info.message.extendedTextMessage) return reply("❌ Balas pesan seseorang dengan caption *!demote* untuk menurunkannya dari admin!");

                        const target = info.message.extendedTextMessage.contextInfo.participant;
                        await client.groupParticipantsUpdate(from, [target], "demote");
                        reply(`✅ @${target.split("@")[0]} telah diturunkan dari admin.`);
                    } catch (error) {
                        console.error("❌ Error saat menurunkan:", error);
                        reply("❌ Gagal menurunkan admin.");
                    }
                break;

                case 'menu':
                case 'help':
                    try {
                        const MenuText = `📜 *Menu Bot - SelfBot by Jawa*\n
🔹 *${prefix}menu* - Menampilkan daftar perintah
🔹 *${prefix}setpp* - Mengubah foto profil bot (balas dengan gambar)
🔹 *${prefix}setbio [teks]* - Mengubah bio bot

📌 *Perintah Grup:*
🔹 *${prefix}kick* - Mengeluarkan anggota (balas pesan)
🔹 *${prefix}add 628xxx* - Menambahkan anggota ke grup
🔹 *${prefix}promote* - Menjadikan anggota sebagai admin (balas pesan)
🔹 *${prefix}demote* - Menurunkan admin menjadi anggota biasa (balas pesan)

🔐 *Perintah Blokir:*
🔹 *${prefix}block* - Memblokir nomor WhatsApp (balas pesan)
🔹 *${prefix}unblock* - Membuka blokir nomor WhatsApp (balas pesan)

🛠️ *Perintah Lainnya:*
🔹 *${prefix}ping* - Mengecek respons bot
🔹 *${prefix}source* - Menampilkan source code bot`;
                        const MenuImage = "./Media/Foto/menu.jpeg";
                    
                        await ImgMessage(MenuText, MenuImage);
                    } catch (error) {
                        console.error("❌ Error dalam menu command:", error);
                        reply("❌ Terjadi kesalahan saat menampilkan menu.");
                    }
                break;
                case 'ping':
                    try {
                        const start = Date.now();
                        const pong = await reply("🏓 *Pinging...*");
                        const end = Date.now();
                        const pingTime = end - start;
                        reply(`🏓 Pong!\n⏳ *Speed*: ${pingTime} ms`);
                    } catch (error) {
                        console.error("❌ Error dalam command ping:", error);
                        reply("❌ Terjadi kesalahan saat mengecek ping.");
                    }
                break;
                case 'source':
                    try {
                        const sourceText = `📜 *Source Code Bot*\n\n🔗 GitHub: https://github.com/Panggigo/SelfBot-WA\n\nJangan lupa kasih ⭐ di GitHub!`;
                        reply(sourceText);
                    } catch (error) {
                        console.error("❌ Error dalam command source:", error);
                        reply("❌ Terjadi kesalahan saat menampilkan source.");
                    }
                break;


                default:
                    if (isCmd) reply(`⚠️ Perintah *${command}* tidak ditemukan.`);
                    break;
            }
        } catch (error) {
            console.error("❌ Error di command:", error);
        }
    });
}
StartBot()
