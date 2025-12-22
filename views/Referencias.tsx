
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

  // New Ref Form
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [modelistaId, setModelistaId] = useState('');
  const [obs, setObs] = useState('');

  // Roll Form
  const [newRollMeasure, setNewRollMeasure] = useState('');
  
  // Receive Form
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
      setError("Erro ao carregar dados. Verifique a conexão com o banco.");
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
      
      // Atualiza localmente para rapidez
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
  ).sort((a, b) => new Date(b.dataPedido).getTime() - new Date(a.dataPedido).getTime());

  const getStatusBadge = (status: string) => {
    switch(status) {
      case RiscoStatus.AGUARDANDO_ROLO: return 'bg-gray-100 text-gray-600';
      case RiscoStatus.AGUARDANDO_RISCO: return 'bg-orange-100 text-orange-600';
      case RiscoStatus.RECEBIDO: return 'bg-emerald-100 text-emerald-600';
      case RiscoStatus.PAGO: return 'bg-blue-100 text-blue-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  // Função para exibir data formatada PT-BR
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
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100"
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
        {(loading || (actionLoading && !isRollModalOpen)) && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        )}
        
        <div className="p-4 border-b">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por referência ou descrição..."
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
                <th className="px-6 py-4">Modelista</th>
                <th className="px-6 py-4">Medida Max.</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-blue-50/20 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDateBR(r.dataPedido)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{r.codigo}</div>
                    <div className="text-xs text-gray-500">{r.descricao}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {modelistas.find(m => m.id === r.modelistaId)?.nome || 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    {Number(r.medidaConsiderada) > 0 ? (
                      <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {Number(r.medidaConsiderada).toFixed(2)}m
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs italic">Aguard. rolos</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(r.status)}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {r.status === RiscoStatus.AGUARDANDO_ROLO || r.status === RiscoStatus.AGUARDANDO_RISCO ? (
                        <button 
                          onClick={() => { setSelectedRef(r); setIsRollModalOpen(true); }}
                          title="Medir Rolos"
                          className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                        >
                          <Layers size={14} /> Rolos
                        </button>
                      ) : null}
                      
                      {r.status === RiscoStatus.AGUARDANDO_RISCO && (
                        <button 
                          onClick={() => { setSelectedRef(r); setIsReceiveModalOpen(true); }}
                          className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md"
                        >
                          <ArrowRight size={14} /> Receber
                        </button>
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
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Nenhuma referência encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Reference */}
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
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200" placeholder="Ex: KAV-1023"
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
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200" placeholder="Ex: Vestido Infantil Floral"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Observações</label>
                <textarea
                  rows={2} value={obs} onChange={(e) => setObs(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" disabled={actionLoading} onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 rounded-xl border font-bold">Cancelar</button>
                <button type="submit" disabled={actionLoading} className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                  {actionLoading ? <Loader2 className="animate-spin" size={20} /> : 'Abrir Pedido'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Roll Measurements */}
      {isRollModalOpen && selectedRef && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-800 text-white">
              <div>
                <h3 className="text-xl font-bold">Medidas dos Rolos - {selectedRef.codigo}</h3>
                <p className="text-gray-400 text-xs">{selectedRef.descricao}</p>
              </div>
              <button onClick={() => { setIsRollModalOpen(false); setSelectedRef(null); }}><X size={24} /></button>
            </div>
            
            <div className="p-6">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">Medida considerada para o risco:</p>
                  <p className="text-3xl font-black text-blue-900">
                    {Number(selectedRef.medidaConsiderada) > 0 ? Number(selectedRef.medidaConsiderada).toFixed(2) : '0,00'} m
                  </p>
                </div>
                <Scissors size={40} className="text-blue-200" />
              </div>

              <form onSubmit={handleAddRoll} className="flex gap-3 mb-6">
                <input
                  type="text" required value={newRollMeasure}
                  onChange={(e) => setNewRollMeasure(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-lg font-bold"
                  placeholder="Medida do rolo (Ex: 1,45)"
                  disabled={actionLoading}
                />
                <button 
                  type="submit" 
                  disabled={actionLoading}
                  className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2"
                >
                  {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />} Adicionar Rolo
                </button>
              </form>

              <div className="max-h-[300px] overflow-auto pr-2 space-y-2 relative">
                {selectedRef.rolos.map((rolo, idx) => (
                  <div key={rolo.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-transparent hover:border-gray-200 group">
                    <div className="flex items-center gap-4">
                      <span className="bg-gray-200 text-gray-500 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">
                        {idx + 1}
                      </span>
                      <span className="text-lg font-bold text-gray-700">{Number(rolo.medida).toFixed(2)} m</span>
                    </div>
                    <button 
                      onClick={() => handleRemoveRoll(rolo.id)}
                      disabled={actionLoading}
                      className="text-red-400 opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                {selectedRef.rolos.length === 0 && (
                  <div className="text-center py-10 text-gray-400 italic">Nenhum rolo cadastrado ainda.</div>
                )}
              </div>

              <div className="mt-8">
                <button 
                  disabled={selectedRef.rolos.length === 0 || actionLoading}
                  onClick={() => { setIsRollModalOpen(false); setSelectedRef(null); }}
                  className={`w-full py-4 rounded-xl font-bold transition-all ${
                    selectedRef.rolos.length > 0 ? 'bg-emerald-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Confirmar e Finalizar Medições
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Receive Risco */}
      {isReceiveModalOpen && selectedRef && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-emerald-600 text-white">
              <h3 className="text-xl font-bold">Receber Risco Pronto</h3>
              <button onClick={() => { setIsReceiveModalOpen(false); setSelectedRef(null); }}><X size={24} /></button>
            </div>
            <form onSubmit={handleReceiveRisco} className="p-6 space-y-4">
              <div className="p-4 bg-emerald-50 rounded-xl mb-4 border border-emerald-100">
                <p className="text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2">Informações de Medida</p>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm text-gray-500">Ref:</p>
                    <p className="font-bold text-lg">{selectedRef.codigo}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Largura Máx:</p>
                    <p className="font-bold text-lg">{Number(selectedRef.medidaConsiderada).toFixed(2)} m</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Comprimento Final do Risco (Metros)</label>
                <input
                  type="text" required value={comprimentoFinal}
                  onChange={(e) => setComprimentoFinal(e.target.value)}
                  className="w-full px-5 py-4 rounded-xl border-2 border-emerald-100 text-2xl font-black text-emerald-800 outline-none focus:border-emerald-500"
                  placeholder="Ex: 8,30" autoFocus
                  disabled={actionLoading}
                />
                <p className="text-xs text-gray-500">O valor a pagar será calculado automaticamente.</p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Observações do Recebimento</label>
                <textarea
                  rows={2} value={receiveObs} onChange={(e) => setReceiveObs(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 resize-none"
                  placeholder="Ex: Risco bem encaixado, sobrou material."
                  disabled={actionLoading}
                />
              </div>

              <button 
                type="submit" 
                disabled={actionLoading}
                className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-700 shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
              >
                {actionLoading ? <Loader2 className="animate-spin" size={24} /> : 'Salvar Entrada e Calcular Valor'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Referencias;
