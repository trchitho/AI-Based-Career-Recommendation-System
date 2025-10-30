import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

const ChatPage = () => {
  const location = useLocation();
  const summary = (location.state as any)?.summary as string | undefined;
  const [messages, setMessages] = useState<Message[]>(() =>
    summary ? [{ role: "system", content: summary }] : [],
  );
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const msg: Message = { role: "user", content: input.trim() };
    setMessages((m) => [...m, msg]);
    setInput("");
    // Placeholder assistant echo; later replace by backend chatbot API
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Assistant (placeholder): I received your message and will process it.",
        },
      ]);
    }, 300);
  };

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Career Assistant</h1>
        <div className="border rounded p-4 h-[60vh] overflow-y-auto bg-white dark:bg-gray-900">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`mb-3 ${m.role === "user" ? "text-right" : "text-left"}`}
            >
              <div
                className={`inline-block px-3 py-2 rounded ${m.role === "user" ? "bg-purple-600 text-white" : m.role === "assistant" ? "bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100" : "bg-yellow-100 text-gray-800"}`}
              >
                {m.content}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <form onSubmit={send} className="mt-4 flex gap-2">
          <input
            className="flex-1 border rounded px-3 py-2"
            placeholder="Ask about careers, skills, learning..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button className="px-4 py-2 bg-purple-600 text-white rounded">
            Send
          </button>
        </form>
      </div>
    </MainLayout>
  );
};

export default ChatPage;
