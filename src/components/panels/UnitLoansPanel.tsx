import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Package, AlertCircle, CheckCircle, User, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { SimpleLoanDialog } from '../dialogs/SimpleLoanDialog';
import { cn } from '@/lib/utils';

export function UnitLoansPanel() {
  const { currentUnit, currentUser, loans, getItemById, getUserById, updateLoan } = useApp();
  const [loanDialogOpen, setLoanDialogOpen] = useState(false);

  if (!currentUnit) return null;

  const unitLoans = loans.filter(loan => loan.unitId === currentUnit.id);
  const activeLoans = unitLoans.filter(loan => loan.status === 'active' || loan.status === 'overdue');
  const returnedLoans = unitLoans.filter(loan => loan.status === 'returned');

  // Sort returned loans by return date (most recent first)
  const sortedReturnedLoans = [...returnedLoans].sort((a, b) => {
    const aDate = a.returnDate ? new Date(a.returnDate).getTime() : 0;
    const bDate = b.returnDate ? new Date(b.returnDate).getTime() : 0;
    return bDate - aDate;
  });

  const handleReturn = async (loanId: string) => {
    console.log('🔵 handleReturn chamado para loanId:', loanId);
    
    const loan = loans.find(l => l.id === loanId);
    console.log('🔍 Empréstimo encontrado:', loan);
    if (!loan) {
      console.error('❌ Empréstimo não encontrado');
      return;
    }

    const item = getItemById(loan.itemId);
    console.log('🔍 Item encontrado:', item);
    
    if (!item || !currentUser) {
      console.error('❌ Faltam dados - item:', !!item, 'user:', !!currentUser);
      toast.error('Erro: dados incompletos para processar a devolução');
      return;
    }

    try {
      console.log('📤 Atualizando status do empréstimo...');

      // Update loan status - empréstimos são apenas anotações, não afetam estoque
      await updateLoan(loanId, {
        status: 'returned',
        returnDate: new Date(),
      });

      console.log('✅ Empréstimo atualizado');
      toast.success(`Devolução de "${item.name}" registrada com sucesso`);
    } catch (error) {
      console.error('❌ Erro ao registrar devolução:', error);
      toast.error('Erro ao registrar devolução. Tente novamente.');
    }
  };

  const getLoanStatus = (loan: typeof unitLoans[0]) => {
    const now = new Date();
    const expectedReturn = new Date(loan.expectedReturnDate);
    const diffDays = Math.ceil((expectedReturn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (loan.status === 'overdue' || diffDays < 0) {
      return { label: 'Atrasado', status: 'overdue' as const, icon: AlertCircle };
    } else if (diffDays === 0) {
      return { label: 'Vence hoje', status: 'pending' as const, icon: AlertCircle };
    } else if (diffDays <= 2) {
      return { label: `Vence em ${diffDays}d`, status: 'pending' as const, icon: AlertCircle };
    } else {
      return { label: 'No prazo', status: 'ok' as const, icon: CheckCircle };
    }
  };

  if (activeLoans.length === 0) {
    return (
      <>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-xs font-medium text-foreground">Empréstimos Ativos</h3>
          <span className="text-xs text-muted-foreground">0 itens</span>
        </div>
        <Button onClick={() => setLoanDialogOpen(true)} size="sm">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Emprestar
        </Button>
      </div>
      <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
        <Package className="h-6 w-6 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Nenhum item encontrado</p>
      </div>

      {sortedReturnedLoans.length > 0 && (
        <>
          <Separator className="my-4" />
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-medium text-foreground">Histórico de Devoluções</h3>
              <span className="text-xs text-muted-foreground">{sortedReturnedLoans.length} itens</span>
            </div>
          </div>
          <div className="rounded-md border border-border overflow-hidden divide-y divide-border bg-background">
            {sortedReturnedLoans.map(loan => {
                const item = getItemById(loan.itemId);
                const responsible = getUserById(loan.responsibleUserId);

                if (!item) return null;
                
                const responsibleDisplayName = responsible?.name || 'Não informado';
                const detail = `${new Date(loan.withdrawalDate).toLocaleDateString('pt-BR')} → ${loan.returnDate ? new Date(loan.returnDate).toLocaleDateString('pt-BR') : 'N/A'} • ${responsibleDisplayName}`;

                return (
                  <div
                    key={loan.id}
                    className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 transition-colors border-l-[3px] border-emerald-500"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{detail}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {loan.quantity && loan.quantity > 1 && (
                        <span className="text-xs text-muted-foreground">×{loan.quantity}</span>
                      )}
                      <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Devolvido
                      </Badge>
                    </div>
                  </div>
                );
              })}
          </div>
        </>
      )}

      {/* Dialog de Empréstimo Simples */}
      <SimpleLoanDialog
        open={loanDialogOpen}
        onOpenChange={setLoanDialogOpen}
      />
      </>
    );
  }

  // Sort by status (overdue first, then by expected return date)
  const sortedLoans = [...activeLoans].sort((a, b) => {
    const aOverdue = new Date(a.expectedReturnDate) < new Date();
    const bOverdue = new Date(b.expectedReturnDate) < new Date();
    
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    
    return new Date(a.expectedReturnDate).getTime() - new Date(b.expectedReturnDate).getTime();
  });

  return (
    <>
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-1.5">
        <Package className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-xs font-medium text-foreground">Empréstimos Ativos</h3>
        <span className="text-xs text-muted-foreground">{activeLoans.length} itens</span>
      </div>
      <Button onClick={() => setLoanDialogOpen(true)} size="sm">
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Emprestar
      </Button>
    </div>

    <div className="rounded-md border border-border overflow-hidden divide-y divide-border bg-background">
      {sortedLoans.map(loan => {
        const item = getItemById(loan.itemId);
        const responsible = getUserById(loan.responsibleUserId);
        const status = getLoanStatus(loan);
        const StatusIcon = status.icon;

        if (!item) return null;
        const responsibleDisplayName = responsible?.name || 'Não informado';
        const detail = `${new Date(loan.withdrawalDate).toLocaleDateString('pt-BR')} → ${new Date(loan.expectedReturnDate).toLocaleDateString('pt-BR')} • ${responsibleDisplayName}`;

        const statusBadgeClass = status.status === 'overdue'
          ? 'border-red-300 bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300'
          : status.status === 'pending'
            ? 'border-yellow-300 bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
            : 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300';

        return (
          <div
            key={loan.id}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 transition-colors",
              status.status === 'overdue' && "border-l-[3px] border-red-500",
              status.status === 'pending' && "border-l-[3px] border-yellow-400",
              status.status === 'ok' && "border-l-[3px] border-emerald-500"
            )}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{detail}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {loan.quantity && loan.quantity > 1 && (
                <span className="text-xs text-muted-foreground">×{loan.quantity}</span>
              )}
              <Badge variant="outline" className={cn('flex items-center gap-1', statusBadgeClass)}>
                <StatusIcon className="w-3 h-3" />
                {status.label}
              </Badge>
              <Button
                size="sm"
                onClick={() => handleReturn(loan.id)}
              >
                Registrar Devolução
              </Button>
            </div>
          </div>
        );
      })}
    </div>

    {sortedReturnedLoans.length > 0 && (
      <>
        <Separator className="my-4" />
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <h3 className="text-xs font-medium text-foreground">Histórico de Devoluções</h3>
            <span className="text-xs text-muted-foreground">{sortedReturnedLoans.length} itens</span>
          </div>
        </div>
        <div className="rounded-md border border-border overflow-hidden divide-y divide-border bg-background">
          {sortedReturnedLoans.map(loan => {
            const item = getItemById(loan.itemId);
            const responsible = getUserById(loan.responsibleUserId);

            if (!item) return null;
            const responsibleDisplayName = responsible?.name || 'Não informado';
            const detail = `${new Date(loan.withdrawalDate).toLocaleDateString('pt-BR')} → ${loan.returnDate ? new Date(loan.returnDate).toLocaleDateString('pt-BR') : 'N/A'} • ${responsibleDisplayName}`;

            return (
              <div
                key={loan.id}
                className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 transition-colors border-l-[3px] border-emerald-500"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{detail}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {loan.quantity && loan.quantity > 1 && (
                    <span className="text-xs text-muted-foreground">×{loan.quantity}</span>
                  )}
                  <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Devolvido
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </>
    )}

    {/* Dialog de Empréstimo Simples */}
    <SimpleLoanDialog
      open={loanDialogOpen}
      onOpenChange={setLoanDialogOpen}
    />
    </>
  );
}