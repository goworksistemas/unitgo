import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Eye, ArrowLeft, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ViewModePopupProps {
  label: string;
  backLabel: string;
  onClose: () => void;
}

/** Largura do sidebar expandido em desktop (w-56 = 224px) + folga horizontal. */
const SIDEBAR_OFFSET = 240;
/** Altura do header fixo (h-16 = 64px) + folga vertical. */
const HEADER_OFFSET = 76;
/** Breakpoint Tailwind `lg` (sidebar fixo só aparece a partir daqui). */
const LG_BREAKPOINT = 1024;
/** Chave do localStorage onde a posição é persistida entre sessões. */
const STORAGE_KEY = 'supplygo-view-mode-popup-position';

type Position = { x: number; y: number };

function getDefaultPosition(): Position {
  if (typeof window === 'undefined') return { x: 16, y: HEADER_OFFSET };
  const isDesktop = window.innerWidth >= LG_BREAKPOINT;
  return {
    x: isDesktop ? SIDEBAR_OFFSET : 16,
    y: HEADER_OFFSET,
  };
}

/** Mantém o popup dentro do viewport visível (sem ficar atrás do sidebar/header ou fora da tela). */
function clampPosition(pos: Position): Position {
  if (typeof window === 'undefined') return pos;
  const isDesktop = window.innerWidth >= LG_BREAKPOINT;
  const minX = isDesktop ? SIDEBAR_OFFSET - 32 : 0;
  const minY = HEADER_OFFSET - 60;
  const maxX = Math.max(minX, window.innerWidth - 200);
  const maxY = Math.max(minY, window.innerHeight - 60);
  return {
    x: Math.min(Math.max(pos.x, minX), maxX),
    y: Math.min(Math.max(pos.y, minY), maxY),
  };
}

function loadStoredPosition(): Position {
  if (typeof window === 'undefined') return getDefaultPosition();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultPosition();
    const parsed = JSON.parse(raw) as Partial<Position>;
    if (typeof parsed?.x !== 'number' || typeof parsed?.y !== 'number') {
      return getDefaultPosition();
    }
    return clampPosition({ x: parsed.x, y: parsed.y });
  } catch {
    return getDefaultPosition();
  }
}

export function ViewModePopup({ label, backLabel, onClose }: ViewModePopupProps) {
  const [position, setPosition] = useState<Position>(loadStoredPosition);
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);
  const positionRef = useRef(position);
  positionRef.current = position;

  /** Persiste a posição em localStorage sempre que mudar (com debounce simples). */
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
      } catch {
        /* ignore quota errors */
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [position]);

  /** Ao redimensionar a janela, reposiciona se o popup ficar fora da área visível. */
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => clampPosition(prev));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest('[data-drag-handle]')) return;
    e.preventDefault();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: positionRef.current.x,
      posY: positionRef.current.y,
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPosition(
        clampPosition({
          x: dragRef.current.posX + dx,
          y: dragRef.current.posY + dy,
        }),
      );
    };
    const handleMouseUp = () => {
      dragRef.current = null;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div
      className="fixed z-[70] flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 shadow-lg"
      style={{ left: position.x, top: position.y }}
    >
      <div
        data-drag-handle
        className="flex cursor-grab touch-none select-none rounded p-0.5 hover:bg-muted/50 active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        title="Arraste para reposicionar"
      >
        <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground" />
      </div>
      <Eye className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span className="whitespace-nowrap text-xs text-foreground">{label}</span>
      <Button
        size="sm"
        variant="outline"
        className="h-6 shrink-0 gap-1 px-2 text-xs"
        onClick={onClose}
      >
        <ArrowLeft className="h-3 w-3" />
        {backLabel}
      </Button>
    </div>
  );
}
