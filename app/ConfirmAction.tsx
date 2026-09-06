"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
const Context = createContext<(message: string) => Promise<boolean>>(
  async () => false,
);
export const useConfirm = () => useContext(Context);
export default function ConfirmProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  const resolve = useRef<((result: boolean) => void) | null>(null),
    dialog = useRef<HTMLElement>(null);
  const finish = useCallback((result: boolean) => {
    resolve.current?.(result);
    resolve.current = null;
    setMessage("");
  }, []);
  const confirm = useCallback(
    (text: string) =>
      new Promise<boolean>((done) => {
        resolve.current?.(false);
        resolve.current = done;
        setMessage(text);
      }),
    [],
  );
  useEffect(() => {
    if (!message) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        finish(false);
      }
      if (e.key === "Tab") {
        const buttons =
          dialog.current?.querySelectorAll<HTMLButtonElement>("button");
        if (!buttons) return;
        const first = buttons[0],
          last = buttons[buttons.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus({ preventScroll: true });
    };
  }, [message, finish]);
  return (
    <Context.Provider value={confirm}>
      {children}
      {message && (
        <div className="notebook confirmation-root">
          <div className="note-modal-backdrop">
            <section
              ref={dialog}
              className="note-modal"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              aria-describedby="confirm-message"
            >
              <h2 id="confirm-title">操作の確認</h2>
              <p id="confirm-message">{message}</p>
              <div className="action-grid">
                <button onClick={() => finish(false)}>キャンセル</button>
                <button className="primary" onClick={() => finish(true)}>
                  続ける
                </button>
              </div>
            </section>
          </div>
        </div>
      )}
    </Context.Provider>
  );
}
