const fs = require("fs");

/**
 * Fungsi untuk mendapatkan daftar admin grup
 * @param {Array} participants - Daftar peserta grup
 * @returns {Array} - Daftar ID admin
 */
exports.getGroupAdmins = (participants) => {
    let admins = [];
    for (let i of participants) {
        if (i.admin === "superadmin" || i.admin === "admin") {
            admins.push(i.id);
        }
    }
    return admins || [];
};

/**
 * Fungsi delay (sleep)
 * @param {Number} ms - Waktu delay dalam milidetik
 * @returns {Promise}
 */
exports.sleep = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Cek apakah string adalah URL
 * @param {String} url - URL yang dicek
 * @returns {Boolean} - True jika URL valid, false jika tidak
 */
exports.isUrl = (url) => {
    return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/, 'gi'));
};

/**
 * Fungsi untuk mengirim pesan teks
 * @param {Object} client - Instance dari Baileys (WhatsApp bot)
 * @param {String} jid - ID penerima pesan
 * @param {String} text - Isi pesan
 * @param {Object} [quoted=null] - Pesan yang dikutip (jika ada)
 */
exports.TextReply = async (client, jid, text, quoted = null) => {
    await client.sendMessage(jid, { text: text }, { quoted: quoted });
};

/**
 * Fungsi untuk mengirim gambar dengan teks
 * @param {Object} client - Instance dari Baileys
 * @param {String} jid - ID penerima pesan
 * @param {String} text - Teks yang akan muncul di bawah gambar
 * @param {String} image - Path lokasi gambar
 * @param {Object} [quoted=null] - Pesan yang dikutip (jika ada)
 */
exports.ImgReply = async (client, jid, text, image, quoted = null) => {
    try {
        // ✅ Pastikan path gambar valid
        if (!image || !fs.existsSync(image)) {
            return exports.TextReply(client, jid, "❌ Gambar tidak ditemukan!", quoted);
        }

        // ✅ Gunakan metode stream agar lebih stabil
        const message = {
            image: { stream: fs.createReadStream(image) },
            caption: text || "📜 Tidak ada teks disertakan.",
            footer: "🤖 SelfBot by Panggigo"
        };

        await client.sendMessage(jid, message, { quoted: quoted });

    } catch (error) {
        console.error("❌ Error dalam ImgReply:", error);
        exports.TextReply(client, jid, "❌ Terjadi kesalahan saat mengirim gambar.", quoted);
    }
};
