import { useState } from "react";
import { runAssistantTurn } from "./caseApi";
import { Screen, TitleBar } from "../ui/Screen";
import { Button } from "../ui/Controls";
import { ChatBubble } from "../ui/Chat";
import { AIBadge } from "../ui/Badges";

const GREETING = "Hi! Tell me what happened and I'll help structure your case.";

/**
 * Adaptive chat intake (Deliverable 4, section 5) - replaces the old fixed
 * four-question script. Every turn is one call to
 * POST /api/ai/assistant-turn; the server picks the next question (or
 * decides it's ready to draft) based on the practice area and whatever
 * case_facts slots are still missing - see services/assistantEngine.js.
 * The mock provider never gives legal advice or predicts outcomes
 * (declines "will I win?"-style questions but keeps gathering facts).
 */
export default function AiAssistantScreen({ onBack, onSwitchToScan, onSkipManual, onContinue }) {
  const [messages, setMessages] = useState([{ role: "ai", text: GREETING, key: "greeting" }]);
  const [conversationState, setConversationState] = useState({});
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");

  async function handleSend() {
    if (!input.trim() || sending) return;
    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "me", text: userMessage, key: `me-${prev.length}` }]);
    setInput("");
    setSending(true);
    setError("");

    const result = await runAssistantTurn(conversationState, userMessage);
    setSending(false);

    if (!result.ok) {
      setError(result.error || "Could not reach the assistant - you can still continue manually.");
      return;
    }

    setConversationState(result.state || {});
    setMessages((prev) => [
      ...prev,
      { role: result.readyToDraft ? "draft" : "ai", text: result.reply, key: `ai-${prev.length}` },
    ]);
    if (result.readyToDraft) setDraft(result.draft);
  }

  return (
    <Screen>
      <TitleBar
        title={<>AI Assistant <AIBadge>NEW</AIBadge></>}
        onBack={onBack}
        action={onSwitchToScan}
        actionLabel="Scan"
      />
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex-1 flex flex-col gap-2 overflow-y-auto mb-2">
          {messages.map((m) => (
            <ChatBubble key={m.key} variant={m.role}>{m.text}</ChatBubble>
          ))}
          {sending && <ChatBubble variant="ai">Thinking…</ChatBubble>}
          {draft && (
            <p className="text-[11px] text-slate text-center py-1">Review before continuing?</p>
          )}
        </div>

        {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

        {!draft ? (
          <>
            <div className="flex items-center border border-border-strong rounded-full px-3 py-1.5 mb-2 gap-2 min-h-11">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
                placeholder="Type your message…"
                disabled={sending}
                className="flex-1 text-[12px] outline-none bg-transparent text-body"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="text-navy font-bold text-[12px] disabled:opacity-40 px-1"
              >
                Send
              </button>
            </div>
            <button type="button" onClick={onSkipManual} className="text-[11px] text-slate underline text-center py-1">
              Prefer to enter details manually instead?
            </button>
          </>
        ) : (
          <Button onClick={() => onContinue(draft)}>Review &amp; continue →</Button>
        )}
      </div>
    </Screen>
  );
}
