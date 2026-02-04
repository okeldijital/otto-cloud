import React from 'react';

const Input = ({
    label,
    error,
    className = '',
    type = 'text',
    id,
    ...props
}) => {
    return (
        <div className={`form-group ${className}`}>
            {label && <label htmlFor={id}>{label}</label>}
            <input
                id={id}
                type={type}
                className={`form-input ${error ? 'error' : ''}`}
                {...props}
            />
            {error && <p className="form-error">{error}</p>}
        </div>
    );
};

export const Select = ({
    label,
    error,
    children,
    className = '',
    id,
    ...props
}) => {
    return (
        <div className={`form-group ${className}`}>
            {label && <label htmlFor={id}>{label}</label>}
            <select
                id={id}
                className={`form-select ${error ? 'error' : ''}`}
                {...props}
            >
                {children}
            </select>
            {error && <p className="form-error">{error}</p>}
        </div>
    );
};

export const Textarea = ({
    label,
    error,
    className = '',
    id,
    ...props
}) => {
    return (
        <div className={`form-group ${className}`}>
            {label && <label htmlFor={id}>{label}</label>}
            <textarea
                id={id}
                className={`form-textarea ${error ? 'error' : ''}`}
                {...props}
            />
            {error && <p className="form-error">{error}</p>}
        </div>
    );
};

export default Input;
