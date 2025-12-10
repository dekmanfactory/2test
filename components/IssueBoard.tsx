import React, { useState, useEffect } from 'react';
import { Issue, IssueStatus, IssuePriority, User } from '../types';
import { Plus, MoreHorizontal, Calendar, Trash2, X, AlertCircle, ChevronDown, Clock, CheckCircle2, Circle } from 'lucide-react';

interface IssueBoardProps {
  issues: Issue[];
  setIssues: React.Dispatch<React.SetStateAction<Issue[]>>;
  onNotify?: (message: string) => void;
  users: User[];
  currentUser: User;
}

const COLUMNS: { id: IssueStatus; title: string; color: string }[] = [
  { id: 'TODO', title: '할 일', color: 'bg-slate-100' },
  { id: 'IN_PROGRESS', title: '진행 중', color: 'bg-blue-50' },
  { id: 'DONE', title: '완료', color: 'bg-green-50' },
];

const IssueBoard: React.FC<IssueBoardProps> = ({ issues, setIssues, onNotify, users, currentUser }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  
  // Create Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<IssuePriority>('Medium');
  const [newAssignee, setNewAssignee] = useState<string>('');

  // Set default assignee when currentUser changes or component mounts
  useEffect(() => {
    if (!newAssignee) {
      setNewAssignee(currentUser.name);
    }
  }, [currentUser.name]);
  
  // Drag and Drop state
  const [draggedIssueId, setDraggedIssueId] = useState<string | null>(null);

  const createIssue = () => {
    if (!newTitle.trim()) return;
    
    const maxId = issues.reduce((max, issue) => {
      const num = parseInt(issue.key.split('-')[1]);
      return num > max ? num : max;
    }, 0);

    const newIssue: Issue = {
      id: crypto.randomUUID(),
      key: `ISS-${maxId + 1}`,
      title: newTitle,
      description: newDesc,
      status: 'TODO',
      priority: newPriority,
      assignee: newAssignee,
      createdAt: new Date().toISOString()
    };

    setIssues([...issues, newIssue]);
    setShowCreateModal(false);
    resetForm();
  };

  const updateIssue = (updated: Issue) => {
    // Check for assignee change notification
    const oldIssue = issues.find(i => i.id === updated.id);
    if (oldIssue && onNotify) {
      if (oldIssue.assignee !== currentUser.name && updated.assignee === currentUser.name) {
        onNotify(`이슈 ${updated.key}에 할당되었습니다: ${updated.title}`);
      }
    }

    setIssues(issues.map(i => i.id === updated.id ? updated : i));
    setSelectedIssue(updated);
  };

  const resetForm = () => {
    setNewTitle('');
    setNewDesc('');
    setNewPriority('Medium');
    setNewAssignee(currentUser.name);
  };

  const deleteIssue = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm('이 이슈를 삭제하시겠습니까?')) {
      setIssues(issues.filter(i => i.id !== id));
      if (selectedIssue?.id === id) setSelectedIssue(null);
    }
  };

  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggedIssueId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent, status: IssueStatus) => {
    e.preventDefault();
    if (draggedIssueId) {
      setIssues(issues.map(i => 
        i.id === draggedIssueId ? { ...i, status } : i
      ));
      setDraggedIssueId(null);
    }
  };

  const getPriorityColor = (p: IssuePriority) => {
    switch (p) {
      case 'Critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Medium': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Low': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusIcon = (status: IssueStatus) => {
    switch (status) {
      case 'DONE': return <CheckCircle2 size={16} className="text-green-600" />;
      case 'IN_PROGRESS': return <Clock size={16} className="text-blue-600" />;
      default: return <Circle size={16} className="text-slate-400" />;
    }
  };

  const getUserAvatar = (name: string | undefined) => {
    if (!name) return <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs">?</div>;
    const user = users.find(u => u.name === name);
    if (user) {
      return (
        <div className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-sm shadow-sm" title={user.name}>
          {user.avatar}
        </div>
      );
    }
    // Fallback if user is not found in list but name exists
    return (
      <div className="w-6 h-6 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center text-xs font-bold" title={name}>
        {name.charAt(0)}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col animate-fade-in relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">이슈 보드</h1>
          <p className="text-slate-500 text-sm mt-1">Jira 스타일로 버그와 작업 관리</p>
        </div>
        <button 
          onClick={() => {
            setNewAssignee(currentUser.name);
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
        >
          <Plus size={18} /> 이슈 생성
        </button>
      </div>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
        {COLUMNS.map(column => {
          const columnIssues = issues.filter(i => i.status === column.id);
          
          return (
            <div 
              key={column.id} 
              className={`flex-1 min-w-[300px] rounded-xl flex flex-col ${column.color} border border-slate-200/60`}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, column.id)}
            >
              <div className="p-4 flex justify-between items-center border-b border-black/5">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                  {column.title}
                  <span className="bg-white px-2 py-0.5 rounded-full text-xs text-slate-500 border border-slate-200">
                    {columnIssues.length}
                  </span>
                </h3>
                <MoreHorizontal size={16} className="text-slate-400 cursor-pointer" />
              </div>
              
              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                {columnIssues.map(issue => (
                  <div 
                    key={issue.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, issue.id)}
                    onClick={() => setSelectedIssue(issue)}
                    className="bg-white p-4 rounded-lg shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-move group relative"
                  >
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-xs font-mono text-slate-500 hover:underline cursor-pointer">{issue.key}</span>
                       <button 
                         onClick={(e) => deleteIssue(issue.id, e)}
                         className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                       >
                         <Trash2 size={14} />
                       </button>
                    </div>
                    
                    <h4 className="font-medium text-slate-800 mb-3 line-clamp-2">{issue.title}</h4>
                    
                    <div className="flex items-center justify-between mt-auto">
                       <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${getPriorityColor(issue.priority)}`}>
                         {issue.priority}
                       </span>
                       {getUserAvatar(issue.assignee)}
                    </div>
                  </div>
                ))}
                {columnIssues.length === 0 && (
                  <div className="h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-sm">
                    항목을 여기로 드래그하세요
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Issue Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 m-4 animate-fade-in-up">
            <div className="flex justify-between items-start mb-4">
               <h3 className="text-xl font-bold text-slate-800">새 이슈 생성</h3>
               <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">요약</label>
                <input 
                  autoFocus
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="어떤 이슈인가요?"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">설명</label>
                <textarea 
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                  placeholder="재현 단계를 설명하세요..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">우선순위</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as IssuePriority)}
                  >
                    {(['Low', 'Medium', 'High', 'Critical'] as IssuePriority[]).map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">담당자</label>
                  <div className="relative">
                    <select
                      className="w-full appearance-none bg-white border border-slate-300 rounded-lg pl-3 pr-8 py-2.5 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newAssignee}
                      onChange={(e) => setNewAssignee(e.target.value)}
                    >
                      <option value="">할당되지 않음</option>
                      {users.map(user => (
                        <option key={user.id} value={user.name}>
                          {user.avatar} {user.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                      <ChevronDown size={14} className="text-slate-400"/>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-3">
               <button 
                 onClick={() => setShowCreateModal(false)}
                 className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
               >
                 취소
               </button>
               <button 
                 onClick={createIssue}
                 disabled={!newTitle.trim()}
                 className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm disabled:opacity-50"
               >
                 생성
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail View Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] md:h-[80vh] flex flex-col animate-fade-in-up overflow-hidden">
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-start">
              <div className="flex-1 mr-8">
                <div className="flex items-center gap-3 mb-3">
                   <span className="text-sm font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                     {selectedIssue.key}
                   </span>
                </div>
                <input 
                  className="text-2xl font-bold text-slate-900 w-full border-none focus:ring-0 p-0 bg-transparent placeholder:text-slate-300"
                  value={selectedIssue.title}
                  onChange={(e) => updateIssue({...selectedIssue, title: e.target.value})}
                  placeholder="이슈 제목"
                />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedIssue(null)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors">
                  <X size={24}/>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
               {/* Left: Main Content */}
               <div className="flex-1 p-6 overflow-y-auto border-r border-slate-100">
                  <div className="mb-6">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">설명</label>
                    <textarea 
                      className="w-full h-[300px] p-4 text-sm text-slate-700 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none leading-relaxed"
                      value={selectedIssue.description}
                      onChange={(e) => updateIssue({...selectedIssue, description: e.target.value})}
                      placeholder="설명 추가..."
                    />
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                     <h4 className="text-sm font-semibold text-slate-700 mb-2">활동</h4>
                     <p className="text-xs text-slate-400 italic">최근 활동 없음.</p>
                  </div>
               </div>

               {/* Right: Meta & Status */}
               <div className="w-full md:w-80 bg-slate-50/50 p-6 overflow-y-auto">
                 <div className="space-y-6">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">상태</label>
                      <div className="relative">
                        <select 
                          className="w-full appearance-none bg-white border border-slate-300 rounded-lg pl-3 pr-10 py-2 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                          value={selectedIssue.status}
                          onChange={(e) => updateIssue({...selectedIssue, status: e.target.value as IssueStatus})}
                        >
                          <option value="TODO">할 일</option>
                          <option value="IN_PROGRESS">진행 중</option>
                          <option value="DONE">완료</option>
                        </select>
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                           {getStatusIcon(selectedIssue.status)}
                        </div>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <ChevronDown size={14} className="text-slate-400"/>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">우선순위</label>
                      <div className="flex flex-wrap gap-2">
                         {(['Low', 'Medium', 'High', 'Critical'] as IssuePriority[]).map(p => (
                            <button
                              key={p}
                              onClick={() => updateIssue({...selectedIssue, priority: p})}
                              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                                selectedIssue.priority === p 
                                  ? getPriorityColor(p) + ' ring-1 ring-offset-1'
                                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                              }`}
                            >
                              {p}
                            </button>
                         ))}
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-200 space-y-4">
                      <div>
                        <span className="text-xs font-semibold text-slate-500 block mb-1">담당자</span>
                        <div className="relative">
                          <select 
                             className="w-full appearance-none bg-white border border-slate-300 rounded-lg pl-3 pr-10 py-2 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                             value={selectedIssue.assignee || ''}
                             onChange={(e) => updateIssue({...selectedIssue, assignee: e.target.value})}
                          >
                             <option value="">할당되지 않음</option>
                             {users.map(user => (
                               <option key={user.id} value={user.name}>
                                 {user.avatar} {user.name}
                               </option>
                             ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <ChevronDown size={14} className="text-slate-400"/>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-xs font-semibold text-slate-500 block mb-1">생성일</span>
                        <div className="text-xs text-slate-600 font-mono">
                          {new Date(selectedIssue.createdAt).toLocaleString('ko-KR')}
                        </div>
                      </div>
                    </div>
                 </div>

                 <div className="mt-auto pt-8">
                    <button 
                      onClick={() => deleteIssue(selectedIssue.id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium transition-colors"
                    >
                      <Trash2 size={16} /> 이슈 삭제
                    </button>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IssueBoard;