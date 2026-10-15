import { useEffect, useRef } from 'react'

function ConfirmDialog({
  open,
  title,
  description,
  itemName,
  confirmLabel,
  cancelLabel,
  processingLabel,
  isProcessing = false,
  error = null,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current

    if (!dialog) {
      return
    }

    if (open && !dialog.open) {
      dialog.showModal()
    }

    if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  function handleCancel(event) {
    event.preventDefault()

    if (!isProcessing) {
      onCancel()
    }
  }

  function handleBackdropClick(event) {
    if (event.target === dialogRef.current && !isProcessing) {
      onCancel()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      onCancel={handleCancel}
      onClick={handleBackdropClick}
    >
      <div className="confirm-dialog__content">
        <h2 id="confirm-dialog-title">{title}</h2>

        {itemName && <p className="confirm-dialog__item">“{itemName}”</p>}

        <p
          id="confirm-dialog-description"
          className="confirm-dialog__description"
        >
          {description}
        </p>

        {error && (
          <p className="auth-message auth-message--error" role="alert">
            {error}
          </p>
        )}

        <div className="confirm-dialog__actions">
          <button
            className="confirm-dialog__cancel"
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
          >
            {cancelLabel}
          </button>

          <button
            className="confirm-dialog__confirm"
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? processingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}

export default ConfirmDialog
