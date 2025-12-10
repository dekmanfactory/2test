import React, { useState } from 'react';
import { LayoutDashboard, Layers, Activity, History, Trello, UserPlus, LogOut, ChevronUp, User as UserIcon, X, Mail, Smile } from 'lucide-react';
import { ViewState, User } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  currentUser: User;
  users: User[];
  onSwitchUser: (user: User) => void;
  onRegisterUser: (name: string, email: string, avatar: string) => void;
}

const AVATAR_OPTIONS = ['🐻', '🐼', '🐨', '🐯', '🦁', '🐸', '🐙', '🦄', '👨‍💻', '👩‍💻', '👤', '🤖'];

const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  onNavigate, 
  currentUser, 
  users, 
  onSwitchUser, 
  onRegisterUser 
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  
  // Registration Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regAvatar, setRegAvatar] = useState('🐻');

  const navItems = [
    { id: 'DASHBOARD' as ViewState, icon: LayoutDashboard, label: '대시보드' },
    { id: 'SUITES' as ViewState, icon: Layers, label: '테스트 스위트' },
    { id: 'ISSUES' as ViewState, icon: Trello, label: '이슈 보드' },
  ];

  const handleRegister = () => {
    if (regName && regEmail) {
      onRegisterUser(regName, regEmail, regAvatar);
      setShowRegisterModal(false);
      setRegName('');
      setRegEmail('');
      setRegAvatar('🐻');
      setShowUserMenu(false);
    }
  };

  return (
    <div className="w-20 md:w-64 bg-slate-900 text-white flex flex-col h-screen transition-all duration-300 shadow-xl z-20">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0 text-2xl shadow-lg">
          🧸
        </div>
        <h1 className="text-xl font-bold tracking-tight hidden md:block">AutoTest AI</h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={22} />
              <span className="font-medium hidden md:block">{item.label}</span>
              {isActive && <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full hidden md:block" />}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 relative">
        <button 
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="w-full bg-slate-800 hover:bg-slate-700 rounded-lg p-3 transition-colors flex items-center gap-3 text-left"
        >
           <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center text-xl bg-slate-900 rounded-full border border-slate-700">
             {currentUser.avatar}
           </div>
           <div className="hidden md:block flex-1 overflow-hidden">
             <p className="text-sm font-semibold text-slate-200 truncate">{currentUser.name}</p>
             <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
           </div>
           <ChevronUp size={16} className={`text-slate-500 transition-transform hidden md:block ${showUserMenu ? 'rotate-180' : ''}`} />
        </button>

        {/* User Menu Popover */}
        {showUserMenu && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden animate-fade-in-up">
            <div className="p-2 border-b border-slate-700">
              <p className="text-xs font-bold text-slate-500 px-2 py-1 uppercase">계정 전환</p>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {users.map(user => (
                <button
                  key={user.id}
                  onClick={() => {
                    onSwitchUser(user);
                    setShowUserMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 p-2 hover:bg-slate-700 transition-colors ${user.id === currentUser.id ? 'bg-slate-700/50' : ''}`}
                >
                  <span className="text-lg">{user.avatar}</span>
                  <span className={`text-sm ${user.id === currentUser.id ? 'font-bold text-white' : 'text-slate-300'}`}>
                    {user.name}
                  </span>
                  {user.id === currentUser.id && <div className="ml-auto w-2 h-2 bg-green-500 rounded-full" />}
                </button>
              ))}
            </div>
            <div className="p-2 border-t border-slate-700">
               <button 
                 onClick={() => {
                    setShowUserMenu(false);
                    setShowRegisterModal(true);
                 }}
                 className="w-full flex items-center gap-2 p-2 text-sm text-blue-400 hover:text-blue-300 hover:bg-slate-700/50 rounded-lg transition-colors"
               >
                 <UserPlus size={16} /> 계정 등록
               </button>
            </div>
          </div>
        )}
      </div>

      {/* Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in-up">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold">계정 생성</h3>
                <p className="text-slate-400 text-xs mt-1">테스트 팀에 합류하세요!</p>
              </div>
              <button onClick={() => setShowRegisterModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">이름</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon size={16} className="text-slate-400"/>
                  </div>
                  <input 
                    autoFocus
                    className="w-full border border-slate-300 rounded-lg pl-10 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                    placeholder="예: 홍길동"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">이메일 주소</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={16} className="text-slate-400"/>
                  </div>
                  <input 
                    type="email"
                    className="w-full border border-slate-300 rounded-lg pl-10 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                    placeholder="name@company.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">아바타 선택</label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATAR_OPTIONS.map(avatar => (
                    <button
                      key={avatar}
                      onClick={() => setRegAvatar(avatar)}
                      className={`w-10 h-10 flex items-center justify-center text-xl rounded-full transition-all ${
                        regAvatar === avatar 
                          ? 'bg-blue-100 border-2 border-blue-500 shadow-sm scale-110' 
                          : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {avatar}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                 <button 
                   onClick={() => setShowRegisterModal(false)}
                   className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                 >
                   취소
                 </button>
                 <button 
                   onClick={handleRegister}
                   disabled={!regName || !regEmail}
                   className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-md disabled:opacity-50"
                 >
                   가입하기
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;