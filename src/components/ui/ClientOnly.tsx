'use client';

import React, { useEffect, useState } from 'react';

const useIsMounted = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
};

export function ClientOnly({ children, fallback = null }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  const mounted = useIsMounted();

  if (!mounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
