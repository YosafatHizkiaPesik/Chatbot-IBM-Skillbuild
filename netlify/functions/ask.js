import Replicate from "replicate";
import fs from "fs";
import path from "path";

// Ambil API token dari Environment Variable Netlify
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

// Load FAQ JSON dari root project (process.cwd())
const faqData = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "faq.json"), "utf-8")
);

// Fungsi deteksi sapaan
function detectSapaan(question) {
  if (/bro/i.test(question)) return "bro";
  if (/mas/i.test(question)) return "mas";
  if (/sis/i.test(question)) return "sis";
  if (/kak/i.test(question)) return "kak";
  return "bang";
}

// Fungsi randomisasi posisi sapaan
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

// Bersihkan URL agar tidak ada karakter aneh
function cleanUrls(text) {
  return text.replace(
    /(https?:\/\/\S+)/g,
    (match) => match.replace(/[^a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=%]/g, "")
  );
}

// Netlify serverless handler
export async function handler(event, context) {
  try {
    const { question } = JSON.parse(event.body); // ambil pertanyaan dari request body
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
${faqData.map(f => `Q: ${f.question}\nA: ${f.answer}`).join("\n")}

User: ${question}
Jawaban (≤2 kalimat, gaya bahasa sesuai user):
      `
    };

    // Jalankan model Replicate
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

    return {
      statusCode: 200,
      body: JSON.stringify({ answer: finalAnswer }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Terjadi kesalahan saat memproses pertanyaan." }),
    };
  }
}
