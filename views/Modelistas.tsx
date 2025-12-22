
import React, { useState, useEffect } from 'react';
import { Modelista, User } from '../types';
import { dataService } from '../services/dataService';
import { Plus, Search, Edit2, Trash2, Phone, X, Check, Loader2, AlertCircle } from 'lucide-react';

const Modelistas: React.FC<{ user: User }> = ({ user }) => {
  const [modelistas, setModelistas] = useState<Modelista[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');
  const [telefone, setTelefone] = useState('');
  const [obs, setObs] = useState('');
  const [ativa, setAtiva] = useState(true);

  useEffect(() => {
    loadModelistas();
  }, []);

  const loadModelistas = async () => {
    setLoading(true);
    try {
      const data = await dataService.getModelistas();
      setModelistas(data);
      setError(null);
    } catch (err: any) {
      setError("Não foi possível carregar a lista de modelistas. Verifique se o servidor está rodando.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (m?: Modelista) => {
    setError(null);
    if (m) {
      setEditingId(m.id);
      setNome(m.nome);
      setValor(m.valorPorMetro.toString());
      setTelefone(m.telefone);
      setObs(m.observacoes);
      setAtiva(Boolean(m.ativa));
    } else {
      setEditingId(null);
      setNome('');
      setValor('');
      setTelefone('');
      setObs('');
      setAtiva(true);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      const newModelista: Modelista = {
        id: editingId || Date.now().toString(),
        nome,
        valorPorMetro: parseFloat(valor),
        telefone,
        observacoes: obs,
        ativa
      };
      
      await dataService.saveModelista(newModelista);
      setIsModalOpen(false);
      await loadModelistas();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar modelista no banco de dados.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja realmente excluir esta modelista?')) {
      try {
        await dataService.deleteModelista(id);
        await loadModelistas();
      } catch (err: any) {
        alert("Erro ao excluir: " + err.message);
      }
    }
  };

  const filtered = modelistas.filter(m => 
    m.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cadastro de Modelistas</h1>
          <p className="text-gray-500">Gerencie os profissionais que realizam seus riscos.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
        >
          <Plus size={20} /> Nova Modelista
        </button>
      </div>

      {error && !isModalOpen && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[200px] relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50">
              <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-sm font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">Valor / Metro</th>
                  <th className="px-6 py-4">Contato</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{m.nome}</td>
                    <td className="px-6 py-4 text-gray-600">
                      <span className="font-semibold text-blue-600">R$ {Number(m.valorPorMetro).toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-gray-400" />
                        {m.telefone}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${m.ativa ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {m.ativa ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleOpenModal(m)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => handleDelete(m.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      Nenhuma modelista encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingId ? 'Editar Modelista' : 'Cadastrar Modelista'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-100 p-3 rounded-lg text-red-600 text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Nome Completo</label>
                <input
                  type="text"
                  required
                  disabled={submitting}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-blue-500 transition-all disabled:bg-gray-50"
                  placeholder="Nome da modelista"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Valor por Metro (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    disabled={submitting}
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-blue-500 transition-all disabled:bg-gray-50"
                    placeholder="5.00"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    disabled={submitting}
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-blue-500 transition-all disabled:bg-gray-50"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Observações</label>
                <textarea
                  rows={3}
                  disabled={submitting}
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-blue-500 transition-all resize-none disabled:bg-gray-50"
                  placeholder="Informações adicionais..."
                />
              </div>

              <div className="flex items-center gap-3 py-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setAtiva(!ativa)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${ativa ? 'bg-emerald-500' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-all ${ativa ? 'left-7' : 'left-1'}`} />
                </button>
                <span className="text-sm font-medium text-gray-600">{ativa ? 'Conta Ativa' : 'Conta Inativa'}</span>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl border font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 disabled:bg-blue-400 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="animate-spin" size={20} /> : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Modelistas;
