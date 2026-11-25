/** default/top/limited tag chip (brief section B2). */
export function Tag({ children, variant = "default" }) {
  const variants = {
    default: "bg-ice text-navy border border-border",
    top: "bg-navy text-white border-none",
    limited: "bg-[#FBEFE0] text-[#8A5A00] border-none",
  };
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${variants[variant]}`}>
      {children}
    </span>
  );
}

/** "NEW" / "AI" / "✦ AI" badge. soft=true uses gold-text (never raw gold)
 * since this renders on a light background (brief's contrast rule). */
export function AIBadge({ children = "AI", soft = false }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 text-[8.5px] font-bold tracking-wide px-1.5 py-0.5 rounded-full whitespace-nowrap",
        soft ? "bg-ice text-gold-text border border-gold" : "bg-gold text-navy-deep",
      ].join(" ")}
    >
      {children}
    </span>
  );
}
