import { useState } from 'react';
import ConfirmModal from '../components/modals/ConfirmModal';

export function useConfirm() {
  const [state, setState] = useState(null);

  function confirm(message, options = {}) {
    return new Promise(resolve => {
      setState({ message, resolve, ...options });
    });
  }

  function handleConfirm() {
    state?.resolve(true);
    setState(null);
  }

  function handleCancel() {
    state?.resolve(false);
    setState(null);
  }

  const dialog = state ? (
    <ConfirmModal
      title={state.title}
      message={state.message}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      variant={state.variant}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return [dialog, confirm];
}
