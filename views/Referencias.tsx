import React, { useState, useEffect } from 'react';
import { Referencia, Modelista, RiscoStatus, User, Rolo } from '../types';
import { dataService } from '../services/dataService';
import { 
  Plus, 
  Search, 
  Scissors, 
  Layers, 
  ArrowRight, 
  CheckCircle, 
  Trash2,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react';

const Referencias: React.FC<{ user: User }> = ({ user }) => {
  const [refs, setRefs] = useState<Referencia[]>([]);
  const [modelistas, setModelistas] = useState<Modelista[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRollModalOpen, setIsRollModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [selectedRef, setSelectedRef] = useState<Referencia | null>(null);

  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [modelistaId, setModelistaId] = useState('');
  const [obs, setObs] = useState('');

  const [newRollMeasure, setNewRollMeasure] = useState('');
  const [comprimentoFinal, setComprimentoFinal] = useState('');
  const [receiveObs, setReceiveObs] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const refsData = await dataService.getReferencias();
      const modsData = await dataService.getModelistas();
      setRefs(refsData);
      setModelistas(modsData.filter(m => m.ativa));
    } catch (err: any) {
      setError("Erro ao carregar dados.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNew = () => {
    setCodigo('');
    setDescricao('');
    setModelistaId('');
    setObs('');
    setIsModalOpen(true);
  };

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const newRef: Referencia = {
        id: Date.now().toString(),
        codigo,
        descricao,
        modelistaId,
        observacoes: obs,
        dataPedido: new Date().toISOString().split('T')[0],
        rolos: [],
        medidaConsiderada: 0,
        status: RiscoStatus.AGUARDANDO_ROLO
      };
      await dataService.saveReferencia(newRef);
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert("Erro ao abrir pedido: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRef = async (id: string) => {
    if (!confirm('Deseja realmente excluir este risco permanentemente?')) return;
    setActionLoading(true);
    try {
      await dataService.deleteReferencia(id);
      await loadData();
    } catch (err: any) {
      alert("Erro ao excluir: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddRoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRef || !newRollMeasure) return;

    setActionLoading(true);
    try {
      const measure = parseFloat(newRollMeasure.replace(',', '.'));
      if (isNaN(measure)) throw new Error("Medida inválida");

      const newRolo: Rolo = {
        id: Date.now().toString(),
        medida: measure
      };

      const updatedRef = {
        ...selectedRef,
        rolos: [...selectedRef.rolos, newRolo]
      };

      await dataService.saveReferencia(updatedRef);
      const refsData = await dataService.getReferencias();
      setRefs(refsData);
      const newSelected = refsData.find(r => r.id === selectedRef.id);
      if (newSelected) setSelectedRef(newSelected);
      setNewRollMeasure('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveRoll = async (roloId: string) => {
    if (!selectedRef) return;
    setActionLoading(true);
    try {
      const updatedRef = {
        ...selectedRef,
        rolos: selectedRef.rolos.filter(r => r.id !== roloId)
      };
      await dataService.saveReferencia(updatedRef);
      const refsData = await dataService.getReferencias();
      setRefs(refsData);
      const newSelected = refsData.find(r => r.id === selectedRef.id);
      if (newSelected) setSelectedRef(newSelected);
    } catch (err: any) {
      alert("Erro ao remover rolo: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReceiveRisco = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRef || !comprimentoFinal) return;

    setActionLoading(true);
    try {
      await dataService.receiveRisco(selectedRef.id, comprimentoFinal, receiveObs);
      setIsReceiveModalOpen(false);
      setSelectedRef(null);
      setComprimentoFinal('');
      setReceiveObs('');
      await loadData();
    } catch (err: any) {
      alert("Erro ao receber risco: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = refs.filter(r => 
    r.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => b.dataPedido.localeCompare(a.dataPedido));

  const getStatusBadge = (status: string) => {
    switch(status) {
      case RiscoStatus.AGUARDANDO_ROLO: return 'bg-gray-100 text-gray-600';
      case RiscoStatus.AGUARDANDO_RISCO: return 'bg-orange-100 text-orange-600';
      case RiscoStatus.RECEBIDO: return 'bg-emerald-100 text-emerald-600';
      case RiscoStatus.PAGO: return 'bg-blue-100 text-blue-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '---';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Referências / Controle de Risco</h1>
          <p className="text-gray-500">Fluxo completo do corte até o recebimento do risco.</p>
        </div>
        <button 
          onClick={handleOpenNew}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg"
        >
          <Plus size={20} /> Nova Referência
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden min-h-[400px] relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        )}
        
        <div className="p-4 border-b">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-widest border-b">
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Ref. / Descrição</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-blue-50/20 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDateBR(r.dataPedido)}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{r.codigo}</div>
                    <div className="text-xs text-gray-500">{r.descricao}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(r.status)}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {(r.status === RiscoStatus.AGUARDANDO_ROLO || r.status === RiscoStatus.AGUARDANDO_RISCO) && (
                        <>
                          <button 
                            onClick={() => { setSelectedRef(r); setIsRollModalOpen(true); }}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                          >
                            <Layers size={14} /> Rolos
                          </button>
                          
                          {r.status === RiscoStatus.AGUARDANDO_RISCO && (
                            <button 
                              onClick={() => { setSelectedRef(r); setIsReceiveModalOpen(true); }}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1"
                            >
                              <ArrowRight size={14} /> Receber
                            </button>
                          )}

                          <button 
                            onClick={() => handleDeleteRef(r.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir Risco"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                      
                      {(r.status === RiscoStatus.RECEBIDO || r.status === RiscoStatus.PAGO) && (
                         <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs pr-2">
                            <CheckCircle size={16} /> Finalizado
                         </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals are unchanged except for removing actionLoading blocking logic if needed */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-blue-600 text-white">
              <h3 className="text-xl font-bold">Novo Pedido de Risco</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmitNew} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Referência</label>
                  <input
                    type="text" required value={codigo} onChange={(e) => setCodigo(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Modelista</label>
                  <select
                    required value={modelistaId} onChange={(e) => setModelistaId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200"
                  >
                    <option value="">Selecione...</option>
                    {modelistas.map(m => (
                      <option key={m.id} value={m.id}>{m.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Descrição da Peça</label>
                <input
                  type="text" required value={descricao} onChange={(e) => setDescricao(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Observações</label>
                <textarea
                  rows={2} value={obs} onChange={(e) => setObs(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 rounded-xl border font-bold">Cancelar</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-xl font-bold">Abrir Pedido</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rolo Modal */}
      {isRollModalOpen && selectedRef && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-800 text-white">
              <h3 className="text-xl font-bold">Medidas dos Rolos - {selectedRef.codigo}</h3>
              <button onClick={() => { setIsRollModalOpen(false); setSelectedRef(null); }}><X size={24} /></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleAddRoll} className="flex gap-3 mb-6">
                <input
                  type="text" required value={newRollMeasure}
                  onChange={(e) => setNewRollMeasure(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 font-bold"
                  placeholder="Medida do rolo (Ex: 1,45)"
                />
                <button type="submit" className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-bold">Adicionar</button>
              </form>
              <div className="max-h-[300px] overflow-auto space-y-2">
                {selectedRef.rolos.map((rolo, idx) => (
                  <div key={rolo.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border">
                    <span className="font-bold">{idx + 1}. {Number(rolo.medida).toFixed(2)} m</span>
                    <button onClick={() => handleRemoveRoll(rolo.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                  </div>
                ))}
              </div>
              <button onClick={() => { setIsRollModalOpen(false); setSelectedRef(null); }} className="w-full mt-6 bg-emerald-600 text-white py-4 rounded-xl font-bold">Concluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Receive Modal */}
      {isReceiveModalOpen && selectedRef && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-emerald-600 text-white">
              <h3 className="text-xl font-bold">Receber Risco Pronto</h3>
              <button onClick={() => { setIsReceiveModalOpen(false); setSelectedRef(null); }}><X size={24} /></button>
            </div>
            <form onSubmit={handleReceiveRisco} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Comprimento Final (Metros)</label>
                <input
                  type="text" required value={comprimentoFinal}
                  onChange={(e) => setComprimentoFinal(e.target.value)}
                  className="w-full px-5 py-4 rounded-xl border-2 border-emerald-100 text-2xl font-black text-emerald-800 outline-none"
                  placeholder="Ex: 8,30" autoFocus
                />
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg">Salvar Recebimento</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Referencias;