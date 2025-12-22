
import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { Modelista, Referencia, RiscoStatus } from '../types';
import { 
  BarChart3, 
  TrendingUp, 
  Layers, 
  Printer,
  Calendar,
  Filter,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';

// Importações usando os nomes do importmap
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const Relatorios: React.FC = () => {
  const [refs, setRefs] = useState<Referencia[]>([]);
  const [modelistas, setModelistas] = useState<Modelista[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros de Data e Modelista - Default: Mês atual
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedModelistaId, setSelectedModelistaId] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const refsData = await dataService.getReferencias();
      const modsData = await dataService.getModelistas();
      setRefs(refsData);
      setModelistas(modsData);
    } catch (error) {
      console.error("Error loading reports data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Função para exibir data formatada PT-BR
  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '---';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // Dados filtrados: Apenas Recebidos ou Pagos dentro do range de datas
  const reportRefs = refs.filter(r => {
    if (r.status !== RiscoStatus.RECEBIDO && r.status !== RiscoStatus.PAGO) return false;
    
    // Normaliza a data para comparação YYYY-MM-DD
    const dateComp = (r.dataRecebimento || r.dataPedido || '').split('T')[0];
    const matchDate = dateComp >= startDate && dateComp <= endDate;
    const matchModelista = selectedModelistaId === '' ? true : r.modelistaId === selectedModelistaId;
    
    return matchDate && matchModelista;
  }).sort((a, b) => {
    const d1 = (a.dataRecebimento || a.dataPedido || '');
    const d2 = (b.dataRecebimento || b.dataPedido || '');
    return d1.localeCompare(d2);
  });

  const totalValorGeral = reportRefs.reduce((acc, curr) => acc + (Number(curr.valorTotal) || 0), 0);
  const totalPago = reportRefs.filter(r => r.status === RiscoStatus.PAGO).reduce((acc, curr) => acc + (Number(curr.valorTotal) || 0), 0);
  const totalAPagar = reportRefs.filter(r => r.status === RiscoStatus.RECEBIDO).reduce((acc, curr) => acc + (Number(curr.valorTotal) || 0), 0);

  const handlePrint = () => {
    try {
      if (reportRefs.length === 0) {
        alert("Nenhum dado encontrado para os filtros selecionados.");
        return;
      }

      const doc = new jsPDF('landscape');
      const modelistaName = selectedModelistaId ? modelistas.find(m => m.id === selectedModelistaId)?.nome : 'Geral';
      
      // Cabeçalho estilizado do PDF
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, 297, 35, 'F');
      
      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.text("Kavin's Industry", 14, 18);
      
      doc.setFontSize(10);
      doc.setTextColor(200, 200, 200);
      doc.text("RELATÓRIO DE PRODUÇÃO E FINANCEIRO", 14, 26);
      
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(`Período: ${formatDateBR(startDate)} a ${formatDateBR(endDate)}`, 210, 15);
      doc.text(`Modelista: ${modelistaName}`, 210, 20);
      doc.text(`Emitido em: ${new Date().toLocaleString('pt-BR')}`, 210, 25);

      const tableData = reportRefs.map(r => [
        formatDateBR(r.dataPedido),
        r.codigo,
        modelistas.find(m => m.id === r.modelistaId)?.nome || 'N/A',
        `${Number(r.medidaConsiderada || 0).toFixed(2)}m`,
        `${Number(r.comprimentoFinal || 0).toFixed(2)}m`,
        formatDateBR(r.dataRecebimento),
        `R$ ${Number(r.valorTotal || 0).toFixed(2)}`,
        r.status === RiscoStatus.PAGO ? 'PAGO' : 'ABERTO'
      ]);

      // Chamada estável do autoTable
      autoTable(doc, {
        startY: 40,
        head: [['Dt. Pedido', 'Ref.', 'Modelista', 'Larg. Rolo', 'Comp. Risco', 'Dt. Receb.', 'Valor Total', 'Status']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [51, 65, 85], fontSize: 9, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          6: { fontStyle: 'bold', halign: 'right' },
          7: { halign: 'center' }
        },
        foot: [[
          '', '', '', '', '',
          'TOTAL DO PERÍODO:', 
          `R$ ${totalValorGeral.toFixed(2)}`,
          ''
        ]],
        footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'right' }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 100;

      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text("Resumo Financeiro", 14, finalY + 15);
      
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`Total Pago: R$ ${totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, finalY + 22);
      doc.text(`Total A Pagar: R$ ${totalAPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, finalY + 27);
      doc.text(`Metragem Total: ${reportRefs.reduce((a,c) => a + (Number(c.comprimentoFinal) || 0), 0).toFixed(2)}m`, 14, finalY + 32);

      // --- CONFIGURAÇÃO PARA ABRIR JANELA DE IMPRESSÃO ---
      doc.autoPrint();
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      // --------------------------------------------------

    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Ocorreu um erro ao gerar a prévia de impressão.");
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatório de Produção</h1>
          <p className="text-gray-500">Visualize e imprima o histórico de riscos e pagamentos.</p>
        </div>
        <button 
          onClick={handlePrint}
          disabled={loading || reportRefs.length === 0}
          className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-900 shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
        >
          <Printer size={20} /> Abrir Impressão
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl border shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
            <Loader2 className="animate-spin text-slate-600" size={32} />
          </div>
        )}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
            <Calendar size={14} /> Data Início
          </label>
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:border-blue-500 font-medium text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
            <Calendar size={14} /> Data Fim
          </label>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:border-blue-500 font-medium text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
            <Filter size={14} /> Modelista
          </label>
          <select
            value={selectedModelistaId}
            onChange={(e) => setSelectedModelistaId(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:border-blue-500 font-medium text-sm appearance-none bg-white"
          >
            <option value="">Todas</option>
            {modelistas.map(m => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Produção Total</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1">R$ {totalValorGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          <p className="text-xs text-gray-500 mt-1">{reportRefs.length} itens encontrados</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Total Liquidado</p>
          <h3 className="text-2xl font-black text-emerald-600 mt-1">R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold mt-1">
            <CheckCircle2 size={12} /> JÁ PAGOS
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <p className="text-xs font-bold text-orange-500 uppercase tracking-widest">Total Pendente</p>
          <h3 className="text-2xl font-black text-orange-600 mt-1">R$ {totalAPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          <div className="flex items-center gap-1 text-[10px] text-orange-500 font-bold mt-1">
            <AlertCircle size={12} /> A PAGAR
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-widest">Prévia dos Dados Filtrados</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white border-b">
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Ref.</th>
                <th className="px-6 py-4">Largura</th>
                <th className="px-6 py-4">Comprimento</th>
                <th className="px-6 py-4 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reportRefs.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDateBR(r.dataRecebimento || r.dataPedido)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-800">{r.codigo}</div>
                    <div className="text-[10px] text-gray-400">{modelistas.find(m => m.id === r.modelistaId)?.nome}</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-blue-600">{Number(r.medidaConsiderada || 0).toFixed(2)}m</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-600">{Number(r.comprimentoFinal || 0).toFixed(2)}m</td>
                  <td className="px-6 py-4 text-right font-black text-slate-900">R$ {Number(r.valorTotal || 0).toFixed(2)}</td>
                </tr>
              ))}
              {!loading && reportRefs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic text-sm">
                    Nenhum dado encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Relatorios;
