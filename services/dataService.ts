import { Modelista, Referencia, RiscoStatus, ReportData } from '../types';

// Declaração para o TypeScript reconhecer a ponte do Electron
declare global {
  interface Window {
    electronAPI: {
      getModelistas: () => Promise<Modelista[]>;
      saveModelista: (m: Modelista) => Promise<boolean>;
      deleteModelista: (id: string) => Promise<boolean>;
      getReferencias: () => Promise<Referencia[]>;
      saveReferencia: (r: Referencia) => Promise<boolean>;
      deleteReferencia: (id: string) => Promise<boolean>;
    }
  }
}

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
    return await window.electronAPI.getModelistas();
  },
  
  saveModelista: async (modelista: Modelista) => {
    return await window.electronAPI.saveModelista(modelista);
  },
  
  deleteModelista: async (id: string) => {
    return await window.electronAPI.deleteModelista(id);
  },

  getReferencias: async (): Promise<Referencia[]> => {
    const data = await window.electronAPI.getReferencias();
    return data.map((r: any) => ({
      ...r,
      dataPedido: cleanDate(r.dataPedido),
      dataRecebimento: cleanDate(r.dataRecebimento),
      dataPagamento: cleanDate(r.dataPagamento)
    }));
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

    return await window.electronAPI.saveReferencia(payload);
  },

  deleteReferencia: async (id: string) => {
    return await window.electronAPI.deleteReferencia(id);
  },

  markAsPaid: async (refId: string) => {
    const refs = await dataService.getReferencias();
    const ref = refs.find(r => r.id === refId);
    if (!ref) throw new Error('Referência não encontrada');
    
    return await window.electronAPI.saveReferencia({
      ...ref,
      status: RiscoStatus.PAGO,
      dataPagamento: getTodayLocal()
    });
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

    return await window.electronAPI.saveReferencia({
      ...ref,
      comprimentoFinal: compNum,
      dataRecebimento: getTodayLocal(),
      valorTotal: valorTotal,
      observacoes: (ref.observacoes ? ref.observacoes + '\n' : '') + obs,
      status: RiscoStatus.RECEBIDO
    });
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