import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-slate-200">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-6 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>

        <h1 className="text-3xl font-bold text-white mb-2">Termos de Uso — SKEMIND</h1>
        <p className="text-slate-400 text-sm mb-8">Última atualização: 12 de fevereiro de 2026</p>

        <ScrollArea className="h-auto">
          <article className="prose prose-invert prose-sm max-w-none space-y-6">

            <section>
              <h2 className="text-xl font-semibold text-cyan-400">1. Aceitação dos Termos</h2>
              <p>
                Ao acessar e utilizar a plataforma SKEMIND ("Plataforma"), você concorda em cumprir e estar vinculado a estes Termos de Uso ("Termos"). Caso não concorde com qualquer disposição, não utilize a Plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-cyan-400">2. Definições</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>"Energia" ou "k$"</strong>: unidade virtual de crédito utilizada exclusivamente dentro da Plataforma para participação em jogos, corridas e arenas. A Energia NÃO possui valor monetário real.</li>
                <li><strong>"Jogador"</strong>: qualquer pessoa física registrada na Plataforma.</li>
                <li><strong>"Skema Box"</strong>: fundo coletivo do ecossistema alimentado por taxas de operação.</li>
                <li><strong>"Código DNA"</strong>: código de convite único gerado por Jogadores para expansão da rede.</li>
                <li><strong>"Tiers"</strong>: níveis hierárquicos (CD HX, Criador, Grão Mestre, Mestre, Boom, Ploft) que determinam privilégios e limites dentro da Plataforma.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-cyan-400">3. Natureza da Energia (k$)</h2>
              <p>
                A Energia (k$) é uma moeda virtual de entretenimento. <strong>Em hipótese alguma</strong> a Energia poderá ser convertida, trocada, sacada ou resgatada por dinheiro real, bens, serviços ou qualquer outro item de valor fora da Plataforma. A Energia:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Não constitui propriedade do Jogador;</li>
                <li>Não é elegível a saque, transferência bancária ou conversão monetária;</li>
                <li>Existe exclusivamente para fins de entretenimento e competição dentro da Plataforma;</li>
                <li>Pode ser ajustada, redistribuída ou zerada pela administração para manutenção do equilíbrio do ecossistema;</li>
                <li>Opera sob um sistema de economia fechada de soma zero (10.000.000,00 k$).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-cyan-400">4. Cadastro e Acesso</h2>
              <p>
                O acesso à Plataforma é feito exclusivamente por convite (Código DNA). Ao se registrar, o Jogador declara:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Ter pelo menos 18 anos de idade;</li>
                <li>Fornecer informações verdadeiras e completas;</li>
                <li>Ser responsável pela segurança de suas credenciais de acesso;</li>
                <li>Não criar contas múltiplas ou fraudulentas.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-cyan-400">5. Sistema de Convites e Hierarquia</h2>
              <p>
                Cada Jogador recebe um número limitado de Códigos DNA conforme seu Tier. A distribuição de convites gera uma estrutura hierárquica de gerações. Os convites:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>São pessoais e intransferíveis;</li>
                <li>Podem ser cancelados pela administração a qualquer momento;</li>
                <li>Implicam bloqueio proporcional de Energia do convidador como garantia;</li>
                <li>Não geram direito a comissão, royalty ou qualquer forma de remuneração em dinheiro real.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-cyan-400">6. Competições e Arenas</h2>
              <p>
                A Plataforma oferece modos de jogo (corridas oficiais, arenas) onde Jogadores competem utilizando Energia. As regras incluem:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Taxa de operação (rake) destinada ao Skema Box;</li>
                <li>Premiação distribuída exclusivamente em Energia (k$);</li>
                <li>Classificações e rankings baseados em desempenho;</li>
                <li>Resultados processados por algoritmos determinísticos e auditáveis.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-cyan-400">7. Transferências entre Jogadores</h2>
              <p>
                Transferências de Energia entre Jogadores são permitidas para Tiers elegíveis (Grão Mestre ou superior), sujeitas a:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Taxa de 6,43% destinada ao Skema Box;</li>
                <li>Limite de transferência restrito ao saldo disponível (excluindo Energia bloqueada);</li>
                <li>Proibição absoluta de comercialização de Energia por dinheiro real fora da Plataforma.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-cyan-400">8. Conduta do Jogador</h2>
              <p>É expressamente proibido:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Utilizar bots, scripts ou automações não autorizadas;</li>
                <li>Manipular resultados de jogos ou competições (conluio);</li>
                <li>Vender, comprar ou negociar Energia (k$) por dinheiro real;</li>
                <li>Criar múltiplas contas (multi-accounting);</li>
                <li>Assediar, ameaçar ou difamar outros Jogadores;</li>
                <li>Explorar falhas ou bugs da Plataforma sem reportar à administração.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-cyan-400">9. Poderes Administrativos</h2>
              <p>
                A administração (Guardian / Master Admin) reserva-se o direito de, a qualquer momento e sem aviso prévio:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Suspender ou encerrar contas que violem estes Termos;</li>
                <li>Ajustar saldos de Energia para manutenção do equilíbrio econômico;</li>
                <li>Cancelar, criar ou redistribuir Códigos DNA;</li>
                <li>Modificar regras de competição, taxas e limites;</li>
                <li>Bloquear Jogadores por comportamento inadequado.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-cyan-400">10. Isenção de Responsabilidade</h2>
              <p>
                A Plataforma é fornecida "como está" (as is). Não garantimos disponibilidade ininterrupta, ausência de erros ou adequação a qualquer finalidade específica. O Jogador utiliza a Plataforma por sua conta e risco, reconhecendo que:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>A Energia não tem valor real e pode ser perdida;</li>
                <li>Interrupções de serviço podem ocorrer;</li>
                <li>A Plataforma pode ser descontinuada a qualquer momento.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-cyan-400">11. Propriedade Intelectual</h2>
              <p>
                Todo o conteúdo da Plataforma (código, design, marca SKEMIND, algoritmos) é propriedade exclusiva dos administradores. O uso da Plataforma não concede ao Jogador qualquer direito de propriedade intelectual.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-cyan-400">12. Alterações dos Termos</h2>
              <p>
                Estes Termos podem ser alterados a qualquer momento. O uso continuado da Plataforma após alterações constitui aceitação dos novos Termos. Alterações relevantes serão comunicadas dentro da Plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-cyan-400">13. Legislação e Foro</h2>
              <p>
                Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de domicílio do administrador para dirimir quaisquer controvérsias.
              </p>
            </section>

            <section className="border-t border-slate-700 pt-6 mt-8">
              <p className="text-slate-500 text-xs text-center">
                © 2026 SKEMIND. Todos os direitos reservados. <br />
                Este documento é um modelo para fins de referência e deve ser revisado por assessoria jurídica antes de publicação definitiva.
              </p>
            </section>

          </article>
        </ScrollArea>
      </div>
    </div>
  );
};

export default Terms;
