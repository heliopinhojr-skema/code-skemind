/**
 * TermsAcceptanceGate - Bloqueia acesso ao app até o jogador aceitar os Termos de Uso.
 * Exibe o conteúdo completo dos termos com botão de aceite.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TermsAcceptanceGateProps {
  playerId: string;
  playerName: string;
  onAccepted: () => void;
}

export function TermsAcceptanceGate({ playerId, playerName, onAccepted }: TermsAcceptanceGateProps) {
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleAccept = async () => {
    if (!checked) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ terms_accepted_at: new Date().toISOString() } as any)
        .eq('id', playerId);

      if (error) {
        console.error('[TERMS] Error accepting:', error);
        toast.error('Erro ao aceitar termos. Tente novamente.');
        setSubmitting(false);
        return;
      }

      toast.success('Termos aceitos com sucesso!');
      onAccepted();
    } catch (e) {
      console.error('[TERMS] Unexpected error:', e);
      toast.error('Erro inesperado.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-3">
      <div className="w-full max-w-md">
        <div className="text-center mb-3">
          <Shield className="w-8 h-8 text-cyan-400 mx-auto mb-1.5" />
          <h1 className="text-base font-bold text-white">Bem-vindo, {playerName}!</h1>
          <p className="text-slate-400 text-xs mt-0.5">Leia e aceite os Termos de Uso.</p>
        </div>

        <div className="bg-slate-800/60 border border-slate-700 rounded-lg backdrop-blur-sm overflow-hidden">
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-700 bg-slate-800/80">
            <FileText className="w-3 h-3 text-cyan-400" />
            <span className="text-xs font-medium text-white">Termos de Uso — SKEMIND</span>
          </div>

          <ScrollArea className="h-[40vh] p-3">
            <div className="max-w-none space-y-2.5 text-slate-300 text-[11px] leading-relaxed">

              <section>
                <h3 className="text-cyan-400 text-xs font-semibold">1. Aceitação dos Termos</h3>
                <p>Ao acessar e utilizar a plataforma SKEMIND ("Plataforma"), você concorda em cumprir e estar vinculado a estes Termos de Uso ("Termos").</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-xs font-semibold">2. Definições</h3>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li><strong>"Energia" ou "k$"</strong>: unidade virtual de crédito utilizada exclusivamente dentro da Plataforma. A Energia NÃO possui valor monetário real.</li>
                  <li><strong>"Código DNA"</strong>: código de convite único gerado por Jogadores para expansão da rede.</li>
                  <li><strong>"Tiers"</strong>: níveis hierárquicos que determinam privilégios dentro da Plataforma.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-cyan-400 text-xs font-semibold">3. Natureza da Energia (k$)</h3>
                <p>A Energia (k$) é uma moeda virtual de entretenimento. <strong>Em hipótese alguma</strong> poderá ser convertida, trocada, sacada ou resgatada por dinheiro real. A Energia:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Não constitui propriedade do Jogador;</li>
                  <li>Não é elegível a saque, transferência bancária ou conversão monetária;</li>
                  <li>Existe exclusivamente para fins de entretenimento;</li>
                  <li>Opera sob economia fechada de soma zero (10.000.000,00 k$).</li>
                </ul>
              </section>

              <section>
                <h3 className="text-cyan-400 text-xs font-semibold">4. Cadastro e Acesso</h3>
                <p>O acesso é feito exclusivamente por convite (Código DNA). O Jogador declara ter pelo menos 18 anos, fornecer informações verdadeiras e ser responsável pela segurança de suas credenciais.</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-xs font-semibold">5. Sistema de Convites</h3>
                <p>Convites são pessoais e intransferíveis, podem ser cancelados pela administração, e não geram direito a remuneração em dinheiro real.</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-xs font-semibold">6. Competições e Arenas</h3>
                <p>Premiações são distribuídas exclusivamente em Energia (k$). Resultados são processados por algoritmos determinísticos e auditáveis.</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-xs font-semibold">7. Transferências</h3>
                <p>Transferências entre Jogadores são permitidas para Tiers elegíveis, sujeitas a taxa de 6,43%. É proibida a comercialização de Energia por dinheiro real.</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-xs font-semibold">8. Conduta</h3>
                <p>É proibido: uso de bots, manipulação de resultados, venda de Energia por dinheiro real, múltiplas contas, assédio, e exploração de falhas sem reportar.</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-xs font-semibold">9. Poderes Administrativos</h3>
                <p>A administração reserva-se o direito de suspender contas, ajustar saldos, cancelar convites e modificar regras a qualquer momento.</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-xs font-semibold">10. Isenção de Responsabilidade</h3>
                <p>A Plataforma é fornecida "como está". O Jogador reconhece que a Energia não tem valor real e que o serviço pode ser descontinuado.</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-xs font-semibold">11. Propriedade Intelectual</h3>
                <p>Todo o conteúdo da Plataforma é propriedade exclusiva dos administradores.</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-xs font-semibold">12. Alterações</h3>
                <p>Estes Termos podem ser alterados a qualquer momento. O uso continuado constitui aceitação.</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-xs font-semibold">13. Legislação e Foro</h3>
                <p>Estes Termos são regidos pelas leis da República Federativa do Brasil.</p>
              </section>

              <p className="text-slate-500 text-[10px] text-center pt-2 border-t border-slate-700">
                © 2026 SKEMIND. Todos os direitos reservados.
              </p>
            </div>
          </ScrollArea>

          <div className="p-3 border-t border-slate-700 space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox 
                checked={checked} 
                onCheckedChange={(v) => setChecked(v === true)} 
                className="h-3.5 w-3.5"
              />
              <span className="text-[11px] text-slate-300">
                Li e aceito os <strong className="text-cyan-400">Termos de Uso</strong>
              </span>
            </label>

            <Button
              onClick={handleAccept}
              disabled={!checked || submitting}
              className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-xs h-8"
            >
              {submitting ? 'Processando...' : 'Aceitar e Continuar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
