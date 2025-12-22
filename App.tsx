
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { User, UserRole } from './types';
import Login from './views/Login';
import Dashboard from './views/Dashboard';
import Modelistas from './views/Modelistas';
import Referencias from './views/Referencias';
import Financeiro from './views/Financeiro';
import Relatorios from './views/Relatorios';
import { 
  LayoutDashboard, 
  Users, 
  Scissors, 
  DollarSign, 
  BarChart3, 
  LogOut, 
  Menu, 
  X 
} from 'lucide-react';

const SidebarItem: React.FC<{ to: string, icon: React.ReactNode, label: string, onClick?: () => void }> = ({ to, icon, label, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
        isActive 
          ? 'bg-blue-600 text-white' 
          : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </Link>
  );
};

const Layout: React.FC<{ user: User; onLogout: () => void; children: React.ReactNode }> = ({ user, onLogout, children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b px-4 py-3 flex justify-between items-center sticky top-0 z-50">
        <h1 className="text-xl font-bold text-blue-800">Kavin's</h1>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col p-4">
          <div className="hidden md:block mb-8 px-4">
            <h1 className="text-2xl font-bold text-blue-800">Kavin's</h1>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Controle de Risco</p>
          </div>

          <nav className="flex-1 space-y-1">
            <SidebarItem to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" onClick={() => setIsSidebarOpen(false)} />
            <SidebarItem to="/modelistas" icon={<Users size={20} />} label="Modelistas" onClick={() => setIsSidebarOpen(false)} />
            <SidebarItem to="/referencias" icon={<Scissors size={20} />} label="Referências / Risco" onClick={() => setIsSidebarOpen(false)} />
            <SidebarItem to="/financeiro" icon={<DollarSign size={20} />} label="Financeiro" onClick={() => setIsSidebarOpen(false)} />
            {user.role === UserRole.ADMIN && (
              <SidebarItem to="/relatorios" icon={<BarChart3 size={20} />} label="Relatórios" onClick={() => setIsSidebarOpen(false)} />
            )}
          </nav>

          <div className="mt-auto border-t pt-4">
            <div className="px-4 mb-4">
              <p className="text-sm font-medium text-gray-900">{user.username}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role.toLowerCase()}</p>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center space-x-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('kavins_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('kavins_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('kavins_user');
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard user={user} />} />
          <Route path="/modelistas" element={<Modelistas user={user} />} />
          <Route path="/referencias" element={<Referencias user={user} />} />
          <Route path="/financeiro" element={<Financeiro user={user} />} />
          <Route path="/relatorios" element={user.role === UserRole.ADMIN ? <Relatorios /> : <Navigate to="/" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
