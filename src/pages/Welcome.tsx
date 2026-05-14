/**
 * Tela de boas-vindas (rota /).
 *
 * Mostra cards-atalho dos modulos liberados ao usuario logado.
 * Cada card lista as rotas que o usuario tem `podeLer = true`.
 */
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePerfil } from '@/contexts/PerfilContext';
import type { RotaPermitida } from '@/types';

interface ModuloConfig {
  codigo: string;
  nome: string;
  descricao: string;
  icone: string;
}

const MODULOS: ModuloConfig[] = [
  { codigo: 'admin',        nome: 'Administracao', descricao: 'Usuarios, unidades, perfis e configuracoes',  icone: 'Settings2' },
  { codigo: 'cadastros',    nome: 'Cadastros',     descricao: 'Itens, fornecedores, listas auxiliares',       icone: 'List' },
  { codigo: 'estoque',      nome: 'Estoque',       descricao: 'Saldos por unidade e movimentacoes',           icone: 'Warehouse' },
  { codigo: 'solicitacoes', nome: 'Solicitacoes',  descricao: 'Pedidos de material, moveis e emprestimos',    icone: 'ClipboardList' },
  { codigo: 'entregas',     nome: 'Entregas',      descricao: 'Lotes, recepcao e conferencia',                icone: 'Truck' },
  { codigo: 'compras',      nome: 'Compras',       descricao: 'Cotacoes, pedidos, NFs e contratos',           icone: 'ShoppingCart' },
  { codigo: 'auditoria',    nome: 'Auditoria',     descricao: 'Timeline de atividades e notificacoes',        icone: 'History' },
];

function getIcone(nome: string): React.ComponentType<{ className?: string }> {
  const pascal = nome
    .split(/[-_]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
  const Comp = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[pascal];
  return Comp ?? Icons.Circle;
}

export function Welcome() {
  const { usuario, rotasPermitidas, isLoading, perfis } = usePerfil();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">
        Carregando...
      </div>
    );
  }

  // Agrupar rotas por modulo, mantendo so as visiveis (podeLer = true)
  const rotasPorModulo = new Map<string, RotaPermitida[]>();
  for (const r of rotasPermitidas) {
    if (!r.podeLer || !r.modulo) continue;
    const lista = rotasPorModulo.get(r.modulo) ?? [];
    lista.push(r);
    rotasPorModulo.set(r.modulo, lista);
  }

  const modulosLiberados = MODULOS.filter((m) => (rotasPorModulo.get(m.codigo)?.length ?? 0) > 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">
          Ola, {usuario?.nome?.split(' ')[0] ?? 'usuario'}!
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Bem-vindo ao SupplyGo. Escolha um modulo para comecar.
        </p>
        {perfis.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Perfis ativos: <span className="font-mono">{perfis.map((p) => p.codigo).join(', ')}</span>
          </p>
        )}
      </div>

      {modulosLiberados.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Icons.Lock className="h-10 w-10 mx-auto mb-4 opacity-40" />
            <p className="font-semibold text-foreground">Sem permissoes atribuidas</p>
            <p className="text-sm mt-1">
              Sua conta foi criada, mas voce ainda nao tem nenhum modulo liberado.
              <br />
              Aguarde um administrador atribuir um perfil ou rotas avulsas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modulosLiberados.map((modulo) => {
            const itens = rotasPorModulo.get(modulo.codigo)!;
            const ModuloIcon = getIcone(modulo.icone);

            return (
              <Card key={modulo.codigo} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ModuloIcon className="h-5 w-5 text-primary" />
                    {modulo.nome}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{modulo.descricao}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {itens
                      .sort((a, b) => a.ordem - b.ordem)
                      .map((rota) => {
                        const Icon = getIcone(rota.icone ?? 'Circle');
                        return (
                          <li key={rota.id}>
                            <Link
                              to={rota.caminho}
                              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            >
                              <Icon className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{rota.nome}</span>
                            </Link>
                          </li>
                        );
                      })}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
