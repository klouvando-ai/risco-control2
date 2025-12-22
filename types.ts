
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export enum RiscoStatus {
  AGUARDANDO_ROLO = 'Aguardando Rolo',
  AGUARDANDO_RISCO = 'Aguardando Risco',
  RECEBIDO = 'Risco Recebido',
  PAGO = 'Pago'
}

export interface User {
  username: string;
  role: UserRole;
}

export interface Modelista {
  id: string;
  nome: string;
  valorPorMetro: number;
  telefone: string;
  observacoes: string;
  ativa: boolean;
}

export interface Rolo {
  id: string;
  medida: number;
}

export interface Referencia {
  id: string;
  codigo: string; // e.g., KAV-1023
  descricao: string;
  dataPedido: string;
  modelistaId: string;
  observacoes: string;
  rolos: Rolo[];
  medidaConsiderada: number; // A maior medida dos rolos
  status: RiscoStatus;
  comprimentoFinal?: number;
  dataRecebimento?: string;
  valorTotal?: number;
  dataPagamento?: string;
}

export interface ReportData {
  totalAPagar: number;
  totalRiscos: number;
  totalMetros: number;
}
