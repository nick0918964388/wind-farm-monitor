import React from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1001] overflow-y-auto">
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm 
          animate-in fade-in duration-200"
        onClick={onClose} 
      />
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative bg-white rounded-lg shadow-xl w-[85vw] mx-auto
            animate-in fade-in zoom-in-95 slide-in-from-bottom-2 
            duration-200 ease-out"
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-full 
              text-gray-400 hover:text-gray-500 
              hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          
          {children}
        </div>
      </div>
    </div>
  )
} 