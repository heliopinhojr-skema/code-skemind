import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';

export default function ContratoSCP() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white/90">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="text-yellow-300 hover:text-yellow-200 hover:bg-yellow-500/10 mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <div className="border border-yellow-500/30 rounded-2xl p-6 bg-white/5 space-y-6">
          <div className="text-center space-y-2">
            <FileText className="w-10 h-10 text-yellow-400 mx-auto" />
            <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-300">
              CONTRATO DE SOCIEDADE EM CONTA DE PARTICIPAÇÃO (SCP)
            </h1>
            <p className="text-xs text-yellow-400/60 uppercase tracking-widest">
              SKEMANIA — PLANETA SKEMA 1
            </p>
            <p className="text-xs text-yellow-400/60 uppercase tracking-widest">
              DASET — SÓCIA OSTENSIVA
            </p>
            <div className="text-[10px] text-white/40 space-y-0.5">
              <p>Versão Final Oficial</p>
              <p>Última Atualização: 26/02/2026</p>
            </div>
          </div>

          <hr className="border-yellow-500/20" />

          {/* PARTES */}
          <section className="space-y-2 text-[12px] leading-relaxed">
            <h2 className="text-sm font-bold text-yellow-300">PARTES</h2>
            <div>
              <p className="font-semibold text-white/80">SÓCIA OSTENSIVA:</p>
              <p className="text-white/60">DaSet, pessoa jurídica responsável pela operação da plataforma Skemania.</p>
            </div>
            <div>
              <p className="font-semibold text-white/80">SÓCIO PARTICIPANTE (INVESTIDOR):</p>
              <p className="text-white/50">Nome: ___________________________________</p>
              <p className="text-white/50">CPF/CNPJ: ________________________________</p>
              <p className="text-white/50">Endereço: ________________________________</p>
              <p className="text-white/50">Email: __________________________________</p>
            </div>
          </section>

          <hr className="border-white/10" />

          {/* Cláusulas */}
          {[
            {
              title: 'CLÁUSULA 1 — OBJETO',
              content: 'O presente contrato tem por objeto a constituição de Sociedade em Conta de Participação (SCP), nos termos dos artigos 991 a 996 do Código Civil Brasileiro, destinada ao financiamento, expansão e desenvolvimento da plataforma Skemania — Projeto Planeta Skema 1, com meta operacional de até 70.000 (setenta mil) jogadores ativos.'
            },
            {
              title: 'CLÁUSULA 2 — NATUREZA DA SCP',
              content: null,
              items: [
                '2.1 A SCP não possui personalidade jurídica.',
                '2.2 A DASET atua como sócia ostensiva, respondendo integralmente perante terceiros.',
                '2.3 O INVESTIDOR atua como sócio participante oculto, sem representação externa.',
              ]
            },
            {
              title: 'CLÁUSULA 3 — APORTE DE CAPITAL',
              content: null,
              items: [
                '3.1 O INVESTIDOR realizará aporte no valor de: R$ 15.500 em 6 parcelas.',
                '3.2 Cada bloco de investimento corresponde a: R$ 15.500 = 2,5% de participação econômica.',
                '3.3 O aporte não possui natureza de empréstimo.',
              ]
            },
            {
              title: 'CLÁUSULA 4 — PARTICIPAÇÃO NOS RESULTADOS',
              content: null,
              items: [
                '4.1 O INVESTIDOR fará jus a 2,5% dos resultados líquidos da SCP para cada bloco integral de R$ 15.500 investido.',
                '4.2 A participação será proporcional ao número de blocos adquiridos.',
                '4.3 A apuração ocorrerá conforme cronograma interno.',
                '4.4 Não há garantia mínima de retorno.',
              ]
            },
            {
              title: 'CLÁUSULA 5 — RATEIO MENSAL POR BLOCO (MODELO SKEMA)',
              content: null,
              items: [
                '5.1 Cada quota de participação ("Bloco"), correspondente a 2,5% da participação econômica, no valor de R$ 15.500, participará proporcionalmente do custeio operacional do projeto durante o ciclo inicial de implantação, do Mês 0 ao Mês 6.',
                '5.2 O valor investido por cada Bloco será destinado ao financiamento das despesas mensais do projeto: Mês 0 a Mês 6 — R$ 2.600/mês. Total por Bloco: R$ 15.500,00.',
                '5.3 O orçamento operacional global do ciclo inicial é estimado em R$ 155.000, distribuído igualmente entre 10 (dez) Blocos.',
                '5.5 Os recursos serão destinados exclusivamente às despesas: Operacionais, Técnicas, Tecnológicas, Estruturais, Administrativas e Estratégicas do projeto.',
                '5.6 O INVESTIDOR reconhece que os valores possuem natureza de investimento operacional estruturado, não configurando mútuo, empréstimo ou obrigação de restituição automática.',
              ]
            },
            {
              title: 'CLÁUSULA 6 — RISCO DO INVESTIMENTO',
              content: null,
              items: [
                '6.1 O INVESTIDOR declara ciência de que: o investimento envolve risco; pode haver perda parcial ou total; não há promessa de rentabilidade.',
                '6.2 A DASET não garante resultados.',
              ]
            },
            {
              title: 'CLÁUSULA 7 — GESTÃO',
              content: null,
              items: [
                '7.1 A administração é exclusiva da DASET.',
                '7.2 O INVESTIDOR não possui poderes decisórios.',
              ]
            },
            {
              title: 'CLÁUSULA 8 — PRESTAÇÃO DE CONTAS',
              content: null,
              items: [
                '8.1 A DASET fornecerá relatórios consolidados.',
                '8.2 Informações estratégicas são confidenciais.',
              ]
            },
            {
              title: 'CLÁUSULA 9 — CONFIDENCIALIDADE',
              content: null,
              items: [
                '9.1 O INVESTIDOR manterá sigilo absoluto.',
                '9.2 É vedada divulgação de dados internos.',
              ]
            },
            {
              title: 'CLÁUSULA 10 — PRAZO',
              content: null,
              items: [
                '10.1 Prazo inicial: 180 dias.',
                '10.2 Renovável mediante aditivo.',
              ]
            },
            {
              title: 'CLÁUSULA 11 — SAÍDA E RESGATE',
              content: null,
              items: [
                '11.1 O INVESTIDOR poderá solicitar saída mediante aviso prévio mínimo de 45 dias.',
                '11.2 O resgate observará: Política de Liquidez, Fila interna, Disponibilidade financeira.',
                '11.3 Não há resgate imediato garantido.',
              ]
            },
            {
              title: 'CLÁUSULA 12 — RESPONSABILIDADE PERANTE TERCEIROS',
              content: null,
              items: [
                '12.1 A responsabilidade externa é exclusiva da DASET.',
                '12.2 O INVESTIDOR não responde perante terceiros.',
              ]
            },
            {
              title: 'CLÁUSULA 13 — NATUREZA PRIVADA',
              content: null,
              items: [
                '13.1 Este contrato é privado.',
                '13.2 Não constitui oferta pública de valores mobiliários.',
              ]
            },
            {
              title: 'CLÁUSULA 14 — TRIBUTAÇÃO',
              content: null,
              items: [
                '14.1 Cada parte é responsável por seus tributos.',
                '14.2 Retenções serão feitas quando exigidas por lei.',
              ]
            },
            {
              title: 'CLÁUSULA 15 — RESCISÃO',
              content: null,
              items: [
                '15.1 Poderá ocorrer por: Descumprimento, Fraude, Violação contratual, Força maior, Determinação legal.',
                '15.2 Haverá apuração de haveres.',
              ]
            },
            {
              title: 'CLÁUSULA 16 — FORÇA MAIOR',
              content: 'Eventos fora de controle afastam responsabilidade.',
            },
            {
              title: 'CLÁUSULA 17 — ALTERAÇÕES',
              content: 'Somente por escrito e assinadas.',
            },
            {
              title: 'CLÁUSULA 18 — COMUNICAÇÕES',
              content: 'Preferencialmente por meio eletrônico.',
            },
            {
              title: 'CLÁUSULA 19 — INDEPENDÊNCIA DAS PARTES',
              content: 'Este contrato não gera vínculo: Trabalhista, Previdenciário, Societário formal ou Representativo.',
            },
            {
              title: 'CLÁUSULA 20 — INTEGRALIDADE',
              content: 'Este documento constitui o acordo completo entre as partes.',
            },
            {
              title: 'CLÁUSULA 21 — LEI E FORO',
              content: 'Aplica-se a legislação brasileira. Fica eleito o foro da sede da DASET.',
            },
          ].map((c, i) => (
            <section key={i} className="space-y-1 text-[12px] leading-relaxed">
              <h3 className="text-xs font-bold text-yellow-300/90">{c.title}</h3>
              {c.content && <p className="text-white/60">{c.content}</p>}
              {c.items && (
                <ul className="space-y-0.5 text-white/60">
                  {c.items.map((item, j) => <li key={j}>{item}</li>)}
                </ul>
              )}
              <hr className="border-white/5 mt-2" />
            </section>
          ))}

          {/* ASSINATURAS */}
          <section className="space-y-4 text-[12px] leading-relaxed">
            <h2 className="text-sm font-bold text-yellow-300">ASSINATURAS</h2>
            <p className="text-white/60">E, por estarem de acordo, firmam o presente instrumento.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-white/10 rounded-xl p-3 space-y-2 text-white/50">
                <p className="font-semibold text-white/70">DASET — SÓCIA OSTENSIVA</p>
                <p>Assinatura: ______________________________</p>
                <p>Nome: __________________________________</p>
                <p>Cargo: _________________________________</p>
                <p>Data: ____ / ____ / ______</p>
              </div>
              <div className="border border-white/10 rounded-xl p-3 space-y-2 text-white/50">
                <p className="font-semibold text-white/70">INVESTIDOR — SÓCIO PARTICIPANTE</p>
                <p>Assinatura: ______________________________</p>
                <p>Nome: __________________________________</p>
                <p>Data: ____ / ____ / ______</p>
              </div>
            </div>
          </section>

          <div className="text-center pt-4">
            <Button
              onClick={() => navigate(-1)}
              className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold px-8"
              size="lg"
            >
              Li e aceito — Adquira seu Bloco
            </Button>
            <p className="text-[10px] text-white/30 mt-2">
              Ao clicar, você confirma a leitura integral do contrato SCP.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
