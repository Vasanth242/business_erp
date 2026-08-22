import {
  useEffect,
  type ReactNode,
} from "react";

import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  maxWidth?: string;
  closeOnBackdrop?: boolean;
}

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = "max-w-3xl",
  closeOnBackdrop = true,
}: ModalProps) {

  /*
  |--------------------------------------------------------------------------
  | CLOSE WITH ESC
  |--------------------------------------------------------------------------
  */

  useEffect(() => {

    if (!open) {
      return;
    }

    function handleEscape(
      event: KeyboardEvent
    ) {

      if (event.key === "Escape") {
        onClose();
      }

    }

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {

      document.removeEventListener(
        "keydown",
        handleEscape
      );

    };

  }, [open, onClose]);


  /*
  |--------------------------------------------------------------------------
  | PREVENT BACKGROUND SCROLL
  |--------------------------------------------------------------------------
  */

  useEffect(() => {

    if (!open) {
      return;
    }

    const originalOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {

      document.body.style.overflow =
        originalOverflow;

    };

  }, [open]);


  /*
  |--------------------------------------------------------------------------
  | CLOSED
  |--------------------------------------------------------------------------
  */

  if (!open) {
    return null;
  }


  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div
      className="
        fixed inset-0 z-50
        flex items-center justify-center
        bg-black/40
        p-4
      "
      onMouseDown={(event) => {

        if (
          closeOnBackdrop &&
          event.target === event.currentTarget
        ) {
          onClose();
        }

      }}
    >

      <div
        className={`
          max-h-[90vh]
          w-full
          ${maxWidth}
          overflow-y-auto
          rounded-2xl
          bg-white
          shadow-xl
        `}
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
      >

        {/* ==========================================================
            HEADER
        ========================================================== */}

        {(title || description) && (

          <div
            className="
              flex items-center
              justify-between
              border-b border-slate-200
              px-6 py-4
            "
          >

            <div>

              {title && (
                <h2
                  className="
                    text-lg
                    font-semibold
                    text-slate-900
                  "
                >
                  {title}
                </h2>
              )}

              {description && (
                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-500
                  "
                >
                  {description}
                </p>
              )}

            </div>


            <button
              type="button"
              onClick={onClose}
              className="
                rounded-lg
                p-2
                text-slate-400
                hover:bg-slate-100
                hover:text-slate-700
              "
              aria-label="Close"
            >
              <X size={20} />
            </button>

          </div>

        )}


        {/* ==========================================================
            CONTENT
        ========================================================== */}

        {children}

      </div>

    </div>
  );
}