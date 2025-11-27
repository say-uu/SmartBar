import React, { useState, useRef, useEffect } from "react";
import "../styles/chatAnimations.css";
import { FiMessageCircle, FiX, FiSend, FiRefreshCcw } from "react-icons/fi";
import axiosClient from "../api/axiosClient";

/*
  Enhanced Chat Assistant (rule-based backend)
  Shows floating button when authenticated cadet user is present.
  Does not render backend action chips (ADD_TO_CART / REORDER_LAST)
*/

export default function ChatAssistant({ enabled }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi! Ask about allowance, last order, recommendations, prices, 'how many items under 500', or category lists.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Auto show once after login (per session)
  useEffect(() => {
    if (enabled && !sessionStorage.getItem("chat_auto_shown")) {
      sessionStorage.setItem("chat_auto_shown", "1");
      setOpen(true);
    }
  }, [enabled]);

  if (!enabled) return null;

  function toggleOpen() {
    if (open) {
      setClosing(true);
      // allow exit animation
      setTimeout(() => {
        setOpen(false);
        setClosing(false);
      }, 320);
    } else {
      setOpen(true);
    }
  }

  async function sendMessage(textOverride) {
    const outgoing = (textOverride ?? input).trim();
    if (!outgoing || loading) return;
    setMessages((m) => [...m, { role: "user", text: outgoing }]);
    if (!textOverride) setInput("");
    setLoading(true);
    try {
      const { data } = await axiosClient.post("/api/ai/chat", {
        message: outgoing,
      });
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: data.reply || "(no reply)",
          actions: data.actions || [],
        },
      ]);
    } catch (e) {
      const status = e?.response?.status;
      let msg =
        e?.response?.data?.reply ||
        e?.response?.data?.error ||
        e.message ||
        "Error reaching assistant";
      if (status === 401) {
        msg = "Not authorized (401). Please log in again.";
      } else if (status === 403) {
        msg = "Token rejected (403). Try logging out and back in.";
      } else if (status === 404) {
        msg = "Assistant endpoint not found (404).";
      }
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: `Error${status ? " " + status : ""}: ${msg}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    sendMessage();
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleAction(action) {
    // Action chips are intentionally ignored on the client UI.
    return;
  }

  return (
    <div className="fixed z-50 bottom-4 right-4">
      {!open && (
        <button
          onClick={toggleOpen}
          className="chat-fab-floating flex items-center gap-2 px-4 py-2 rounded-full shadow-md bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:scale-[1.08] transition transform"
        >
          <FiMessageCircle /> Chat
        </button>
      )}
      {open && (
        <div
          className={`w-80 h-[520px] bg-white/95 backdrop-blur border border-slate-200 rounded-xl shadow-xl flex flex-col overflow-hidden ${
            closing ? "chat-panel-exit" : "chat-panel-enter"
          }`}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
            <span className="font-medium text-sm">Assistant</span>
            <div className="flex items-center gap-1">
              <button
                title="Reset"
                onClick={() =>
                  setMessages([
                    {
                      role: "assistant",
                      text: "Chat cleared. Ask about allowance, orders, recommendations, prices, budgets.",
                    },
                  ])
                }
                className="p-1 hover:bg-white/20 rounded"
              >
                <FiRefreshCcw />
              </button>
              <button
                onClick={toggleOpen}
                className="p-1 hover:bg-white/20 rounded"
              >
                <FiX />
              </button>
            </div>
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
                    "max-w-[75%] rounded-lg px-3 py-2 shadow-sm whitespace-pre-line " +
                    (m.role === "assistant"
                      ? "bg-white border border-slate-200 text-slate-800"
                      : "bg-indigo-500 text-white")
                  }
                >
                  {m.text}
                  {m.actions && m.actions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.actions
                        .filter(
                          (a) =>
                            a.type !== "REORDER_LAST" &&
                            a.type !== "ADD_TO_CART"
                        )
                        .map((a, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleAction(a)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 border border-indigo-200"
                          >
                            {a.name || a.type}
                          </button>
                        ))}
                    </div>
                  )}
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
            onSubmit={onSubmit}
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
