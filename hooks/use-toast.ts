'use client'

import * as React from 'react'
import { ToastContext } from './use-toast-provider'
import type { ToasterToast, Action } from './use-toast-provider'

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type Toast = Omit<ToasterToast, 'id'>

export function useToast() {
    const context = React.useContext(ToastContext);
    if(!context) {
        throw new Error("useToast must be used within a ToastProvider")
    }
    const { state, dispatch } = context;

    const toast = React.useCallback(({ ...props }: Toast) => {
        const id = genId()
      
        const dismiss = () => dispatch({ type: 'DISMISS_TOAST', toastId: id })
      
        dispatch({
          type: 'ADD_TOAST',
          toast: {
            ...props,
            id,
            open: true,
            onOpenChange: (open) => {
              if (!open) dismiss()
            },
          },
        })
      
        return {
          id: id,
          dismiss
        }
    }, [dispatch]);

    return {
        ...state,
        toast,
        dismiss: (toastId?: string) => dispatch({ type: 'DISMISS_TOAST', toastId }),
    }
}
