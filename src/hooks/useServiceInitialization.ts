import { useState, useEffect } from 'react';
import { initializeServices } from '../utils/initialization';

export const useServiceInitialization = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const success = await initializeServices();
        
        if (mounted) {
          setIsInitialized(success);
          if (!success) {
            setError('Failed to initialize required services. Please check your browser compatibility.');
          }
        }
      } catch (err) {
        if (mounted) {
          setError('Service initialization failed. Please refresh and try again.');
          setIsInitialized(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  return { isInitialized, error };
};