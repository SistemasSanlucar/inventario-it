import { useEffect, useState } from 'react';

function readIsMobile() {
    return typeof window !== 'undefined' && window.innerWidth < 768;
}

export function useIsMobile() {
    const [isMobile, setIsMobile] = useState(readIsMobile);

    useEffect(() => {
        const onResize = () => setIsMobile(readIsMobile());
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    return isMobile;
}
