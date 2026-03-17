import React, { createContext, useContext, useState } from 'react';

const DialogContainerContext = React.createContext<HTMLElement | null>(null);

export function DialogContainerProvider({ children }: { children: React.ReactNode }) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  return (
    <DialogContainerContext.Provider value={container}>
      {children}
      <div
        ref={(el) => setContainer(el)}
        aria-hidden
        className="fixed pointer-events-none"
        style={{
          left: 260,
          top: 56,
          right: 0,
          bottom: 0,
          zIndex: 100,
        }}
      />
    </DialogContainerContext.Provider>
  );
}

export function useDialogContainer() {
  return useContext(DialogContainerContext);
}
