import type {
  DeliveryBatch,
  FurnitureRequestToDesigner,
  Item,
  Request,
} from '@/types';
import { cn } from '@/lib/utils';
import { formatRelativeTimePast } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Package,
  Armchair,
  QrCode,
  Clock,
  MapPin,
  Hash,
} from 'lucide-react';

export type DriverBatchLineItem = {
  id: string;
  name: string;
  quantity: number;
  kind: 'material' | 'furniture';
};

export function buildDriverBatchLineItems(
  batch: DeliveryBatch,
  requests: Request[],
  furnitureRequestsToDesigner: FurnitureRequestToDesigner[],
  getItemById: (id: string) => Item | undefined,
): DriverBatchLineItem[] {
  const lines: DriverBatchLineItem[] = [];
  for (const rid of batch.requestIds ?? []) {
    const r = requests.find((x) => x.id === rid);
    const item = r ? getItemById(r.itemId) : undefined;
    const name = (item?.name ?? '').trim() || 'Material';
    const qty =
      r && typeof r.quantity === 'number' && !Number.isNaN(r.quantity)
        ? r.quantity
        : 1;
    lines.push({ id: rid, kind: 'material', name, quantity: qty });
  }
  for (const fid of batch.furnitureRequestIds ?? []) {
    const fr = furnitureRequestsToDesigner.find((x) => x.id === fid);
    const item = fr ? getItemById(fr.itemId) : undefined;
    const name = (item?.name ?? '').trim() || 'Móvel';
    const raw = fr?.quantity;
    const qty =
      typeof raw === 'number' && !Number.isNaN(raw)
        ? raw
        : typeof raw === 'string' && raw !== ''
          ? Number(raw) || 1
          : 1;
    lines.push({ id: fid, kind: 'furniture', name, quantity: qty });
  }
  return lines;
}

export interface DriverDeliveryBatchCardProps {
  batch: DeliveryBatch;
  lineItems: DriverBatchLineItem[];
  destinationLabel: string;
  hasDeliveryConfirmation: boolean;
  onShowQr: () => void;
  onMarkPending: () => void;
  onShowTimeline: () => void;
}

export function getDriverBatchPhase(
  batch: DeliveryBatch,
  hasDeliveryConfirmation: boolean,
): 'waiting_warehouse' | 'deliver_now' | 'awaiting_receiver' {
  if (batch.status === 'pending') return 'waiting_warehouse';
  if (batch.status === 'in_transit' && !hasDeliveryConfirmation) return 'deliver_now';
  return 'awaiting_receiver';
}

export function DriverDeliveryBatchCard({
  batch,
  lineItems,
  destinationLabel,
  hasDeliveryConfirmation,
  onShowQr,
  onMarkPending,
  onShowTimeline,
}: DriverDeliveryBatchCardProps) {
  const phase = getDriverBatchPhase(batch, hasDeliveryConfirmation);
  const timeLabel =
    batch.status === 'in_transit' && batch.dispatchedAt
      ? `Liberado ${formatRelativeTimePast(batch.dispatchedAt)}`
      : `Criado ${formatRelativeTimePast(batch.createdAt)}`;

  const statusBadge =
    phase === 'deliver_now' ? (
      <Badge className="shrink-0 bg-emerald-600 hover:bg-emerald-600 text-white border-0 text-xs font-semibold">
        Sua vez — entregar
      </Badge>
    ) : phase === 'waiting_warehouse' ? (
      <Badge
        variant="secondary"
        className="shrink-0 border border-amber-300/80 bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-800 text-xs font-medium"
      >
        Almox separando
      </Badge>
    ) : (
      <Badge
        variant="secondary"
        className="shrink-0 border border-sky-300/80 bg-sky-50 text-sky-950 dark:bg-sky-950/40 dark:text-sky-100 dark:border-sky-800 text-xs font-medium"
      >
        Aguardando recebedor
      </Badge>
    );

  return (
    <Card
      className={cn(
        'overflow-hidden shadow-sm transition-shadow',
        phase === 'deliver_now' &&
          'border-2 border-emerald-600/70 dark:border-emerald-500/80 ring-1 ring-emerald-600/20',
        phase === 'waiting_warehouse' &&
          'border border-amber-200/90 dark:border-amber-900/60 bg-amber-50/35 dark:bg-amber-950/15',
        phase === 'awaiting_receiver' &&
          'border border-sky-200/90 dark:border-sky-900/50 bg-sky-50/25 dark:bg-sky-950/10',
      )}
    >
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Entrega
              </p>
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold leading-tight text-foreground">
                    {destinationLabel || 'Unidade'}
                  </h3>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Hash className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                    <span className="font-mono text-xs sm:text-sm tracking-tight">
                      {batch.qrCode}
                    </span>
                  </p>
                </div>
              </div>
            </div>
            {statusBadge}
          </div>

          {lineItems.length > 0 ? (
            <div className="rounded-md border border-border/70 bg-muted/25 px-2.5 py-2 dark:bg-muted/15">
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Itens no lote
              </p>
              <ul
                className={cn(
                  'space-y-1.5',
                  lineItems.length > 6 && 'max-h-36 overflow-y-auto overscroll-contain pr-1',
                )}
              >
                {lineItems.map((line) => (
                  <li
                    key={`${line.kind}-${line.id}`}
                    className="flex items-start gap-2 text-sm leading-snug"
                  >
                    {line.kind === 'material' ? (
                      <Package
                        className="mt-0.5 h-4 w-4 shrink-0 text-primary/85"
                        aria-hidden
                      />
                    ) : (
                      <Armchair
                        className="mt-0.5 h-4 w-4 shrink-0 text-primary/85"
                        aria-hidden
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="font-medium text-foreground">{line.name}</span>
                      <span className="text-muted-foreground">
                        {' '}
                        · Qtd {line.quantity}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum item com nome disponível neste lote.
            </p>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{timeLabel}</span>
          </div>
        </div>

        <div
          className={cn(
            'border-t px-4 py-3',
            phase === 'waiting_warehouse' && 'border-amber-200/80 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/25',
            phase === 'deliver_now' && 'border-emerald-200/80 bg-muted/30 dark:border-emerald-900/40',
            phase === 'awaiting_receiver' && 'border-sky-200/80 bg-muted/20 dark:border-sky-900/40',
          )}
        >
          {phase === 'waiting_warehouse' && (
            <p className="text-sm leading-relaxed text-amber-950/90 dark:text-amber-100/90">
              O almoxarifado está separando os itens. Quando terminar, aparecerá o botão para mostrar o{' '}
              <strong className="font-semibold">QR Code</strong> ao recebedor.
            </p>
          )}

          {phase === 'deliver_now' && (
            <div className="flex flex-col gap-2">
              <Button
                className="h-12 w-full text-base font-semibold shadow-sm sm:h-11"
                onClick={onShowQr}
              >
                <QrCode className="mr-2 h-5 w-5" aria-hidden />
                Mostrar QR Code da entrega
              </Button>
              <Button
                variant="outline"
                className="h-11 w-full text-sm border-2"
                onClick={onMarkPending}
              >
                Recebedor ausente — confirmar depois
              </Button>
            </div>
          )}

          {phase === 'awaiting_receiver' && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {batch.status === 'pending_confirmation'
                  ? 'Você marcou entrega para depois ou o recebedor ainda não confirmou com o código.'
                  : batch.status === 'delivery_confirmed' || hasDeliveryConfirmation
                    ? 'Entrega registrada. Falta a confirmação de quem recebe na unidade.'
                    : 'Acompanhe o andamento deste lote.'}
              </p>
              <Button variant="outline" className="h-10 w-full text-sm" onClick={onShowTimeline}>
                Ver andamento da entrega
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
