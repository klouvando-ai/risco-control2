
import React, { useState, useEffect } from 'react';
import { Referencia, Modelista, RiscoStatus, User } from '../types';
import { dataService } from '../services/dataService';
import { DollarSign, CheckCircle, Search, Calendar, Users, Loader2 } from 'lucide-react';

const Financeiro: React.FC<{ user: User }> = ({ user }) => {
  const [refs, setRefs] = useState<Referencia[]>([]);
  const [modelistas, setModelistas] = useState<Modelista[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'PAID'>('OPEN');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModelistaId, setSelectedModelistaId] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const refsData = await dataService.getReferencias();
      setRefs(refsData.filter(r => r.status === RiscoStatus.RECEBIDO || r.status === RiscoStatus.PAGO));
      const modsData = await dataService.getModelistas();
      setModelistas(modsData);
    } catch (error) {
      console.error("Error loading financial data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (id: string) => {
    if (confirm('Confirmar pagamento desta referência?')) {
      try {
        await dataService.markAsPaid(id);
        await loadData();
      } catch (err: any) {
        alert("Erro ao pagar: " + err.message);
      }
    }
  };

  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '---';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const filtered = refs.filter(r => {
    const matchSearch = r.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFilter = filter === 'ALL' ? true : (filter === 'OPEN' ? r.status === RiscoStatus.RECEBIDO : r.status === RiscoStatus.PAGO);
    const matchModelista = selectedModelistaId === '' ? true : r.modelistaId === selectedModelistaId;
    return matchSearch && matchFilter && matchModelista;
  }).sort((a, b) => {
    const d1 = (a.dataRecebimento || a.dataPedido || '');
    const d2 = (b.dataRecebimento || b.dataPedido || '');
    return d2.localeCompare(d1);
  });

  const totalEmAberto = refs
    .filter(r => r.status === RiscoStatus.RECEBIDO)
    .filter(r => selectedModelistaId === '' ? true : r.modelistaId === selectedModelistaId)
    .reduce((acc, curr) => acc + (Number(curr.valorTotal) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 text-emerald-700">Controle Financeiro</h1>
          <p className="text-gray-500">Acompanhe e realize os pagamentos das modelistas.</p>
        </div>
        <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl px-6 py-4 min-w-[200px]">
          <p className="text-emerald-600 text-xs font-bold uppercase">Aberto (Filtrado)</p>
          <p className="text-2xl font-black text-emerald-900">R$ {totalEmAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden min-h-[300px] relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
            <Loader2 className="animate-spin text-emerald-600" size={32} />
          </div>
        )}

        <div className="p-4 border-b flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-50/50">
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text" placeholder="Buscar Ref..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 outline-none focus:border-emerald-500 text-sm"
              />
            </div>
            
            <div className="relative w-full md:w-56">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select
                value={selectedModelistaId}
                onChange={(e) => setSelectedModelistaId(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 outline-none focus:border-emerald-500 text-sm appearance-none bg-white"
              >
                <option value="">Todas Modelistas</option>
                {modelistas.map(m => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex bg-gray-200/50 p-1 rounded-xl">
            <button 
              onClick={() => setFilter('OPEN')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'OPEN' ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Em Aberto
            </button>
            <button 
              onClick={() => setFilter('PAID')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'PAID' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Pagos
            </button>
            <button 
              onClick={() => setFilter('ALL')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'ALL' ? 'bg-white shadow text-gray-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Todos
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-[10px] font-bold uppercase tracking-widest border-b">
                <th className="px-6 py-4">Recebimento</th>
                <th className="px-6 py-4">Referência / Modelista</th>
                <th className="px-6 py-4">Metragens</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(r => {
                const modelista = modelistas.find(m => m.id === r.modelistaId);
                return (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDateBR(r.dataRecebimento)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{r.codigo}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        {modelista?.nome} • <span className="font-semibold italic">R$ {Number(modelista?.valorPorMetro || 0).toFixed(2)}/m</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-medium">Largura: <span className="text-blue-600 font-bold">{Number(r.medidaConsiderada || 0).toFixed(2)}m</span></div>
                      <div className="text-xs font-medium">Risco: <span className="text-emerald-600 font-bold">{Number(r.comprimentoFinal || 0).toFixed(2)}m</span></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-base font-black text-gray-900">R$ {Number(r.valorTotal || 0).toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider w-fit ${
                          r.status === RiscoStatus.PAGO ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {r.status === RiscoStatus.PAGO ? 'PAGO' : 'EM ABERTO'}
                        </span>
                        {r.dataPagamento && (
                          <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                            <Calendar size={10} /> {formatDateBR(r.dataPagamento)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {r.status === RiscoStatus.RECEBIDO ? (
                        <button 
                          onClick={() => handlePay(r.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg transition-all shadow-md hover:scale-110 active:scale-95"
                          title="Marcar como Pago"
                        >
                          <DollarSign size={18} />
                        </button>
                      ) : (
                        <div className="text-blue-500 p-2 flex justify-end">
                           <CheckCircle size={18} />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 italic text-sm">
                    Nenhum registro financeiro encontrado com estes filtros.
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

export default Financeiro;
