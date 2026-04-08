import { useState, useEffect } from 'react';
export function useMobile(breakpoint = 768) {
  const [is, setIs] = useState(() => typeof window !== 'undefined' && window.innerWidth <= breakpoint);
  useEffect(() => {
    const fn = () => setIs(window.innerWidth <= breakpoint);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, [breakpoint]);
  return is;
}
