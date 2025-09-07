import React, { useState, useEffect, useRef } from "react";

// Fungsi parse link jadi clickable
function parseMessage(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, i) => {
    if (urlRegex.test(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 underline hover:text-blue-300"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

export default function App() {
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Halo 👋 Saya Chatbot AI. Silakan tanya apa saja!" },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  // Auto scroll setiap ada pesan baru
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput(""); 

    try {
      // Panggil Netlify serverless function
      const res = await fetch("/.netlify/functions/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: input }),
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: data.answer || "⚠️ Terjadi error saat memproses pertanyaan.",
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "⚠️ Terjadi error saat menghubungi server." },
      ]);
    }
  };

  const showWelcome =
    messages.length === 1 && messages[0].sender === "bot";

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="bg-gray-800 p-4 shadow-md flex justify-between items-center border-b border-gray-700">
        <h1 className="font-bold text-lg">💬 Chatbot AI FAQ Hacktiv8</h1>
        <button
          onClick={() => window.open("https://ibmsdi.vercel.app/", "_blank")}
          className="bg-blue-600 px-3 py-1 rounded-lg text-white hover:bg-blue-700 transition"
        >
          📖 Lihat FAQ
        </button>
      </header>

      {/* Chat area */}
      <main className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col">
        {showWelcome ? (
          <div className="flex flex-col items-center justify-center text-center flex-1 text-gray-400">
            <p className="text-lg">Tanyakan apa saja tentang kelas IBM Skill Build</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`px-4 py-3 rounded-2xl max-w-xs md:max-w-md shadow-md text-sm ${
                  msg.sender === "user"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-gray-700 text-gray-200 rounded-bl-none"
                }`}
              >
                {parseMessage(msg.text)}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} /> {/* anchor auto-scroll */}
      </main>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="p-4 bg-gray-800 border-t border-gray-700 flex gap-2"
      >
        <input
          type="text"
          placeholder="Ketik pertanyaanmu..."
          className="flex-1 px-4 py-2 rounded-xl bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          className="bg-blue-600 px-5 py-2 rounded-xl font-medium text-white hover:bg-blue-700 transition"
        >
          Kirim
        </button>
      </form>
    </div>
  );
}
