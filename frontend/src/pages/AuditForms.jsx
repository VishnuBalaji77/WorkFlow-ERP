import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Plus, ChevronRight, CheckCircle2, AlertTriangle, Shield, Upload, Download, Eye } from 'lucide-react';
import { Button } from '../components/ui/button';
import api, { formatApiError } from '../utils/api';
import { toast } from 'sonner';

const categoryColors = {
  HR: 'bg-purple-50 text-purple-700',
  IT: 'bg-blue-50 text-blue-700',
  Finance: 'bg-green-50 text-green-700',
  Operations: 'bg-amber-50 text-amber-700',
};

const severityCls = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200',
};

const AuditForms = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);

  // Evidence file upload
  const [uploading, setUploading] = useState(false);
  const [evidenceFileId, setEvidenceFileId] = useState(null);
  const [evidenceFileName, setEvidenceFileName] = useState('');

  // Review states (for Auditor)
  const [activeReview, setActiveReview] = useState(null);
  const [reviewForm, setReviewForm] = useState({ comments: '', severity: 'medium', corrective_action: '', preventive_action: '' });

  // Creation Modals
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // New Template Builder Form
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    questions: [{ text: '', type: 'yesno' }],
  });

  // New Assignment Form
  const [assignForm, setAssignForm] = useState({ template_id: '', assigned_to: '', due_date: '' });

  const isAuditorOrAdmin = ['super_admin', 'auditor'].includes(user?.role);

  const loadAll = async () => {
    try {
      setLoading(true);
      const assignRes = await api.get('/forms/assignments');
      setAssignments(assignRes.data);

      const templateRes = await api.get('/forms/templates');
      setTemplates(templateRes.data);

      if (isAuditorOrAdmin) {
        const empRes = await api.get('/users');
        setEmployees(empRes.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load audit forms data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setEvidenceFileId(res.data.id);
      setEvidenceFileName(res.data.original_filename);
      toast.success('Evidence uploaded successfully');
    } catch (err) {
      toast.error('Failed to upload evidence');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    try {
      // Reformat standard template format
      const payload = {
        name: templateForm.name,
        description: templateForm.description,
        sections: [{ title: 'General Questions', questions: templateForm.questions.map((q, idx) => ({ id: `q_${idx}`, text: q.text, type: q.type })) }],
      };
      await api.post('/forms/templates', payload);
      toast.success('Form template created');
      setShowTemplateModal(false);
      setTemplateForm({ name: '', description: '', questions: [{ text: '', type: 'yesno' }] });
      loadAll();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    try {
      await api.post('/forms/assignments', assignForm);
      toast.success('Audit successfully assigned');
      setShowAssignModal(false);
      setAssignForm({ template_id: '', assigned_to: '', due_date: '' });
      loadAll();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const handleSubmitResponses = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        responses: {
          answers,
          evidence_file_id: evidenceFileId,
          evidence_file_name: evidenceFileName,
        },
      };
      await api.put(`/forms/assignments/${activeAssignment.id}/submit`, payload);
      toast.success('Audit responses submitted successfully');
      setActiveAssignment(null);
      setAnswers({});
      setEvidenceFileId(null);
      setEvidenceFileName('');
      loadAll();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const handleReviewAction = async (status) => {
    try {
      const endpoint = `/forms/assignments/${activeReview.id}/${status === 'approve' ? 'approve' : 'reject'}`;
      await api.put(endpoint, {
        comments: reviewForm.comments,
        severity: reviewForm.severity,
        corrective_action: reviewForm.corrective_action,
        preventive_action: reviewForm.preventive_action,
      });
      toast.success(`Audit has been ${status === 'approve' ? 'Approved' : 'Rejected'}`);
      setActiveReview(null);
      setReviewForm({ comments: '', severity: 'medium', corrective_action: '', preventive_action: '' });
      loadAll();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const handleDownloadEvidence = (fileId, fileName) => {
    if (!fileId) return;
    // Download relative or absolute from proxy API base
    const link = document.createElement('a');
    link.href = `/api/files/${fileId}/download`;
    link.download = fileName || 'evidence';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get matching template details
  const getTemplate = (id) => templates.find((t) => t.id === id) || { name: 'Audit Form', sections: [] };

  if (activeAssignment) {
    const template = getTemplate(activeAssignment.template_id);
    const questions = template.sections?.[0]?.questions || [];
    return (
      <div className="space-y-5" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <button onClick={() => setActiveAssignment(null)} className="hover:text-[#0020F5]">Audit Forms</button>
          <ChevronRight size={14} />
          <span className="text-[#111111]">{template.name}</span>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-sm p-6 max-w-2xl">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-[#111111]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{template.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{template.description}</p>
          </div>

          <form onSubmit={handleSubmitResponses} className="space-y-6">
            {questions.map((q, i) => (
              <div key={q.id}>
                <label className="block text-sm font-medium text-[#111111] mb-2">
                  {i + 1}. {q.text}
                </label>
                {q.type === 'yesno' && (
                  <div className="flex space-x-4">
                    {['Yes', 'No', 'N/A'].map((opt) => (
                      <label key={opt} className="flex items-center space-x-2 cursor-pointer">
                        <input type="radio" name={q.id} value={opt} required onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                          className="text-[#0020F5] focus:ring-[#0020F5]" />
                        <span className="text-sm text-gray-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}
                {q.type === 'rating' && (
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" onClick={() => setAnswers({ ...answers, [q.id]: n })}
                        className={`w-10 h-10 rounded-sm border text-sm font-medium transition-colors ${
                          answers[q.id] === n ? 'bg-[#0020F5] text-white border-[#0020F5]' : 'border-gray-300 text-gray-700 hover:border-[#0020F5]'
                        }`}>
                        {n}
                      </button>
                    ))}
                  </div>
                )}
                {q.type === 'text' && (
                  <textarea rows={3} required value={answers[q.id] || ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] focus:border-[#0020F5] outline-none resize-none" />
                )}
              </div>
            ))}

            {/* Evidence Upload */}
            <div className="border-t border-[#E5E7EB] pt-5">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Upload Supporting Evidence</label>
              <div className="flex items-center space-x-3">
                <label className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-sm shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                  <Upload size={16} className="mr-2 text-gray-400" />
                  Select File
                  <input type="file" onChange={handleFileUpload} className="hidden" />
                </label>
                {uploading && <span className="text-xs text-gray-400">Uploading...</span>}
                {evidenceFileName && <span className="text-xs text-green-600 font-medium">{evidenceFileName}</span>}
              </div>
            </div>

            <div className="flex space-x-3 pt-4 border-t border-[#E5E7EB]">
              <Button type="submit" className="bg-[#0020F5] hover:bg-[#0018C2] text-white rounded-sm px-6">Submit Form</Button>
              <Button type="button" onClick={() => setActiveAssignment(null)} className="border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-sm">Cancel</Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (activeReview) {
    const template = getTemplate(activeReview.template_id);
    const questions = template.sections?.[0]?.questions || [];
    // Submitted responses
    const subAnswers = activeReview.responses?.answers || {};
    const fileId = activeReview.responses?.evidence_file_id;
    const fileName = activeReview.responses?.evidence_file_name;

    return (
      <div className="space-y-5" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <button onClick={() => setActiveReview(null)} className="hover:text-[#0020F5]">Audit Forms</button>
          <ChevronRight size={14} />
          <span className="text-[#111111]">Review Audit Submission</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Form responses panel */}
          <div className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded-sm p-6">
            <h3 className="text-lg font-semibold text-[#111111] mb-2" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{template.name} Answers</h3>
            <p className="text-xs text-gray-400 mb-6 uppercase tracking-wider font-semibold" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Submitted by user {activeReview.assigned_to}</p>

            <div className="space-y-5 divide-y divide-[#F3F4F6]">
              {questions.map((q, i) => (
                <div key={q.id} className={i > 0 ? 'pt-4' : ''}>
                  <p className="text-sm font-semibold text-[#111111] mb-1.5">{i + 1}. {q.text}</p>
                  <p className="text-sm text-gray-700 bg-gray-50 px-3 py-2 border rounded-sm">
                    {subAnswers[q.id] || <span className="text-gray-400 italic">No answer provided</span>}
                  </p>
                </div>
              ))}

              {fileId && (
                <div className="pt-4 flex items-center justify-between bg-blue-50 bg-opacity-40 p-3.5 border border-blue-200 rounded-sm">
                  <span className="text-xs font-semibold text-blue-800" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Evidence File: {fileName || 'Evidence'}</span>
                  <button onClick={() => handleDownloadEvidence(fileId, fileName)} className="flex items-center text-xs text-[#0020F5] hover:underline font-bold">
                    <Download size={14} className="mr-1.5" /> Download
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Audit findings reviewer panel */}
          <div className="bg-white border border-[#E5E7EB] rounded-sm p-6 space-y-4 h-fit">
            <h3 className="text-base font-semibold text-[#111111]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Audit Findings Report</h3>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Severity Classification</label>
              <select value={reviewForm.severity} onChange={(e) => setReviewForm({ ...reviewForm, severity: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] focus:border-[#0020F5] bg-white outline-none">
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Corrective Action Plan (CAPA)</label>
              <textarea value={reviewForm.corrective_action} onChange={(e) => setReviewForm({ ...reviewForm, corrective_action: e.target.value })} rows={3} placeholder="What actions must be taken immediately?"
                className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] outline-none resize-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Preventive Action Plan</label>
              <textarea value={reviewForm.preventive_action} onChange={(e) => setReviewForm({ ...reviewForm, preventive_action: e.target.value })} rows={3} placeholder="How can we prevent this issue recurrences?"
                className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] outline-none resize-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Review Comments</label>
              <textarea value={reviewForm.comments} onChange={(e) => setReviewForm({ ...reviewForm, comments: e.target.value })} rows={2} placeholder="Auditor assessment comments..."
                className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] outline-none resize-none" />
            </div>

            <div className="flex space-x-2 pt-2">
              <button onClick={() => handleReviewAction('approve')} className="flex-1 bg-[#00B84A] hover:bg-[#009E3F] text-white py-2 rounded-sm text-xs font-medium">Approve</button>
              <button onClick={() => handleReviewAction('reject')} className="flex-1 bg-[#FF2B18] hover:bg-[#E02510] text-white py-2 rounded-sm text-xs font-medium">Reject</button>
            </div>
            <button onClick={() => setActiveReview(null)} className="w-full text-center border py-2 rounded-sm text-xs font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#111111]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Audit Forms</h2>
          <p className="text-sm text-gray-500 mt-0.5">Complete and manage compliance audit templates and checklists</p>
        </div>
        {isAuditorOrAdmin && (
          <div className="flex space-x-2">
            <Button onClick={() => setShowTemplateModal(true)} className="border border-[#0020F5] text-[#0020F5] hover:bg-blue-50 bg-white rounded-sm text-xs">
              <Plus size={14} className="mr-1.5" /> New Template
            </Button>
            <Button onClick={() => setShowAssignModal(true)} className="bg-[#0020F5] hover:bg-[#0018C2] text-white rounded-sm text-xs">
              <Shield size={14} className="mr-1.5" /> Assign Audit
            </Button>
          </div>
        )}
      </div>

      {/* Grid listing assignments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 text-center text-sm text-gray-400 py-12">Loading audit forms...</div>
        ) : assignments.length === 0 ? (
          <div className="col-span-2 text-center text-sm text-gray-400 py-12 bg-white border border-[#E5E7EB] rounded-sm">No audits scheduled or assigned yet.</div>
        ) : (
          assignments.map((assignment) => {
            const template = getTemplate(assignment.template_id);
            return (
              <div key={assignment.id} className="bg-white border border-[#E5E7EB] rounded-sm p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <span className="text-xs px-2 py-0.5 rounded-sm font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                    Audit Assignment
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-sm font-medium uppercase ${
                    assignment.status === 'submitted' ? 'bg-green-50 text-green-700 border border-green-200' :
                    'bg-yellow-50 text-yellow-700 border border-yellow-200'
                  }`}>
                    {assignment.status}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#111111]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{template.name}</h3>
                  <p className="text-xs text-gray-400 mt-1 truncate">{template.description}</p>
                </div>
                
                <div className="text-xs text-gray-500 space-y-1 bg-gray-50 p-3 border border-gray-100 rounded-sm">
                  <p style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Due: {assignment.due_date || '—'}</p>
                  <p>Assignee ID: {assignment.assigned_to}</p>
                  {assignment.approval_status && (
                    <p className="font-semibold capitalize flex items-center mt-2">
                      Review Status: <span className={`ml-1 px-1.5 py-0.2 rounded-sm ${assignment.approval_status === 'approved' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>{assignment.approval_status}</span>
                    </p>
                  )}
                  {assignment.severity && (
                    <span className={`inline-block text-[10px] px-1.5 py-0.2 uppercase border font-bold rounded-sm mt-1.5 ${severityCls[assignment.severity] || ''}`}>
                      {assignment.severity} severity
                    </span>
                  )}
                  {assignment.corrective_action && (
                    <div className="mt-2 border-t pt-2 space-y-1">
                      <p className="text-[11px] font-bold text-gray-700">Corrective Action (CAPA):</p>
                      <p className="text-[11px] text-gray-600 bg-white p-1 rounded-sm border border-gray-150">{assignment.corrective_action}</p>
                    </div>
                  )}
                </div>

                <div className="flex space-x-2 pt-1">
                  {assignment.status !== 'submitted' && assignment.assigned_to === user?.id && (
                    <Button onClick={() => setActiveAssignment(assignment)} className="w-full bg-[#0020F5] hover:bg-[#0018C2] text-white rounded-sm text-xs py-2">
                      <FileText size={14} className="mr-1.5" strokeWidth={1.5} /> Fill Checklist
                    </Button>
                  )}

                  {assignment.status === 'submitted' && isAuditorOrAdmin && !assignment.approval_status && (
                    <Button onClick={() => {
                      setActiveReview(assignment);
                      // Pull responses if saved
                      api.get(`/forms/assignments/${assignment.id}/responses`)
                        .then(res => {
                          if (res.data.length > 0) {
                            setActiveReview(prev => ({ ...prev, responses: res.data[0].responses }));
                          }
                        })
                        .catch(err => console.error('Fetch response failed:', err));
                    }} className="w-full bg-blue-50 text-[#0020F5] border border-blue-200 hover:bg-blue-100 rounded-sm text-xs py-2">
                      <Eye size={14} className="mr-1.5" strokeWidth={1.5} /> Review Submission
                    </Button>
                  )}

                  {assignment.status === 'submitted' && assignment.approval_status && (
                    <div className="w-full text-center flex items-center justify-center text-xs text-gray-400 py-1 border border-dashed rounded-sm bg-gray-50">
                      <CheckCircle2 size={13} className="mr-1 text-green-500" /> Audit Reviewed & Closed
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Dynamic Template Creation Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowTemplateModal(false)}>
          <div className="bg-white rounded-sm border border-[#E5E7EB] w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#111111] mb-4" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>New Audit Template</h3>
            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Template Name</label>
                <input type="text" placeholder="e.g. Server Room Compliance Audit" value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Description</label>
                <textarea value={templateForm.description} onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })} required rows={2} placeholder="Explain audit objectives..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] outline-none resize-none" />
              </div>

              {/* Dynamic Questions Builder */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Questions Checklist</label>
                {templateForm.questions.map((q, idx) => (
                  <div key={idx} className="flex space-x-2 items-center bg-gray-50 p-2.5 border rounded-sm">
                    <input type="text" placeholder={`Question ${idx + 1}`} value={q.text} required onChange={(e) => {
                      const newQuestions = [...templateForm.questions];
                      newQuestions[idx].text = e.target.value;
                      setTemplateForm({ ...templateForm, questions: newQuestions });
                    }} className="flex-1 px-2 py-1.5 border rounded-sm text-xs focus:ring-1 focus:ring-[#0020F5] outline-none" />
                    
                    <select value={q.type} onChange={(e) => {
                      const newQuestions = [...templateForm.questions];
                      newQuestions[idx].type = e.target.value;
                      setTemplateForm({ ...templateForm, questions: newQuestions });
                    }} className="px-2 py-1.5 border rounded-sm text-xs bg-white focus:ring-1 focus:ring-[#0020F5] outline-none">
                      <option value="yesno">Yes/No</option>
                      <option value="rating">Rating (1-5)</option>
                      <option value="text">Text Response</option>
                    </select>

                    {templateForm.questions.length > 1 && (
                      <button type="button" onClick={() => {
                        const newQuestions = templateForm.questions.filter((_, qIdx) => qIdx !== idx);
                        setTemplateForm({ ...templateForm, questions: newQuestions });
                      }} className="text-red-500 hover:text-red-700 text-xs px-1">Remove</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setTemplateForm({ ...templateForm, questions: [...templateForm.questions, { text: '', type: 'yesno' }] })}
                  className="text-xs text-[#0020F5] font-semibold flex items-center hover:underline">
                  <Plus size={14} className="mr-1" /> Add Question
                </button>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-[#E5E7EB]">
                <Button type="submit" className="flex-1 bg-[#0020F5] hover:bg-[#0018C2] text-white rounded-sm text-xs">Create Template</Button>
                <Button type="button" onClick={() => setShowTemplateModal(false)} className="flex-1 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-sm text-xs">Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Audit Form Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowAssignModal(false)}>
          <div className="bg-white rounded-sm border border-[#E5E7EB] w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#111111] mb-4" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Schedule Compliance Audit</h3>
            <form onSubmit={handleCreateAssignment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Select Template</label>
                <select value={assignForm.template_id} onChange={(e) => setAssignForm({ ...assignForm, template_id: e.target.value })} required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] bg-white outline-none">
                  <option value="">-- Choose Template --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Assign To Employee</label>
                <select value={assignForm.assigned_to} onChange={(e) => setAssignForm({ ...assignForm, assigned_to: e.target.value })} required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] bg-white outline-none">
                  <option value="">-- Choose Employee --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.role.replace(/_/g, ' ')})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Due Date</label>
                <input type="date" value={assignForm.due_date} onChange={(e) => setAssignForm({ ...assignForm, due_date: e.target.value })} required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] outline-none" />
              </div>
              <div className="flex space-x-3 pt-2">
                <Button type="submit" className="flex-1 bg-[#0020F5] hover:bg-[#0018C2] text-white rounded-sm text-xs">Schedule Audit</Button>
                <Button type="button" onClick={() => setShowAssignModal(false)} className="flex-1 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-sm text-xs">Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditForms;