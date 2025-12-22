
import React, { useState, useEffect } from 'react';
import { User, Referencia, RiscoStatus } from '../types';
import { dataService } from '../services/dataService';
import { 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Activity
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

const Dashboard: React.FC<{ user: User }> = ({ user }) => {
  const [refs, setRefs] = useState<Referencia[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await dataService.getReferencias();
        setRefs(data);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      }
    };
    fetchData();
  }, []);

  const stats = [
    { label: 'Total Pedidos', value: refs.length, icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Aguardando Risco', value: refs.filter(r => r.status === RiscoStatus.AGUARDANDO_RISCO).length, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Riscos Recebidos', value: refs.filter(r => r.status === RiscoStatus.RECEBIDO).length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Pagamentos Pendentes', value: refs.filter(r => r.status === RiscoStatus.RECEBIDO).length, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  const chartData = [
    { name: 'Jan', value: 40 },
    { name: 'Fev', value: 30 },
    { name: 'Mar', value: 20 },
    { name: 'Abr', value: 27 },
    { name: 'Mai', value: 18 },
    { name: 'Jun', value: 23 },
  ];

  const statusColors: Record<string, string> = {
    [RiscoStatus.AGUARDANDO_ROLO]: '#94a3b8',
    [RiscoStatus.AGUARDANDO_RISCO]: '#f97316',
    [RiscoStatus.RECEBIDO]: '#10b981',
    [RiscoStatus.PAGO]: '#3b82f6',
  };

  const statusDistribution = Object.values(RiscoStatus).map(status => ({
    name: status,
    value: refs.filter(r => r.status === status).length
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Olá, {user.username}!</h1>
        <p className="text-gray-500">Bem-vindo ao painel de controle Kavin's.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white p-6 rounded-2xl border shadow-sm flex items-start space-x-4">
              <div className={`${stat.bg} ${stat.color} p-3 rounded-xl`}>
                <Icon size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="text-blue-600" size={20} />
              Produtividade Mensal (Simulada)
            </h2>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-6">
            <Activity className="text-orange-500" size={20} />
            Status dos Riscos
          </h2>
          <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={120} tick={{fontSize: 11}} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                   {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={statusColors[entry.name] || '#cbd5e1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
