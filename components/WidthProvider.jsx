import React, { useEffect, useRef, useState } from 'react';

/**
 * A simple HOC that provides width to a component.
 * Uses ResizeObserver to detect container size changes.
 * 
 * @param {React.Component} Component 
 * @returns {React.Component}
 */
export const WidthProvider = (Component) => {
    return (props) => {
        const [width, setWidth] = useState(1200);
        const elementRef = useRef(null);

        useEffect(() => {
            const element = elementRef.current;
            if (!element) return;

            // Initial width
            setWidth(element.offsetWidth);

            const resizeObserver = new ResizeObserver((entries) => {
                for (let entry of entries) {
                    if (entry.contentRect) {
                        setWidth(entry.contentRect.width);
                    }
                }
            });

            resizeObserver.observe(element);

            return () => {
                resizeObserver.disconnect();
            };
        }, []);

        return (
            <div ref={elementRef} style={{ width: '100%', height: '100%' }}>
                <Component {...props} width={width} />
            </div>
        );
    };
};
