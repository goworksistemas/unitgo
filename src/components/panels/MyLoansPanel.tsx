import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Package, Calendar, AlertCircle, CheckCircle, User } from 'lucide-react';
import { toast } from 'sonner';

export function MyLoansPanel() {
  const { currentUser, loans, getItemById, getUnitById, getUserById, updateLoan, addMovement, updateStock, getStockForItem } = useApp();

  const myLoans = loans.filter(
    loan => loan.responsibleUserId === currentUser?.id && (loan.status === 'active' || loan.status === 'overdue')
  );

  const handleReturn = (loanId: string) => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    const item = getItemById(loan.itemId);
    const stock = getStockForItem(loan.itemId, loan.unitId);
    if (!item || !stock || !currentUser) return;

    // Add return movement
    addMovement({
      type: 'devolucao',
      itemId: loan.itemId,
      unitId: loan.unitId,
      userId: currentUser.id,
      quantity: 1,
      notes: `Devolução do empréstimo ${loanId}`,
    });

    // Update loan status
    updateLoan(loanId, {
      status: 'returned',
      returnDate: new Date(),
    });

    // Update stock
    updateStock(stock.id, stock.quantity + 1);

    toast.success(`Item "${item.name}" devolvido com sucesso`);
  };

  const getLoanStatus = (loan: typeof myLoans[0]) => {
    const now = new Date();
    const expectedReturn = new Date(loan.expectedReturnDate);
    const diffDays = Math.ceil((expectedReturn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (loan.status === 'overdue' || diffDays < 0) {
      return { label: 'Atrasado', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: AlertCircle };
    } else if (diffDays === 0) {
      return { label: 'Vence hoje', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', icon: AlertCircle };
    } else if (diffDays <= 2) {
      return { label: `Vence em ${diffDays}d`, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: Calendar };
    } else {
      return { label: 'No prazo', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: CheckCircle };
    }
  };

  if (myLoans.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Meus Empréstimos</CardTitle>
          <CardDescription>Você não possui empréstimos ativos no momento</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meus Empréstimos</CardTitle>
        <CardDescription>{myLoans.length} item(ns) emprestado(s)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {myLoans.map(loan => {
            const item = getItemById(loan.itemId);
            const unit = getUnitById(loan.unitId);
            const status = getLoanStatus(loan);
            const StatusIcon = status.icon;

            if (!item) return null;

            return (
              <div
                key={loan.id}
                className="border border-border rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                  <div className="flex gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="w-6 h-6 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-foreground mb-1 text-sm sm:text-base">{item.name}</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-2 truncate">{unit?.name}</p>
                      
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge className={`${status.color} text-xs`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                        {loan.serialNumber && (
                          <Badge variant="outline" className="text-xs">
                            Serial: {loan.serialNumber}
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                        <p>
                          Retirada: {new Date(loan.withdrawalDate).toLocaleDateString('pt-BR')}
                        </p>
                        <p>
                          Devolução prevista: {new Date(loan.expectedReturnDate).toLocaleDateString('pt-BR')}
                        </p>
                        {loan.observations && (
                          <p className="text-xs italic break-words">{loan.observations}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="w-full sm:w-auto sm:flex-shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleReturn(loan.id)}
                      className="w-full sm:w-auto"
                    >
                      Devolver
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}