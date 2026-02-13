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
            <span className="text-xs font-medium text-white">Termos de Serviços e Uso — Skemania.com</span>
          </div>

          <ScrollArea className="h-[40vh] p-3">
          <div className="max-w-none space-y-2 text-slate-300 text-[10px] leading-relaxed">

              <div className="text-center mb-2">
                <h2 className="text-cyan-400 text-xs font-bold tracking-wide">TERMOS DE SERVIÇOS E USO — SKEMANIA.COM</h2>
                <p className="text-slate-500 text-[9px] mt-0.5">Versão Oficial v1.1 · Última atualização: 13/02/2026</p>
                <p className="text-slate-500 text-[9px]">Plataforma operada pela DaSet</p>
              </div>

              <section>
                <h3 className="text-cyan-400 text-[10px] font-semibold">Art. 1 — Apresentação</h3>
                <p>O Skemania é um ecossistema digital de competições baseadas em habilidade, estratégia, foco e mérito, integrando jogos, ligas, rankings, recompensas e economia digital própria. Ao acessar, cadastrar-se ou utilizar qualquer serviço da plataforma, o usuário concorda integralmente com estes Termos.</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-[10px] font-semibold">Art. 2 — Identificação do Operador</h3>
                <p>A plataforma Skemania.com é operada pela DaSet, entidade responsável pela governança, segurança, estrutura financeira e integridade do ecossistema. O Guardião é a autoridade máxima de direção estratégica.</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-[10px] font-semibold">Art. 3 — Estrutura do Ecossistema</h3>
                <p>O Skemania funciona por níveis: Guardião → Criadores → GM (Grão-Mestre) → M (Mestre) → B/P (Boom/Ploft). Cada nível possui funções definidas em normas internas.</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-[10px] font-semibold">Art. 4 — Natureza da Plataforma</h3>
                <p>O Skemania é plataforma de competição baseada em habilidade. Não é banco, cassino ou sistema de apostas. Não garante retorno financeiro.</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-[10px] font-semibold">Art. 5 — Conta do Usuário</h3>
                <p>Cada pessoa poderá manter apenas uma conta ativa. A conta é pessoal, intransferível e individual. O usuário é responsável pela segurança de seus dados.</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-[10px] font-semibold">Art. 6 — Elegibilidade e Dados</h3>
                <p>O usuário declara possuir capacidade legal, fornecer dados verdadeiros e manter informações atualizadas. Dados falsos poderão gerar bloqueio.</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-[10px] font-semibold">Art. 7 — Verificação e Conformidade</h3>
                <p>A DaSet poderá exigir verificação a qualquer tempo. A ausência de verificação poderá limitar funcionalidades e saques.</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-[10px] font-semibold">Art. 8 — Economia Digital (k$)</h3>
                <p>Os créditos k$ representam licença de uso interno. Tipos: <strong>k$-E</strong> (não sacável) e <strong>k$-R</strong> (sacável conforme regras). Não constituem moeda legal.</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-[10px] font-semibold">Art. 9 — Competições</h3>
                <p>A participação é voluntária. Cada competição possui regras próprias. É proibida manipulação de resultados.</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-[10px] font-semibold">Art. 10 — Premiações e Saques</h3>
                <p>Saques poderão ser solicitados conforme regras vigentes. Poderão ser retidos para análise técnica, legal ou antifraude.</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-[10px] font-semibold">Art. 11 — Autoridade da DaSet e do Painel do Guardião</h3>
                <p>A DaSet e o Painel do Guardião constituem a instância máxima de governança. Poderão restringir, suspender, encerrar contas, reverter créditos, revisar resultados e aplicar medidas preventivas.</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-[10px] font-semibold">Art. 12 — Conselho de Revisão</h3>
                <p>O usuário poderá solicitar revisão administrativa no prazo de 15 dias. O Conselho analisará e decidirá em caráter final.</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-[10px] font-semibold">Art. 13 — Política Financeira e Fila de Liquidez</h3>
                <p>Os saques ingressam em fila cronológica. A capacidade de liberação será ajustada em no mínimo +3% por ciclo. Critérios de prioridade poderão ser aplicados. Reservas operacionais garantem estabilidade.</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-[10px] font-semibold">Art. 14 — Erros Técnicos</h3>
                <p>Falhas poderão gerar correções, reversões e ajustes retroativos. Créditos indevidos poderão ser recuperados.</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-[10px] font-semibold">Art. 15 — Condutas Proibidas</h3>
                <p>É proibido: bots e automação, IA em tempo real, multi-contas, conluio, exploração de falhas, dados falsos, abuso de sistema.</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-[10px] font-semibold">Art. 16 — Medidas Disciplinares</h3>
                <p>Poderão ser aplicadas: advertência, restrição, suspensão, encerramento, confisco de créditos, banimento.</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-[10px] font-semibold">Art. 17 — Conta Inativa</h3>
                <p>Contas sem atividade por 13 meses poderão ser encerradas. Taxas administrativas poderão ser aplicadas.</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-[10px] font-semibold">Art. 18 — Propriedade Intelectual</h3>
                <p>Todo o sistema pertence à DaSet. É vedada reprodução sem autorização.</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-[10px] font-semibold">Art. 19 — Privacidade e Dados</h3>
                <p>Os dados são tratados conforme Política de Privacidade. O usuário autoriza processamento e análise antifraude.</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-[10px] font-semibold">Art. 20 — Compliance e Autoridades</h3>
                <p>O Skemania coopera com autoridades. Poderá cumprir ordens judiciais.</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-[10px] font-semibold">Art. 21 — Limitação de Responsabilidade</h3>
                <p>A DaSet não se responsabiliza por falhas externas, dispositivos, terceiros ou uso indevido da conta. Responsabilidade limitada conforme lei.</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-[10px] font-semibold">Art. 22 — Alterações dos Termos</h3>
                <p>Os Termos poderão ser atualizados. O uso contínuo implica aceitação.</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-[10px] font-semibold">Art. 23 — Encerramento</h3>
                <p>O usuário poderá encerrar a conta. A DaSet poderá encerrar contas por critério técnico, legal ou estratégico.</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-[10px] font-semibold">Art. 24 — Investidores e SCP</h3>
                <p>A DaSet poderá admitir investidores por meio de Sociedade em Conta de Participação (SCP) ou contratos privados. O investidor atuará como sócio participante, sem poderes de gestão. A DaSet é sócia ostensiva e responsável exclusiva pela operação. A participação não implica garantia de retorno. O investimento envolve risco de perda parcial ou total.</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-[10px] font-semibold">Art. 25 — Lei e Foro</h3>
                <p>Aplicam-se as leis da jurisdição da sede da DaSet. Foro conforme sede administrativa.</p>
              </section>

              <section>
                <h3 className="text-cyan-400 text-[10px] font-semibold">Art. 26 — Disposições Finais</h3>
                <p>Se alguma cláusula for inválida, as demais permanecem válidas. Este documento constitui o acordo integral entre as partes.</p>
              </section>

              <p className="text-slate-500 text-[9px] text-center pt-2 border-t border-slate-700">
                © 2026 Skemania.com · Operado pela DaSet · Todos os direitos reservados.
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
