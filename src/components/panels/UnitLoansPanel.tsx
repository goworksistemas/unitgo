import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Package, Calendar, AlertCircle, CheckCircle, User, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { SimpleLoanDialog } from '../dialogs/SimpleLoanDialog';

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
      return { label: 'Atrasado', color: 'bg-red-100 text-red-800', icon: AlertCircle };
    } else if (diffDays === 0) {
      return { label: 'Vence hoje', color: 'bg-orange-100 text-orange-800', icon: AlertCircle };
    } else if (diffDays <= 2) {
      return { label: `Vence em ${diffDays}d`, color: 'bg-yellow-100 text-yellow-800', icon: Calendar };
    } else {
      return { label: 'No prazo', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    }
  };

  if (activeLoans.length === 0) {
    return (
      <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>Empréstimos Ativos da Unidade</CardTitle>
              <CardDescription>Nenhum empréstimo ativo no momento</CardDescription>
            </div>
            <Button 
              onClick={() => setLoanDialogOpen(true)}
              size="sm"
              variant="default"
            >
              <Plus className="h-4 w-4 mr-2" />
              Emprestar
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Histórico de Devoluções */}
      {sortedReturnedLoans.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Histórico de Devoluções</CardTitle>
            <CardDescription>{sortedReturnedLoans.length} item(ns) devolvido(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sortedReturnedLoans.map(loan => {
                const item = getItemById(loan.itemId);
                const responsible = getUserById(loan.responsibleUserId);

                if (!item) return null;
                
                const responsibleDisplayName = responsible?.name || 'Não informado';

                return (
                  <div
                    key={loan.id}
                    className="border border-border rounded-lg p-3 md:p-4 bg-muted/50 opacity-80"
                  >
                    <div className="flex gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-foreground mb-1 text-sm sm:text-base">{item.name}</h4>
                        
                        <div className="flex items-center gap-2 mb-2 text-xs sm:text-sm text-muted-foreground">
                          <User className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{responsibleDisplayName}</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mb-2">
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Devolvido
                          </Badge>
                          {loan.quantity && loan.quantity > 1 && (
                            <Badge variant="outline" className="text-xs">
                              Qtd: {loan.quantity}
                            </Badge>
                          )}
                          {loan.serialNumber && (
                            <Badge variant="outline" className="text-xs">
                              Serial: {loan.serialNumber}
                            </Badge>
                          )}
                        </div>

                        <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                          <p>
                            Retirada: {new Date(loan.withdrawalDate).toLocaleDateString('pt-BR')} às {new Date(loan.withdrawalDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p>
                            Devolução: {loan.returnDate ? new Date(loan.returnDate).toLocaleDateString('pt-BR') : 'N/A'} {loan.returnDate ? `às ${new Date(loan.returnDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                          </p>
                          {loan.observations && (
                            <p className="text-xs italic text-muted-foreground break-words">{loan.observations}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
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
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle>Empréstimos Ativos da Unidade</CardTitle>
            <CardDescription>{activeLoans.length} item(ns) emprestado(s) em {currentUnit.name}</CardDescription>
          </div>
          <Button 
            onClick={() => setLoanDialogOpen(true)}
            size="sm"
            variant="default"
          >
            <Plus className="h-4 w-4 mr-2" />
            Emprestar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedLoans.map(loan => {
            const item = getItemById(loan.itemId);
            const responsible = getUserById(loan.responsibleUserId);
            const status = getLoanStatus(loan);
            const StatusIcon = status.icon;

            if (!item) return null;
            
            // Buscar o nome do usuário responsável
            const responsibleDisplayName = responsible?.name || 'Não informado';

            return (
              <div
                key={loan.id}
                className="border border-border rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                  <div className="flex gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-foreground mb-1 text-sm sm:text-base">{item.name}</h4>
                      
                      <div className="flex items-center gap-2 mb-2 text-xs sm:text-sm text-muted-foreground">
                        <User className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{responsibleDisplayName}</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge className={`${status.color} text-xs`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                        {loan.quantity && loan.quantity > 1 && (
                          <Badge variant="outline" className="text-xs">
                            Qtd: {loan.quantity}
                          </Badge>
                        )}
                        {loan.serialNumber && (
                          <Badge variant="outline" className="text-xs">
                            Serial: {loan.serialNumber}
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                        <p>
                          Retirada: {new Date(loan.withdrawalDate).toLocaleDateString('pt-BR')} às {new Date(loan.withdrawalDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p>
                          Devolução prevista: {new Date(loan.expectedReturnDate).toLocaleDateString('pt-BR')}
                        </p>
                        {loan.observations && (
                          <p className="text-xs italic text-muted-foreground break-words">{loan.observations}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="w-full sm:w-auto sm:flex-shrink-0">
                    <Button
                      size="sm"
                      onClick={() => {
                        console.log('🖱️ BOTÃO CLICADO! loan.id =', loan.id);
                        handleReturn(loan.id);
                      }}
                      className="w-full sm:w-auto whitespace-nowrap"
                    >
                      Registrar Devolução
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>

    {/* Histórico de Devoluções */}
    {sortedReturnedLoans.length > 0 && (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Histórico de Devoluções</CardTitle>
          <CardDescription>{sortedReturnedLoans.length} item(ns) devolvido(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedReturnedLoans.map(loan => {
              const item = getItemById(loan.itemId);
              const responsible = getUserById(loan.responsibleUserId);

              if (!item) return null;
              
              const responsibleDisplayName = responsible?.name || 'Não informado';

              return (
                <div
                  key={loan.id}
                  className="border border-border rounded-lg p-3 md:p-4 bg-muted/50 opacity-80"
                >
                  <div className="flex gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-foreground mb-1 text-sm sm:text-base">{item.name}</h4>
                      
                      <div className="flex items-center gap-2 mb-2 text-xs sm:text-sm text-muted-foreground">
                        <User className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{responsibleDisplayName}</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Devolvido
                        </Badge>
                        {loan.quantity && loan.quantity > 1 && (
                          <Badge variant="outline" className="text-xs">
                            Qtd: {loan.quantity}
                          </Badge>
                        )}
                        {loan.serialNumber && (
                          <Badge variant="outline" className="text-xs">
                            Serial: {loan.serialNumber}
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                        <p>
                          Retirada: {new Date(loan.withdrawalDate).toLocaleDateString('pt-BR')} às {new Date(loan.withdrawalDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p>
                          Devolução: {loan.returnDate ? new Date(loan.returnDate).toLocaleDateString('pt-BR') : 'N/A'} {loan.returnDate ? `às ${new Date(loan.returnDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                        </p>
                        {loan.observations && (
                          <p className="text-xs italic text-muted-foreground break-words">{loan.observations}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    )}

    {/* Dialog de Empréstimo Simples */}
    <SimpleLoanDialog
      open={loanDialogOpen}
      onOpenChange={setLoanDialogOpen}
    />
    </>
  );
}