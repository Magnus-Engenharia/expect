interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  destructive?: boolean;
  children: React.ReactNode;
}

export const Modal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  confirmLabel = "Confirm",
  confirmDisabled = false,
  destructive = false,
  children,
}: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <div className="mb-6">{children}</div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          {onConfirm && (
            <button
              onClick={onConfirm}
              disabled={confirmDisabled}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                destructive ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
