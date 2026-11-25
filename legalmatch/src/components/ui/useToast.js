import { useState } from "react";

/** Call show("message") from anywhere in a screen, render <Toast {...toast} />
 * once at the bottom of that screen (brief section B2). */
export function useToast() {
  const [state, setState] = useState({ message: "", visible: false });

  function show(message, duration = 2200) {
    setState({ message, visible: true });
    window.setTimeout(() => setState((s) => ({ ...s, visible: false })), duration);
  }

  return { ...state, show };
}
