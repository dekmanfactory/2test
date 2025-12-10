import React, { useState } from 'react';
import { TestRun, TestResult, TestSuite, User, Role } from '../types';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { Activity, CheckCircle, XCircle, AlertCircle, Shield, Users, X, TrendingUp, Zap, Clock, ListFilter, AlertTriangle, Target } from 'lucide-react';

interface DashboardProps {
  runs: TestRun[];
  suites: TestSuite[];
  setSuites: React.Dispatch<React.SetStateAction<TestSuite[]>>;
  users: User[];
  currentUser: User;
}

const COLORS = {
  PASSED: '#22c55e', // green-500
  FAILED: '#ef4444', // red-500
  SKIPPED: '#f59e0b', // amber-500
  IDLE: '#94a3b8',   // slate-400
  HIGH: '#ef4444',   // Red
  MEDIUM: '#f59e0b', // Amber
  LOW: '#3b82f6'     // Blue
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-100 shadow-lg rounded-lg text-xs">
        <p className="font-bold text-slate-700 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-500 capitalize">{entry.name}:</span>
            <span className="font-mono font-medium text-slate-700">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC<DashboardProps> = ({ runs, suites, setSuites, users, currentUser }) => {
  // Admin Logic
  const isGlobalAdmin = currentUser.email === 'administrator@autotest.ai';
  const [editingSuite, setEditingSuite] = useState<TestSuite | null>(null);
  const [permUserToAdd, setPermUserToAdd] = useState('');
  const [permRoleToAdd, setPermRoleToAdd] = useState<Role>('MEMBER');

  // --- KPI Calculation ---
  const totalRuns = runs.length;
  
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  // Lookup map for case priority: CaseID -> Priority
  const casePriorityMap = new Map<string, string>();
  suites.forEach(s => s.cases.forEach(c => casePriorityMap.set(c.id, c.priority)));

  const failuresByPriority = { High: 0, Medium: 0, Low: 0 };

  runs.forEach(run => {
    Object.values(run.results).forEach((result: TestResult) => {
      totalTests++;
      if (result.status === 'PASSED') totalPassed++;
      if (result.status === 'FAILED') {
        totalFailed++;
        // Count failure priority
        const p = casePriorityMap.get(result.caseId);
        if (p === 'High') failuresByPriority.High++;
        else if (p === 'Medium') failuresByPriority.Medium++;
        else if (p === 'Low') failuresByPriority.Low++;
      }
      if (result.status === 'SKIPPED') totalSkipped++;
    });
  });

  const passRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

  // --- Chart Data Preparation ---

  // 1. Overall Status Pie Data
  const pieData = [
    { name: '통과', value: totalPassed, color: COLORS.PASSED },
    { name: '실패', value: totalFailed, color: COLORS.FAILED },
    { name: '건너뜀', value: totalSkipped, color: COLORS.SKIPPED },
  ].filter(d => d.value > 0);

  // 2. Execution Trend Data (Area Chart)
  const trendData = runs
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(-10)
    .map(run => {
      let passed = 0;
      let failed = 0;
      let skipped = 0;
      Object.values(run.results).forEach((r: TestResult) => {
        if (r.status === 'PASSED') passed++;
        else if (r.status === 'FAILED') failed++;
        else skipped++;
      });
      return {
        name: new Date(run.startTime).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
        fullDate: new Date(run.startTime).toLocaleString('ko-KR'),
        통과: passed,
        실패: failed,
        건너뜀: skipped,
      };
    });

  // 3. Priority Breakdown Data (Total Scope)
  const priorityCounts = { High: 0, Medium: 0, Low: 0 };
  suites.forEach(suite => {
    suite.cases.forEach(c => {
      if (c.priority && priorityCounts[c.priority] !== undefined) {
        priorityCounts[c.priority]++;
      }
    });
  });
  
  const priorityData = [
    { name: '높음', value: priorityCounts.High, color: COLORS.HIGH },
    { name: '중간', value: priorityCounts.Medium, color: COLORS.MEDIUM },
    { name: '낮음', value: priorityCounts.Low, color: COLORS.LOW },
  ].filter(d => d.value > 0);

  // 4. Failures by Priority Data (New Chart)
  const failurePriorityData = [
    { name: '높음', value: failuresByPriority.High, color: COLORS.HIGH },
    { name: '중간', value: failuresByPriority.Medium, color: COLORS.MEDIUM },
    { name: '낮음', value: failuresByPriority.Low, color: COLORS.LOW },
  ]; // Keep 0 values to show empty states on axis if needed, or filter if preferred.


  // --- Access Management Handlers ---
  const handleAddPermission = () => {
    if (!editingSuite || !permUserToAdd) return;
    const updatedSuite = {
      ...editingSuite,
      permissions: {
        ...editingSuite.permissions,
        [permUserToAdd]: permRoleToAdd
      }
    };
    setSuites(suites.map(s => s.id === editingSuite.id ? updatedSuite : s));
    setEditingSuite(updatedSuite);
    setPermUserToAdd('');
  };

  const handleChangePermission = (userId: string, newRole: Role) => {
    if (!editingSuite) return;
    const updatedSuite = {
      ...editingSuite,
      permissions: {
        ...editingSuite.permissions,
        [userId]: newRole
      }
    };
    setSuites(suites.map(s => s.id === editingSuite.id ? updatedSuite : s));
    setEditingSuite(updatedSuite);
  };

  const handleRemovePermission = (userId: string) => {
    if (!editingSuite) return;
    const newPerms = { ...editingSuite.permissions };
    delete newPerms[userId];
    const updatedSuite = { ...editingSuite, permissions: newPerms };
    setSuites(suites.map(s => s.id === editingSuite.id ? updatedSuite : s));
    setEditingSuite(updatedSuite);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">대시보드</h1>
          <p className="text-slate-500 text-sm mt-1">테스트 자동화 지표 개요입니다.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-white px-3 py-1.5 rounded-full border border-slate-100 shadow-sm">
          <Clock size={14} /> 마지막 업데이트: {new Date().toLocaleTimeString('ko-KR')}
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">총 실행 횟수</p>
            <p className="text-3xl font-bold text-slate-800">{totalRuns}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Activity size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">통과율</p>
            <p className="text-3xl font-bold text-slate-800 flex items-baseline gap-1">
              {passRate}<span className="text-sm text-slate-400 font-normal">%</span>
            </p>
          </div>
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <CheckCircle size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">실패</p>
            <p className="text-3xl font-bold text-slate-800">{totalFailed}</p>
          </div>
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <XCircle size={24} />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">효율성</p>
            <p className="text-3xl font-bold text-slate-800 flex items-baseline gap-1">
              {totalTests > 0 ? Math.round(((totalPassed + totalFailed) / totalTests) * 100) : 0}<span className="text-sm text-slate-400 font-normal">%</span>
            </p>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Zap size={24} />
          </div>
        </div>
      </div>

      {/* Row 1: Trends & Overall Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[320px]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp size={20} className="text-blue-500" /> 실행 추세
            </h2>
            <div className="flex items-center gap-4 text-xs font-medium">
               <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500"></span>통과</div>
               <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span>실패</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPassed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.PASSED} stopOpacity={0.2}/>
                  <stop offset="95%" stopColor={COLORS.PASSED} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.FAILED} stopOpacity={0.2}/>
                  <stop offset="95%" stopColor={COLORS.FAILED} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="통과" stroke={COLORS.PASSED} fillOpacity={1} fill="url(#colorPassed)" strokeWidth={2} />
              <Area type="monotone" dataKey="실패" stroke={COLORS.FAILED} fillOpacity={1} fill="url(#colorFailed)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Overall Status Pie */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[320px] flex flex-col">
            <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                <Activity size={20} className="text-emerald-500" /> 전체 상태
            </h2>
            <div className="flex-1 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    align="center" 
                    iconType="circle"
                    formatter={(value, entry: any) => <span className="text-xs text-slate-500 ml-1">{value}</span>} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
        </div>
      </div>

      {/* Row 2: Breakdowns (Failures & Scope) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Failure by Priority Breakdown */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[300px]">
             <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
               <AlertTriangle size={20} className="text-amber-500" /> 실패 영향 분석
             </h2>
             <ResponsiveContainer width="100%" height="80%">
                <BarChart data={failurePriorityData} layout="vertical" margin={{top: 0, right: 30, left: 20, bottom: 0}}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b', fontWeight: 600}} width={60} />
                  <Tooltip cursor={{fill: 'transparent'}} content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                    {failurePriorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
             </ResponsiveContainer>
          </div>

           {/* Priority Breakdown (Scope) */}
           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[300px]">
             <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
               <Target size={20} className="text-indigo-500" /> 테스트 스위트 중요도 범위
             </h2>
             <ResponsiveContainer width="100%" height="80%">
                <BarChart data={priorityData} layout="vertical" margin={{top: 0, right: 30, left: 20, bottom: 0}}>
                   <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b', fontWeight: 600}} width={60} />
                  <Tooltip cursor={{fill: 'transparent'}} content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
             </ResponsiveContainer>
           </div>
      </div>
      
      {/* Recent Runs List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
           <h2 className="font-bold text-slate-800 text-lg">최근 실행 이력</h2>
           <button className="text-xs text-blue-600 font-medium hover:underline">모두 보기</button>
        </div>
        <div className="divide-y divide-slate-50">
           {runs.length === 0 ? (
             <p className="p-8 text-center text-slate-400 text-sm">아직 실행된 테스트가 없습니다.</p>
           ) : (
             runs.slice(-5).reverse().map(run => {
               const totalCases = Object.keys(run.results).length;
               const passed = Object.values(run.results).filter((r: TestResult) => r.status === 'PASSED').length;
               const failed = Object.values(run.results).filter((r: TestResult) => r.status === 'FAILED').length;
               
               // New Logic: 90% Threshold for PASS
               const passRate = totalCases > 0 ? (passed / totalCases) * 100 : 0;
               const isRunPassed = passRate >= 90;
               const formattedPassRate = passRate % 1 === 0 ? passRate.toFixed(0) : passRate.toFixed(1);

               return (
                 <div key={run.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                       <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isRunPassed ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                          {isRunPassed ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                       </div>
                       <div>
                          <p className="font-medium text-slate-800 text-sm">{run.suiteName}</p>
                          <p className="text-xs text-slate-500">{new Date(run.startTime).toLocaleString('ko-KR')}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-6">
                       <div className="text-right hidden sm:block">
                          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">통과</p>
                          <p className="text-sm font-mono text-green-600">{passed}</p>
                       </div>
                       <div className="text-right hidden sm:block">
                          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">실패</p>
                          <p className="text-sm font-mono text-red-600">{failed}</p>
                       </div>
                       <div className="w-24 flex flex-col items-end">
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                               className={`${isRunPassed ? 'bg-green-500' : 'bg-red-500'} h-full`} 
                               style={{width: `${passRate}%`}} 
                            />
                          </div>
                          <span className={`text-[10px] font-bold mt-1 ${isRunPassed ? 'text-green-600' : 'text-red-500'}`}>
                            {formattedPassRate}% {isRunPassed ? 'PASS' : 'FAIL'}
                          </span>
                       </div>
                    </div>
                 </div>
               )
             })
           )}
        </div>
      </div>

      {/* Global Admin Access Management */}
      {isGlobalAdmin && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mt-8 animate-fade-in-up">
           <div className="flex items-center gap-3 mb-6">
             <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
               <Shield size={24} />
             </div>
             <div>
               <h2 className="text-lg font-bold text-slate-800">전체 접근 권한 관리</h2>
               <p className="text-sm text-slate-500">관리자로서 모든 테스트 스위트의 권한을 관리합니다.</p>
             </div>
           </div>

           <div className="overflow-x-auto rounded-lg border border-slate-200">
             <table className="w-full text-left border-collapse">
               <thead className="bg-slate-50">
                 <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                   <th className="py-3 px-4">테스트 스위트</th>
                   <th className="py-3 px-4">총 사용자</th>
                   <th className="py-3 px-4">관리자</th>
                   <th className="py-3 px-4">생성일</th>
                   <th className="py-3 px-4 text-right">작업</th>
                 </tr>
               </thead>
               <tbody className="text-sm divide-y divide-slate-100">
                 {suites.map(suite => {
                   const perms = suite.permissions || {};
                   const userCount = Object.keys(perms).length;
                   const adminCount = Object.values(perms).filter(r => r === 'ADMIN').length;
                   
                   return (
                     <tr key={suite.id} className="hover:bg-slate-50 transition-colors bg-white">
                       <td className="py-3 px-4 font-medium text-slate-800">{suite.name}</td>
                       <td className="py-3 px-4 text-slate-600 flex items-center gap-1">
                          <Users size={14}/> {userCount}
                       </td>
                       <td className="py-3 px-4 text-slate-600">{adminCount}</td>
                       <td className="py-3 px-4 text-slate-500 font-mono text-xs">
                         {new Date(suite.createdAt).toLocaleDateString('ko-KR')}
                       </td>
                       <td className="py-3 px-4 text-right">
                         <button 
                           onClick={() => setEditingSuite(suite)}
                           className="text-indigo-600 hover:text-indigo-800 font-medium text-xs px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                         >
                           권한 관리
                         </button>
                       </td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {/* Permission Management Modal (Duplicate Logic from SuiteManager to be self-contained in Dashboard) */}
      {editingSuite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 m-4 flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
                 <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Shield className="text-indigo-600" size={20} />
                      프로젝트 접근 권한 관리
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">편집 중: {editingSuite.name}</p>
                 </div>
                 <button onClick={() => setEditingSuite(null)} className="text-slate-400 hover:text-slate-600">
                   <X size={20} />
                 </button>
              </div>

              <div className="space-y-4 flex-1 overflow-y-auto">
                 <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">사용자 추가</label>
                    <div className="flex gap-2">
                       <select 
                         className="flex-1 border border-slate-300 rounded-lg p-2 text-sm outline-none"
                         value={permUserToAdd}
                         onChange={(e) => setPermUserToAdd(e.target.value)}
                       >
                         <option value="">사용자 선택...</option>
                         {users
                           .filter(u => u.email !== 'administrator@autotest.ai' && !editingSuite.permissions?.[u.id])
                           .map(u => (
                             <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                           ))
                         }
                       </select>
                       <select
                         className="w-32 border border-slate-300 rounded-lg p-2 text-sm outline-none"
                         value={permRoleToAdd}
                         onChange={(e) => setPermRoleToAdd(e.target.value as Role)}
                       >
                         <option value="ADMIN">관리자</option>
                         <option value="MEMBER">멤버</option>
                         <option value="OBSERVER">옵저버</option>
                       </select>
                       <button 
                         onClick={handleAddPermission}
                         disabled={!permUserToAdd}
                         className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                       >
                         추가
                       </button>
                    </div>
                 </div>

                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">현재 권한</label>
                    <div className="space-y-2">
                       {/* Super Admin Always Visible */}
                       <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 flex items-center justify-center bg-indigo-50 rounded-full text-lg">🛡️</div>
                             <div>
                               <p className="text-sm font-semibold text-slate-800">슈퍼 관리자</p>
                               <p className="text-xs text-slate-500">administrator@autotest.ai</p>
                             </div>
                          </div>
                          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-bold">GLOBAL</span>
                       </div>

                       {Object.entries(editingSuite.permissions || {}).map(([userId, role]) => {
                         const user = users.find(u => u.id === userId);
                         if (!user) return null;
                         return (
                           <div key={userId} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-full text-lg">{user.avatar}</div>
                                 <div>
                                   <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                                   <p className="text-xs text-slate-500">{user.email}</p>
                                 </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <select 
                                   className="text-xs border border-slate-200 rounded p-1"
                                   value={role}
                                   onChange={(e) => handleChangePermission(userId, e.target.value as Role)}
                                >
                                   <option value="ADMIN">관리자</option>
                                   <option value="MEMBER">멤버</option>
                                   <option value="OBSERVER">옵저버</option>
                                </select>
                                <button 
                                  onClick={() => handleRemovePermission(userId)}
                                  className="text-slate-400 hover:text-red-500 p-1"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                           </div>
                         );
                       })}
                       
                       {(!editingSuite.permissions || Object.keys(editingSuite.permissions).length === 0) && (
                         <p className="text-sm text-slate-400 italic text-center py-4">설정된 권한이 없습니다.</p>
                       )}
                    </div>
                 </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setEditingSuite(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
                >
                  닫기
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;