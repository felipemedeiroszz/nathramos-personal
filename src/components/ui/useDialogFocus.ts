"use client";
import { useEffect, useRef, type RefObject } from "react";
const stack: symbol[] = [];
let originalOverflow = "";
export function useDialogFocus(
  open: boolean,
  onClose: () => void,
  ref: RefObject<HTMLDivElement>,
) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open || !ref.current) return;
    const token = Symbol();
    const previous = document.activeElement as HTMLElement | null;
    if (stack.length === 0) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    stack.push(token);
    const root = ref.current;
    const heading = root.querySelector("h1,h2,h3");
    if (heading && root.getAttribute("aria-label") === "Dialog")
      root.setAttribute("aria-label", heading.textContent || "Dialog");
    const focusable = () =>
      Array.from(
        root.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
        ),
      ).filter((el) => el.getClientRects().length > 0);
    (focusable()[0] || root).focus();
    const key = (event: KeyboardEvent) => {
      if (stack[stack.length - 1] !== token) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close.current();
      }
      if (event.key === "Tab") {
        const items = focusable(),
          first = items[0],
          last = items[items.length - 1];
        if (!first) {
          event.preventDefault();
          root.focus();
        } else if (
          event.shiftKey &&
          (document.activeElement === first ||
            !root.contains(document.activeElement))
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last ||
            !root.contains(document.activeElement))
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    const focus = (event: FocusEvent) => {
      if (
        stack[stack.length - 1] === token &&
        !root.contains(event.target as Node)
      )
        (focusable()[0] || root).focus();
    };
    document.addEventListener("keydown", key, true);
    document.addEventListener("focusin", focus);
    return () => {
      document.removeEventListener("keydown", key, true);
      document.removeEventListener("focusin", focus);
      const index = stack.indexOf(token);
      if (index >= 0) stack.splice(index, 1);
      if (!stack.length) document.body.style.overflow = originalOverflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [open, ref]);
}
