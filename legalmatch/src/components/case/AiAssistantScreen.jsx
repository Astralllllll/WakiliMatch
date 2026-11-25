import { useState } from "react";
import { draftCaseFromAssistant } from "./caseApi";
import { Screen, TitleBar } from "../ui/Screen";
import { Button } from "../ui/Controls";
import { ChatBubble } from "../ui/Chat";
import { AIBadge } from "../ui/Badges";

const QUESTIONS = [
  { key: "whatHappened", prompt: "Hi! Tell me what happened and I'll help structure your case." },
  { key: "when", prompt: "When did this happen?" },
  { key: "noticeOrSeverance", prompt: "Was any notice or severance given, if relevant to your situation?" },
  { key: "location", prompt: "Which county is this in?" },
];

/**
 * Chat intake (brief sections B3/B6). The mock provider never gives legal
 * advice or predicts outcomes - it only asks these four fixed questions
 * and templates the answers back; a real provider wired in later must
 * keep the same guardrails (services/aiAssist.js's own comment).
 */
export default function AiAssistantScreen({ onBack, onSwitchToScan, onSkipManual, onContinue }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [input, setInput] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");

  const messages = [];
  QUESTIONS.slice(0, step + 1).forEach((q, i) => {
    messages.push({ role: "ai", text: q.prompt, key: `q-${i}` });
    if (answers[q.key] !== undefined) messages.push({ role: "me", text: answers[q.key], key: `a-${i}` });
  });

  async function handleSend() {
    if (!input.trim() || drafting) return;
    const key = QUESTIONS[step].key;
    const nextAnswers = { ...answers, [key]: input.trim() };
    setAnswers(nextAnswers);
    setInput("");

    if (step + 1 < QUESTIONS.length) {
      setStep(step + 1);
      return;
    }

    setDrafting(true);
    setError("");
    const result = await draftCaseFromAssistant(nextAnswers);
    setDrafting(false);
    if (!result.ok) {
      setError(result.error || "Could not draft your case automatically — you can still continue manually.");
      return;
    }
    setDraft(result.draft);
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
          {drafting && <ChatBubble variant="ai">Drafting your case…</ChatBubble>}
          {draft && (
            <ChatBubble variant="draft">
              <strong>Drafted your case</strong> as{" "}
              {draft.matchedArea && `${draft.matchedArea}, `}
              {draft.jurisdiction && `${draft.jurisdiction}, `}
              {draft.urgency ? `${draft.urgency} urgency` : "ready for review"}.
              {" "}Review before continuing?
            </ChatBubble>
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
                disabled={drafting}
                className="flex-1 text-[12px] outline-none bg-transparent text-body"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={drafting || !input.trim()}
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
