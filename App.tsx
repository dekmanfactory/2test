import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import SuiteManager from './components/SuiteManager';
import TestRunner from './components/TestRunner';
import IssueBoard from './components/IssueBoard';
import { ViewState, TestSuite, TestRun, Issue, Notification, User } from './types';
import { Bell, X, Check } from 'lucide-react';

// Mock Initial Data
const MOCK_USERS: User[] = [
  { id: 'admin_1', name: '최고 관리자', email: 'administrator@autotest.ai', avatar: '🛡️' },
  { id: 'u1', name: '테스터 곰', email: 'bear@autotest.ai', avatar: '🐻' },
  { id: 'u2', name: '개발자 데이브', email: 'dave@dev.co', avatar: '👨‍💻' }
];

const MOCK_SUITES: TestSuite[] = [
  {
    id: '1',
    name: '인증 흐름',
    description: '로그인, 회원가입 및 비밀번호 재설정 시나리오',
    createdAt: new Date().toISOString(),
    permissions: {
      'u1': 'ADMIN', // Tester Bear is Admin of this project
      'u2': 'OBSERVER' // Dave is Observer
    },
    cases: [
      {
        id: 'c1',
        title: '유효한 로그인',
        description: '유효한 자격 증명으로 로그인할 수 있는지 확인',
        priority: 'High',
        steps: [
          { id: 's1', action: '로그인 페이지로 이동', expectedResult: '로그인 폼이 표시됨' },
          { id: 's2', action: '유효한 사용자명과 비밀번호 입력', expectedResult: '입력 필드에 데이터가 입력됨' },
          { id: 's3', action: '로그인 버튼 클릭', expectedResult: '대시보드로 리디렉션됨' }
        ]
      },
      {
        id: 'c2',
        title: '잘못된 비밀번호',
        description: '잘못된 비밀번호 입력 시 오류 메시지 확인',
        priority: 'Medium',
        steps: [
          { id: 's1', action: '로그인 페이지로 이동', expectedResult: '로그인 폼이 표시됨' },
          { id: 's2', action: '유효한 사용자명과 잘못된 비밀번호 입력', expectedResult: '입력 필드에 데이터가 입력됨' },
          { id: 's3', action: '로그인 버튼 클릭', expectedResult: '"잘못된 자격 증명입니다" 오류 메시지 표시' }
        ]
      },
      {
        id: 'c3',
        title: '바닥글 링크 확인',
        description: '개인정보 처리방침 링크가 작동하는지 확인',
        priority: 'Low',
        steps: [
          { id: 's1', action: '바닥글로 스크롤', expectedResult: '바닥글 표시됨' },
          { id: 's2', action: '개인정보 처리방침 클릭', expectedResult: '개인정보 페이지 열림' }
        ]
      }
    ]
  }
];

const MOCK_ISSUES: Issue[] = [
  {
    id: 'i1',
    key: 'ISS-1',
    title: 'IE11에서 로그인 버튼 정렬 어긋남',
    description: '로그인 버튼이 왼쪽으로 10px 이동됨.',
    status: 'TODO',
    priority: 'Low',
    assignee: '테스터 곰',
    createdAt: new Date().toISOString()
  },
  {
    id: 'i2',
    key: 'ISS-2',
    title: '50MB 파일 업로드 시 충돌',
    description: '앱이 즉시 종료됨.',
    status: 'IN_PROGRESS',
    priority: 'Critical',
    assignee: '테스터 곰',
    createdAt: new Date().toISOString()
  }
];

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [suites, setSuites] = useState<TestSuite[]>(MOCK_SUITES);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [issues, setIssues] = useState<Issue[]>(MOCK_ISSUES);
  const [activeRunSuite, setActiveRunSuite] = useState<TestSuite | null>(null);
  
  // User & Notification State
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[1]); // Default to Bear
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  // Load from local storage on mount (simulated persistence)
  useEffect(() => {
    const savedSuites = localStorage.getItem('autotest_suites');
    const savedRuns = localStorage.getItem('autotest_runs');
    const savedIssues = localStorage.getItem('autotest_issues');
    const savedUsers = localStorage.getItem('autotest_users');
    
    if (savedSuites) setSuites(JSON.parse(savedSuites));
    if (savedRuns) setRuns(JSON.parse(savedRuns));
    if (savedIssues) setIssues(JSON.parse(savedIssues));
    if (savedUsers) {
      const parsedUsers = JSON.parse(savedUsers);
      setUsers(parsedUsers);
      // Ensure Mock Admin exists if data is old
      if (!parsedUsers.find((u: User) => u.email === 'administrator@autotest.ai')) {
        setUsers([MOCK_USERS[0], ...parsedUsers]);
      } else {
        // Try to keep current user valid
        const found = parsedUsers.find((u: User) => u.id === currentUser.id);
        if (found) setCurrentUser(found);
      }
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('autotest_suites', JSON.stringify(suites));
  }, [suites]);

  useEffect(() => {
    localStorage.setItem('autotest_runs', JSON.stringify(runs));
  }, [runs]);

  useEffect(() => {
    localStorage.setItem('autotest_issues', JSON.stringify(issues));
  }, [issues]);

  useEffect(() => {
    localStorage.setItem('autotest_users', JSON.stringify(users));
  }, [users]);

  const handleRunSuite = (suite: TestSuite) => {
    setActiveRunSuite(suite);
    setView('RUNNER');
  };

  const handleRunComplete = (run: TestRun) => {
    setRuns([run, ...runs]);
    setActiveRunSuite(null);
    setView('DASHBOARD');
    
    // Pass/Fail Logic based on 90% Threshold
    const total = Object.keys(run.results).length;
    const passed = Object.values(run.results).filter(r => r.status === 'PASSED').length;
    const passRate = total > 0 ? (passed / total) * 100 : 0;
    const isSuccess = passRate >= 90;
    const formattedPassRate = passRate % 1 === 0 ? passRate.toFixed(0) : passRate.toFixed(1);
    
    const failCount = Object.values(run.results).filter(r => r.status === 'FAILED').length;
    
    handleAddNotification(
      `테스트 실행 "${run.suiteName}" ${isSuccess ? '통과' : '실패'} (${formattedPassRate}%). ${failCount}건 실패.`
    );
  };

  const handleRunCancel = () => {
    setActiveRunSuite(null);
    setView('SUITES');
  };

  const handleAddNotification = (message: string) => {
    const newNotif: Notification = {
      id: crypto.randomUUID(),
      message,
      type: 'ASSIGNMENT',
      read: false,
      timestamp: new Date().toISOString()
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const markRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearAll = () => {
    setNotifications([]);
  };
  
  const handleRegisterUser = (name: string, email: string, avatar: string) => {
    const newUser: User = {
      id: crypto.randomUUID(),
      name,
      email,
      avatar: avatar 
    };
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    setCurrentUser(newUser); // Auto switch to new user
    handleAddNotification(`환영합니다 ${name}님! 계정이 생성되었습니다.`);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      {/* Sidebar hidden in Runner mode to focus user */}
      {view !== 'RUNNER' && (
        <Sidebar 
          currentView={view} 
          onNavigate={setView} 
          currentUser={currentUser}
          users={users}
          onSwitchUser={setCurrentUser}
          onRegisterUser={handleRegisterUser}
        />
      )}

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Right Notification Bell */}
        {view !== 'RUNNER' && (
          <div className="absolute top-6 right-8 z-30">
            <button 
              onClick={() => setShowNotifPanel(!showNotifPanel)}
              className="relative p-2 bg-white rounded-full shadow-sm border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifPanel && (
              <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-xl border border-slate-100 animate-fade-in-up origin-top-right overflow-hidden">
                <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                    알림 {currentUser.avatar}
                  </h3>
                  {notifications.length > 0 && (
                     <button onClick={clearAll} className="text-xs text-slate-400 hover:text-slate-600">모두 지우기</button>
                  )}
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">
                      <div className="text-2xl mb-2 opacity-50">💤</div>
                      {currentUser.name}님을 위한 새로운 알림이 없습니다.
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div 
                        key={notif.id} 
                        className={`p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-3 ${notif.read ? 'opacity-60' : 'bg-blue-50/30'}`}
                      >
                         <div className="mt-1 flex-shrink-0">
                           <div className="w-2 h-2 rounded-full bg-blue-500" style={{ opacity: notif.read ? 0 : 1 }} />
                         </div>
                         <div className="flex-1">
                           <p className="text-sm text-slate-700 leading-snug">{notif.message}</p>
                           <p className="text-xs text-slate-400 mt-1">{new Date(notif.timestamp).toLocaleTimeString('ko-KR', {hour: '2-digit', minute:'2-digit'})}</p>
                         </div>
                         {!notif.read && (
                           <button onClick={() => markRead(notif.id)} className="text-slate-300 hover:text-blue-500 self-center">
                             <Check size={14} />
                           </button>
                         )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto h-full">
            {view === 'DASHBOARD' && (
              <Dashboard 
                runs={runs} 
                suites={suites}
                setSuites={setSuites}
                users={users}
                currentUser={currentUser}
              />
            )}
            {view === 'SUITES' && (
              <SuiteManager 
                suites={suites} 
                setSuites={setSuites} 
                onRunSuite={handleRunSuite} 
                currentUser={currentUser}
                allUsers={users}
              />
            )}
            {view === 'ISSUES' && (
              <IssueBoard 
                issues={issues} 
                setIssues={setIssues} 
                onNotify={handleAddNotification}
                users={users}
                currentUser={currentUser}
              />
            )}
            {view === 'RUNNER' && activeRunSuite && (
              <TestRunner 
                suite={activeRunSuite} 
                onComplete={handleRunComplete}
                onCancel={handleRunCancel}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;