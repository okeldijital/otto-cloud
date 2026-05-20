import { useState, useEffect } from 'react';
import api from '../lib/api';

/**
 * Hook to monitor backend health and connectivity
 * @param {number} intervalMs - How often to check health (default: 30000ms = 30s)
 * @returns {Object} { isHealthy, isChecking, lastCheck, error }
 */
export function useBackendHealth(intervalMs = 30000) {
    const [isHealthy, setIsHealthy] = useState(null);
    const [isChecking, setIsChecking] = useState(true);
    const [lastCheck, setLastCheck] = useState(null);
    const [error, setError] = useState(null);

    const checkHealth = async () => {
        setIsChecking(true);
        try {
            await api.get('/health');
            setIsHealthy(true);
            setError(null);
        } catch (err) {
            setIsHealthy(false);
            setError(err.message || 'Backend unreachable');
            console.error('Backend health check failed:', err);
        } finally {
            setIsChecking(false);
            setLastCheck(new Date());
        }
    };

    useEffect(() => {
        // Check immediately on mount
        checkHealth();

        // Set up interval for periodic checks
        const interval = setInterval(checkHealth, intervalMs);

        return () => clearInterval(interval);
    }, [intervalMs]);

    return { isHealthy, isChecking, lastCheck, error, recheckHealth: checkHealth };
}
