import express from "express";
import Replicate from "replicate";
import fs from "fs";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Load FAQ JSON
const faqData = JSON.parse(fs.readFileSync("./faq.json", "utf-8"));

// Deteksi sapaan
function detectSapaan(question) {
  if (/bro/i.test(question)) return "bro";
  if (/mas/i.test(question)) return "mas";
  if (/sis/i.test(question)) return "sis";
  if (/kak/i.test(question)) return "kak";
  return "bang";
}

// Randomisasi posisi sapaan
function randomizeSapaan(answer, sapaan) {
  let cleaned = answer
    .replace(/User:.*/gi, "")
    .replace(/Jawabanmu:.*/gi, "")
    .trim();

  const variations = [
    `${sapaan}, ${cleaned}`,
    `${cleaned} ${sapaan}`,
    cleaned.replace(/([.!?])/, ` ${sapaan}$1`),
    cleaned,
  ];

  return variations[Math.floor(Math.random() * variations.length)];
}

// Bersihkan URL agar tidak ada sapaan nyelip di dalam link
function cleanUrls(text) {
  return text.replace(
    /(https?:\/\/\S+)/g,
    (match) => match.replace(/[^a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=%]/g, "")
  );
}

app.post("/ask", async (req, res) => {
  const { question } = req.body;
  const sapaan = detectSapaan(question);

  const input = {
    prompt: `
Kamu adalah chatbot FAQ Hacktiv8.

Aturan:
- Balas dalam bahasa & gaya yang sama dengan pertanyaan user (Jawa, santai, baku, Inggris).
- Jangan mencampur bahasa kecuali user juga campur.
- Jawaban maksimal 2 kalimat.
- Jika pertanyaan cocok dengan FAQ, jawab berdasarkan FAQ, tapi ubah bahasanya agar natural sesuai gaya user.
- Jika pertanyaan **tidak ada di FAQ**, jangan ngarang link! 
  Hanya boleh jawab:
  - "Coba hubungi admin lewat WhatsApp ya."
  - atau "Kamu bisa cek di sini: https://bit.ly/sdicodematerials"
  Pilih salah satu, lalu sampaikan dengan gaya bahasa user.
- Gunakan sapaan "${sapaan}" secara natural (kadang di awal, tengah, atau akhir).

FAQ:
${faqData.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n")}

User: ${question}
Jawaban (≤2 kalimat, gaya bahasa sesuai user):
    `
  };

  try {
    const output = await replicate.run(
      "ibm-granite/granite-3.3-8b-instruct",
      { input }
    );

    let rawAnswer = Array.isArray(output) ? output.join("") : String(output);
    let finalAnswer = randomizeSapaan(rawAnswer, sapaan);

    // Batasi hanya 2 kalimat
    const sentences = finalAnswer.split(/(?<=[.!?])\s+/);
    finalAnswer = sentences.slice(0, 2).join(" ");

    // Bersihkan URL sebelum dikirim
    finalAnswer = cleanUrls(finalAnswer);

    res.json({ answer: finalAnswer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan saat memproses pertanyaan." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
