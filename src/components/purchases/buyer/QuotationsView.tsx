import { useState, useCallback, useEffect } from 'react';
import { QuotationManagementPanel } from './QuotationManagementPanel';
import { CreateQuotationPage } from './CreateQuotationPage';
import { QuotationDetailPage } from './QuotationDetailPage';

type View = 'list' | 'create' | 'detail';

interface QuotationsViewProps {
  initialCreateSolicitacaoId?: string;
  onViewReset?: () => void;
}

export function QuotationsView({
  initialCreateSolicitacaoId,
  onViewReset,
}: QuotationsViewProps) {
  const [view, setView] = useState<View>('list');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [createSolicitacaoId, setCreateSolicitacaoId] = useState<string | undefined>();

  useEffect(() => {
    if (initialCreateSolicitacaoId) {
      setCreateSolicitacaoId(initialCreateSolicitacaoId);
      setView('create');
    }
  }, [initialCreateSolicitacaoId]);

  const handleNavigateToCreate = useCallback((solicitacaoId?: string) => {
    setCreateSolicitacaoId(solicitacaoId);
    setView('create');
  }, []);

  const handleNavigateToDetail = useCallback((quotationId: string) => {
    setDetailId(quotationId);
    setView('detail');
  }, []);

  const handleBack = useCallback(() => {
    setView('list');
    setDetailId(null);
    setCreateSolicitacaoId(undefined);
    onViewReset?.();
  }, [onViewReset]);

  const handleCreateSuccess = useCallback(() => {
    setView('list');
    setCreateSolicitacaoId(undefined);
    onViewReset?.();
  }, [onViewReset]);

  if (view === 'create') {
    return (
      <CreateQuotationPage
        solicitacaoIdPreenchido={createSolicitacaoId}
        onBack={handleBack}
        onSuccess={handleCreateSuccess}
      />
    );
  }

  if (view === 'detail' && detailId) {
    return (
      <QuotationDetailPage
        quotationId={detailId}
        onBack={handleBack}
      />
    );
  }

  return (
    <QuotationManagementPanel
      onNavigateToCreate={handleNavigateToCreate}
      onNavigateToDetail={handleNavigateToDetail}
    />
  );
}
