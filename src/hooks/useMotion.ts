import { useEffect, useState } from 'react';

export function useMotion() {
  const enabled = () =>
    !matchMedia('(prefers-reduced-motion: reduce)').matches &&
    document.documentElement.dataset.motion !== 'off';
  const [motion, setMotion] = useState(enabled);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setMotion(enabled());
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-motion']
    });
    media.addEventListener('change', update);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', update);
    };
  }, []);
  return motion;
}
