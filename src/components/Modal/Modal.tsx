import React from 'react';

interface ModalProps {
  /** Whether the modal is visible */
  open: boolean;
  /** Called when user closes the modal (clicking overlay or X) */
  onClose: () => void;
  /** Modal title */
  title: string;
  /** Modal body content */
  children: React.ReactNode;
  /** Footer content (typically Cancel + Submit buttons) */
  footer?: React.ReactNode;
}

/**
 * Modal — Reusable dialog overlay.
 *
 * Usage:
 * ```tsx
 * <Modal open={showModal} onClose={() => setShowModal(false)} title="Upload Data"
 *   footer={
 *     <>
 *       <button className="btn btn--secondary" onClick={close}>Cancel</button>
 *       <button className="btn btn--primary" onClick={submit}>Submit</button>
 *     </>
 *   }
 * >
 *   <p>Modal body content here</p>
 * </Modal>
 * ```
 */
export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">{title}</h2>
          <button className="modal__close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal__body">{children}</div>

        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  );
}

export default Modal;
