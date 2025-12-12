import React from 'react';
import { X } from 'lucide-react';

/**
 * A reusable modal component.
 * Props:
 * - show (boolean): Whether to display the modal.
 * - onClose (function): Function to call when the modal is closed.
 * - title (string): The title for the modal.
 * - children (node): The content to display inside the modal.
 */
function Modal({ show, onClose, title, children }) {
    if (!show) {
        return null;
    }

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div 
                className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md"
                onClick={(e) => e.stopPropagation()} // Prevent click inside from closing
            >
                <div className="flex justify-between items-center p-6 border-b border-gray-700">
                    <h3 className="text-2xl font-bold text-white">{title}</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white"
                        aria-label="Close modal"
                    >
                        <X size={24} />
                    </button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}

export default Modal;