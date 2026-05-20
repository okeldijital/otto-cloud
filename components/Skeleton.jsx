import React from 'react';

const Skeleton = ({ className, width, height, style }) => {
    return (
        <div
            className={`skeleton ${className || ''}`}
            style={{
                width: width || '100%',
                height: height || '1rem',
                ...style
            }}
        />
    );
};

export default Skeleton;
