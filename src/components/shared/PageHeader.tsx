import type { ReactNode } from 'react';

interface Props {
  titulo: string;
  subtitulo?: string;
  acoes?: ReactNode;
}

export function PageHeader({ titulo, subtitulo, acoes }: Props) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{titulo}</h1>
        {subtitulo && <p className="text-muted-foreground mt-1 text-sm">{subtitulo}</p>}
      </div>
      {acoes && <div className="flex items-center gap-2">{acoes}</div>}
    </div>
  );
}
