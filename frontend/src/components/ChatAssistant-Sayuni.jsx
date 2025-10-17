import React, { useState, useRef, useEffect } from "react";
import axiosClient from "../api/axiosClient";
import { FiMessageCircle, FiX, FiSend } from "react-icons/fi";

/*
  Floating AI Chat Assistant (Phase 1 - rule based backend)
  Usage: place <ChatAssistant /> once near root (e.g., in App.jsx)
*/
export default function ChatAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi! I can help with allowance, last order, simple recommendations. Ask me something!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function send() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);
    try {
      // Build endpoint defensively: avoid double /api if baseURL already ends with /api
      // axiosClient.baseURL is not directly exposed; rely on path pattern
      let endpoint = "/api/ai/chat";
      // If user configured VITE_API_BASE_URL containing /api already, use single /ai/chat
      const envBase = import.meta.env.VITE_API_BASE_URL || ""; // compile-time replacement
      if (envBase.match(/\/api\/?$/)) {
        endpoint = "/ai/chat";
      }
      console.debug("[ChatAssistant] POST", endpoint, { base: envBase });
      const { data } = await axiosClient.post(endpoint, { message: trimmed });
      setMessages((m) => [
        ...m,
        { role: "assistant", text: data.reply || "(no reply)" },
      ]);
      // (Optional) handle data.actions later (reorder, suggest item, etc.)
    } catch (e) {
      const status = e?.response?.status;
      const url = e?.config?.url;
      const msg =
        e?.response?.data?.reply ||
        e?.response?.data?.error ||
        e.message ||
        "Error reaching assistant";
      console.warn("[ChatAssistant] request failed", {
        status,
        url,
        msg,
        data: e?.response?.data,
      });
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: `Error${status ? ` ${status}` : ""}: ${msg}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="fixed z-50 bottom-4 right-4">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full shadow-md bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:scale-[1.03] transition"
        >
          <FiMessageCircle /> Chat
        </button>
      )}
      {open && (
        <div className="w-80 h-[470px] bg-white/90 backdrop-blur border border-slate-200 rounded-xl shadow-xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
            <span className="font-medium text-sm">Assistant</span>
            <button
              onClick={() => setOpen(false)}
              className="p-1 hover:bg-white/20 rounded"
            >
              <FiX />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 text-sm">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "assistant"
                    ? "flex items-start gap-2"
                    : "flex justify-end"
                }
              >
                {m.role === "assistant" && (
                  <div className="shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center text-xs">
                    AI
                  </div>
                )}
                <div
                  className={
                    "max-w-[75%] rounded-lg px-3 py-2 shadow-sm " +
                    (m.role === "assistant"
                      ? "bg-white border border-slate-200 text-slate-800"
                      : "bg-indigo-500 text-white")
                  }
                >
                  {m.text}
                </div>
                {m.role === "user" && (
                  <div className="shrink-0 w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs">
                    You
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-start gap-2">
                <div className="shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center text-xs">
                  AI
                </div>
                <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-500 animate-pulse">
                  Thinking…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="border-t p-2 flex items-center gap-2 bg-slate-50"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              placeholder="Ask something..."
              className="resize-none flex-1 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 px-2 py-1 text-sm bg-white"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2 rounded-md bg-indigo-500 text-white disabled:opacity-40 hover:bg-indigo-600 transition"
            >
              <FiSend />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
