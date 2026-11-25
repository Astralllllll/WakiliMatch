export function Toast({ message, visible }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "fixed bottom-6 left-1/2 -translate-x-1/2 bg-navy text-white px-5 py-3 rounded-md text-[12.5px]",
        "font-semibold shadow-lg transition-all z-50 max-w-[90vw] text-center",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none",
      ].join(" ")}
    >
      {message}
    </div>
  );
}
