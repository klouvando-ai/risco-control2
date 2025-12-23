import { Modelista, Referencia, RiscoStatus, ReportData } from '../types';

const API_BASE = '/api';

const getTodayLocal = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

const cleanDate = (d: any) => {
  if (!d) return null;
  if (typeof d !== 'string') return null;
  return d.split('T')[0];
};

export const dataService = {
  getModelistas: async (): Promise<Modelista[]> => {
    try {
      const response = await fetch(`${API_BASE}/modelistas`);
      if (!response.ok) throw new Error(`Erro ${response.status}`);
      return response.json();
    } catch (err: any) {
      console.error("Erro ao buscar modelistas:", err);
      throw err;
    }
  },
  
  saveModelista: async (modelista: Modelista) => {
    const response = await fetch(`${API_BASE}/modelistas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(modelista)
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(data.error || 'Erro ao salvar modelista');
    }
    return response.json();
  },
  
  deleteModelista: async (id: string) => {
    const response = await fetch(`${API_BASE}/modelistas/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Erro ao deletar no servidor');
    return response.json();
  },

  getReferencias: async (): Promise<Referencia[]> => {
    try {
      const response = await fetch(`${API_BASE}/referencias`);
      if (!response.ok) throw new Error('Falha ao buscar referências');
      const data = await response.json();
      return data.map((r: any) => ({
        ...r,
        dataPedido: cleanDate(r.dataPedido),
        dataRecebimento: cleanDate(r.dataRecebimento),
        dataPagamento: cleanDate(r.dataPagamento)
      }));
    } catch (err: any) {
      console.error("Erro ao buscar referências:", err);
      throw err;
    }
  },
  
  saveReferencia: async (ref: Referencia) => {
    const cleanedRolos = (ref.rolos || []).map(r => {
      const val = r.medida as any;
      const measure = typeof val === 'string' 
        ? parseFloat(val.replace(',', '.')) 
        : Number(val);
      return { ...r, medida: isNaN(measure) ? 0 : measure };
    });

    const medidaCons = ref.medidaConsiderada as any;
    const maxMeasure = cleanedRolos.length > 0 
      ? Math.max(...cleanedRolos.map(r => r.medida)) 
      : (typeof medidaCons === 'string' ? parseFloat(medidaCons.replace(',', '.')) : Number(medidaCons)) || 0;

    let finalStatus = ref.status;
    if (cleanedRolos.length > 0 && ref.status === RiscoStatus.AGUARDANDO_ROLO) {
      finalStatus = RiscoStatus.AGUARDANDO_RISCO;
    } else if (cleanedRolos.length === 0 && ref.status === RiscoStatus.AGUARDANDO_RISCO) {
      finalStatus = RiscoStatus.AGUARDANDO_ROLO;
    }

    const payload = {
      ...ref,
      dataPedido: cleanDate(ref.dataPedido) || getTodayLocal(),
      dataRecebimento: cleanDate(ref.dataRecebimento),
      dataPagamento: cleanDate(ref.dataPagamento),
      rolos: cleanedRolos,
      medidaConsiderada: maxMeasure,
      status: finalStatus
    };

    const response = await fetch(`${API_BASE}/referencias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erro ao salvar referência' }));
      throw new Error(error.error || 'Erro ao salvar referência');
    }
    return response.json();
  },

  deleteReferencia: async (id: string) => {
    const response = await fetch(`${API_BASE}/referencias/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Falha ao deletar referência' }));
      throw new Error(error.error || 'Erro ao deletar');
    }
    return response.json();
  },

  markAsPaid: async (refId: string) => {
    const response = await fetch(`${API_BASE}/referencias/${refId}/pagar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataPagamento: getTodayLocal()
      })
    });
    if (!response.ok) throw new Error('Erro ao processar pagamento');
    return response.json();
  },

  receiveRisco: async (refId: string, comprimento: number | string, obs: string) => {
    const compNum = typeof comprimento === 'string' ? parseFloat(comprimento.replace(',', '.')) : comprimento;
    if (isNaN(compNum)) throw new Error('Comprimento inválido');

    const modelistas = await dataService.getModelistas();
    const refs = await dataService.getReferencias();
    const ref = refs.find(r => r.id === refId);
    if (!ref) throw new Error('Referência não encontrada');

    const modelista = modelistas.find(m => m.id === ref.modelistaId);
    const valorTotal = modelista ? compNum * modelista.valorPorMetro : 0;

    const response = await fetch(`${API_BASE}/referencias/${refId}/receber`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comprimentoFinal: compNum,
        dataRecebimento: getTodayLocal(),
        valorTotal: valorTotal,
        observacoes: (ref.observacoes ? ref.observacoes + '\n' : '') + obs
      })
    });

    if (!response.ok) throw new Error('Erro ao registrar recebimento');
    return response.json();
  },

  getReportData: async (month?: string): Promise<ReportData> => {
    const refs = await dataService.getReferencias();
    const filtered = month ? refs.filter(r => r.dataPedido?.startsWith(month)) : refs;
    
    return {
      totalAPagar: filtered.filter(r => r.status === RiscoStatus.RECEBIDO).reduce((acc, curr) => acc + (Number(curr.valorTotal) || 0), 0),
      totalRiscos: filtered.length,
      totalMetros: filtered.reduce((acc, curr) => acc + (Number(curr.comprimentoFinal) || 0), 0)
    };
  },

  exportBackup: async () => {
    const mods = await dataService.getModelistas();
    const refs = await dataService.getReferencias();
    const data = { modelistas: mods, referencias: refs, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_kavins_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
};