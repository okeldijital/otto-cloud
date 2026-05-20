import React, { useState, useEffect } from 'react';
import ConfirmDialog from './ui/ConfirmDialog';
import { registerConfirmationHandler } from '../lib/tauri';

export const ConfirmationContext = React.createContext();

const ConfirmationProvider = ({ children }) => {
    const [state, setState] = useState({
        isOpen: false,
        message: '',
        title: '',
        resolve: null
    });

    useEffect(() => {
        // Register this provider's showConfirm method with the global handler
        registerConfirmationHandler((message, title) => {
            return new Promise((resolve) => {
                setState({
                    isOpen: true,
                    message,
                    title,
                    resolve
                });
            });
        });

        // Cleanup (optional, but good practice if provider unmounts)
        return () => registerConfirmationHandler(null);
    }, []);

    const handleConfirm = () => {
        if (state.resolve) state.resolve(true);
        setState(prev => ({ ...prev, isOpen: false }));
    };

    const handleCancel = () => {
        if (state.resolve) state.resolve(false);
        setState(prev => ({ ...prev, isOpen: false }));
    };

    return (
        <ConfirmationContext.Provider value={{}}>
            {children}
            {state.isOpen && (
                <ConfirmDialog
                    isOpen={state.isOpen}
                    title={state.title}
                    message={state.message}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                />
            )}
        </ConfirmationContext.Provider>
    );
};

export default ConfirmationProvider;
