/** ai/me/draft chat bubble (brief section B2). */
export function ChatBubble({ variant = "ai", children }) {
  const variants = {
    ai: "self-start bg-ice text-body rounded-bl-sm",
    me: "self-end bg-navy text-white rounded-br-sm",
    draft: "self-start bg-white border border-dashed border-gold text-body rounded-bl-sm",
  };
  return (
    <div className={`max-w-[80%] text-[11.5px] leading-relaxed px-3 py-2.5 rounded-xl ${variants[variant]}`}>
      {children}
    </div>
  );
}
