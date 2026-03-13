import React, { useState, useCallback, useRef } from 'react';
import { Eye, ArrowLeft, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ViewModePopupProps {
  label: string;
  backLabel: string;
  onClose: () => void;
}

export function ViewModePopup({ label, backLabel, onClose }: ViewModePopupProps) {
  const [position, setPosition] = useState({ x: 16, y: 16 });
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);
  const positionRef = useRef(position);
  positionRef.current = position;

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

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPosition({
        x: Math.max(0, dragRef.current.posX + dx),
        y: Math.max(0, dragRef.current.posY + dy),
      });
    };
    const handleMouseUp = () => { dragRef.current = null; };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div
      className="fixed z-50 flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 shadow-lg"
      style={{ left: position.x, top: position.y }}
    >
      <div
        data-drag-handle
        className="flex cursor-grab active:cursor-grabbing touch-none select-none rounded p-0.5 hover:bg-muted/50"
        onMouseDown={handleMouseDown}
      >
        <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
      </div>
      <Eye className="h-3.5 w-3.5 text-primary shrink-0" />
      <span className="text-xs text-foreground whitespace-nowrap">
        {label}
      </span>
      <Button
        size="sm"
        variant="outline"
        className="h-6 gap-1 text-xs px-2 shrink-0"
        onClick={onClose}
      >
        <ArrowLeft className="h-3 w-3" />
        {backLabel}
      </Button>
    </div>
  );
}
