import React, { useState, useEffect, useRef } from 'react';
import { TestSuite, TestRun, TestResult, TestStatus, TestCase } from '../types';
import { CheckCircle, XCircle, SkipForward, ArrowRight, ArrowLeft, Save, AlertOctagon, Monitor, Globe, Mail, Bot, Loader2, PlayCircle, PauseCircle, FileSpreadsheet, FolderOpen } from 'lucide-react';
import { simulateTestExecution } from '../services/geminiService';

interface TestRunnerProps {
  suite: TestSuite;
  onComplete: (run: TestRun) => void;
  onCancel: () => void;
}

const TestRunner: React.FC<TestRunnerProps> = ({ suite, onComplete, onCancel }) => {
  const [currentCaseIndex, setCurrentCaseIndex] = useState(0);
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [startTime] = useState(new Date().toISOString());
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [simulatedLogs, setSimulatedLogs] = useState<Record<string, string>>({});
  
  const currentCase = suite.cases[currentCaseIndex];
  const isLastCase = currentCaseIndex === suite.cases.length - 1;
  const isAutomatedMode = suite.targetConfig?.executionMode === 'AUTOMATED';
  const autoRunRef = useRef(false);

  // Initialize results if empty
  useEffect(() => {
    const initialResults: Record<string, TestResult> = {};
    suite.cases.forEach(c => {
      initialResults[c.id] = {
        caseId: c.id,
        status: 'IDLE',
        timestamp: new Date().toISOString()
      };
    });
    setResults(initialResults);
    
    // Start automation if mode is AUTOMATED
    if (isAutomatedMode) {
      setIsAutoRunning(true);
      autoRunRef.current = true;
    }
  }, [suite, isAutomatedMode]);

  // Automated Execution Logic
  useEffect(() => {
    if (!isAutomatedMode || !isAutoRunning) return;
    
    // Check if current case is already processed
    if (results[currentCase.id]?.status !== 'IDLE') {
       if (!isLastCase) {
          // Move to next case after short delay
          const timer = setTimeout(() => {
             setCurrentCaseIndex(prev => prev + 1);
          }, 1500);
          return () => clearTimeout(timer);
       } else {
         setIsAutoRunning(false);
       }
       return;
    }

    const runSimulation = async () => {
      try {
        let contextInfo = `${suite.targetConfig?.appType || 'App'} at ${suite.targetConfig?.appAddress || 'Loc'} using ${suite.targetConfig?.testEmail || 'default user'}`;
        
        // Inject Virtual File System Context
        if (suite.targetConfig?.mockAssets && suite.targetConfig.mockAssets.length > 0) {
           contextInfo += `\n[Virtual File System] Available Files: ${suite.targetConfig.mockAssets.join(', ')}`;
        }

        const result = await simulateTestExecution(currentCase, contextInfo);
        
        setSimulatedLogs(prev => ({
          ...prev,
          [currentCase.id]: result.notes
        }));

        handleStatus(result.status, result.notes);
      } catch (error) {
        handleStatus('SKIPPED', 'Automation execution failed.');
      }
    };

    runSimulation();

  }, [currentCaseIndex, isAutoRunning, isAutomatedMode, results, currentCase, isLastCase, suite]);

  const handleStatus = (status: TestStatus, notes?: string) => {
    const updatedResults = {
      ...results,
      [currentCase.id]: {
        ...results[currentCase.id],
        status,
        notes: notes || results[currentCase.id].notes, // Save notes if provided
        timestamp: new Date().toISOString()
      }
    };
    setResults(updatedResults);
    
    // Auto advance if passed or failed/skipped (Manual mode)
    if (!isAutomatedMode && status !== 'IDLE' && !isLastCase) {
      setTimeout(() => setCurrentCaseIndex(prev => prev + 1), 200);
    }
  };

  const handleFinish = () => {
    const run: TestRun = {
      id: crypto.randomUUID(),
      suiteId: suite.id,
      suiteName: suite.name,
      startTime,
      endTime: new Date().toISOString(),
      status: 'COMPLETED',
      results
    };
    onComplete(run);
  };

  const exportResults = () => {
    // CSV Header
    const headers = ['Test Case ID', 'Title', 'Priority', 'Status', 'Execution Notes/Logs'];
    
    // CSV Rows
    const rows = suite.cases.map(c => {
      const result = results[c.id];
      const status = result?.status || 'SKIPPED';
      const notes = result?.notes ? result.notes.replace(/"/g, '""') : ''; // Escape quotes for CSV
      
      return [
        `"${c.id}"`,
        `"${c.title.replace(/"/g, '""')}"`,
        c.priority,
        status,
        `"${notes}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    
    // Add BOM for UTF-8 support in Excel (Critical for Korean)
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${suite.name.replace(/\s+/g, '_')}_Results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const progress = ((currentCaseIndex) / suite.cases.length) * 100;

  return (
    <div className="h-full flex flex-col animate-fade-in bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            실행 중: {suite.name}
            {isAutomatedMode && <span className="text-xs bg-indigo-500 px-2 py-0.5 rounded-full flex items-center gap-1"><Bot size={12} /> 자동</span>}
          </h2>
          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
             <span>케이스 {currentCaseIndex + 1} / {suite.cases.length}</span>
             {suite.targetConfig && (
               <>
                 <span className="w-1 h-1 bg-slate-500 rounded-full" />
                 <span className="flex items-center gap-1 text-slate-300">
                   {suite.targetConfig.appType === 'WEB' ? <Globe size={10} /> : <Monitor size={10} />}
                   {suite.targetConfig.appAddress}
                 </span>
                 {suite.targetConfig.testEmail && (
                   <span className="hidden md:flex items-center gap-1">
                     (<Mail size={10} /> {suite.targetConfig.testEmail})
                   </span>
                 )}
                 {suite.targetConfig.mockAssets && suite.targetConfig.mockAssets.length > 0 && (
                   <span className="hidden md:flex items-center gap-1 text-amber-300" title={`가상 자산: ${suite.targetConfig.mockAssets.join(', ')}`}>
                     (<FolderOpen size={10} /> {suite.targetConfig.mockAssets.length} 파일)
                   </span>
                 )}
               </>
             )}
          </div>
        </div>
        <button onClick={onCancel} className="text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded transition-colors">
          실행 종료
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 h-1.5">
        <div 
          className="bg-blue-600 h-1.5 transition-all duration-300" 
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Case List Sidebar */}
        <div className="w-full md:w-64 border-r border-slate-100 bg-slate-50 overflow-y-auto hidden md:block">
          {suite.cases.map((c, idx) => {
            const status = results[c.id]?.status || 'IDLE';
            const isRunning = isAutomatedMode && currentCaseIndex === idx && status === 'IDLE';
            
            return (
              <div 
                key={c.id}
                onClick={() => !isAutomatedMode && setCurrentCaseIndex(idx)}
                className={`p-3 text-sm cursor-pointer border-b border-slate-100 flex items-center justify-between ${
                  currentCaseIndex === idx ? 'bg-white border-l-4 border-l-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                } ${isAutomatedMode ? 'pointer-events-none' : ''}`}
              >
                <div className="flex items-center gap-2 truncate flex-1">
                  {isRunning && <Loader2 size={12} className="animate-spin text-indigo-500" />}
                  <span className={`truncate font-medium ${isRunning ? 'text-indigo-600' : ''}`}>{idx + 1}. {c.title}</span>
                </div>
                {!isRunning && <StatusIcon status={status} size={16} />}
              </div>
            );
          })}
        </div>

        {/* Active Test Case Area */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-white">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
               <span className={`text-xs px-2 py-1 rounded font-mono font-medium ${
                 currentCase.priority === 'High' ? 'bg-red-100 text-red-700' :
                 currentCase.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                 currentCase.priority === 'Low' ? 'bg-blue-100 text-blue-700' :
                 'bg-slate-100 text-slate-500'
               }`}>
                 우선순위: {currentCase.priority}
               </span>
               <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${
                  results[currentCase.id]?.status === 'PASSED' ? 'text-green-600 bg-green-50' :
                  results[currentCase.id]?.status === 'FAILED' ? 'text-red-600 bg-red-50' :
                  results[currentCase.id]?.status === 'SKIPPED' ? 'text-amber-600 bg-amber-50' :
                  'text-slate-400 bg-slate-50'
               }`}>
                 {results[currentCase.id]?.status || (isAutomatedMode ? '실행 중...' : '대기 중')}
               </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{currentCase.title}</h1>
            <p className="text-slate-500 mt-2">{currentCase.description}</p>
          </div>

          <div className="space-y-6 flex-1">
             <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
               <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">실행 단계</h3>
               <div className="space-y-4">
                 {currentCase.steps.map((step, idx) => (
                   <div key={step.id} className="flex gap-4 p-3 rounded-lg bg-white border border-slate-100 shadow-sm">
                     <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                       {idx + 1}
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                       <div>
                         <span className="text-xs font-semibold text-slate-400 block mb-1">동작</span>
                         <p className="text-slate-800 text-sm">{step.action}</p>
                       </div>
                       <div>
                         <span className="text-xs font-semibold text-slate-400 block mb-1">예상 결과</span>
                         <p className="text-slate-800 text-sm">{step.expectedResult}</p>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
             </div>

             {/* Automated Run Simulation Logs */}
             {isAutomatedMode && simulatedLogs[currentCase.id] && (
                <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 font-mono text-sm text-slate-300">
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Bot size={14} /> 자동화 실행 로그
                  </h3>
                  <div className="whitespace-pre-wrap leading-relaxed opacity-90">
                    {simulatedLogs[currentCase.id]}
                  </div>
                </div>
             )}
          </div>

          {/* Action Bar */}
          <div className="mt-8 border-t border-slate-100 pt-6 flex flex-wrap items-center justify-between gap-4">
            
            {/* Navigation (Only show in Manual or if Automation is paused/done) */}
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentCaseIndex(Math.max(0, currentCaseIndex - 1))}
                disabled={currentCaseIndex === 0 || isAutoRunning}
                className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg disabled:opacity-50"
              >
                <ArrowLeft size={20} />
              </button>
              <button 
                 onClick={() => setCurrentCaseIndex(Math.min(suite.cases.length - 1, currentCaseIndex + 1))}
                 disabled={isLastCase || isAutoRunning}
                 className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg disabled:opacity-50"
              >
                <ArrowRight size={20} />
              </button>
            </div>

            {isAutomatedMode ? (
              <div className="flex gap-3 ml-auto">
                 {isAutoRunning && (
                   <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg animate-pulse">
                     <Loader2 size={18} className="animate-spin" />
                     <span className="font-medium text-sm">AI 테스트 실행 중...</span>
                   </div>
                 )}
                 {isLastCase && !isAutoRunning && (
                    <>
                      <button 
                        onClick={exportResults}
                        className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-medium shadow-sm transition-all"
                      >
                        <FileSpreadsheet size={18} className="text-green-600" /> 결과 내보내기
                      </button>
                      <button 
                        onClick={handleFinish}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium shadow-lg hover:shadow-xl active:scale-95 transition-all"
                      >
                        <Save size={18} /> 실행 완료
                      </button>
                    </>
                 )}
              </div>
            ) : (
              <div className="flex gap-3">
                <button 
                  onClick={() => handleStatus('PASSED')}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-sm hover:shadow active:scale-95 transition-all"
                >
                  <CheckCircle size={18} /> 통과
                </button>
                <button 
                  onClick={() => handleStatus('FAILED')}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-sm hover:shadow active:scale-95 transition-all"
                >
                  <XCircle size={18} /> 실패
                </button>
                <button 
                  onClick={() => handleStatus('SKIPPED')}
                  className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium shadow-sm hover:shadow active:scale-95 transition-all"
                >
                  <SkipForward size={18} /> 건너뛰기
                </button>
                {isLastCase && (
                  <div className="flex gap-3 ml-4">
                    <button 
                        onClick={exportResults}
                        className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-medium shadow-sm transition-all"
                      >
                        <FileSpreadsheet size={18} className="text-green-600" /> 내보내기
                    </button>
                    <button 
                      onClick={handleFinish}
                      className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium shadow-lg hover:shadow-xl active:scale-95 transition-all"
                    >
                      <Save size={18} /> 실행 완료
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatusIcon = ({ status, size }: { status: string, size: number }) => {
  switch(status) {
    case 'PASSED': return <CheckCircle size={size} className="text-green-500" />;
    case 'FAILED': return <XCircle size={size} className="text-red-500" />;
    case 'SKIPPED': return <AlertOctagon size={size} className="text-amber-500" />;
    default: return <div className={`w-[${size}px] h-[${size}px] rounded-full border-2 border-slate-200`} />;
  }
};

export default TestRunner;