import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Folder, FolderPlus, FileText, Upload, Download, Trash, ChevronRight, Tag, Info, User, History } from 'lucide-react';
import { Button } from '../components/ui/button';
import api, { formatApiError } from '../utils/api';
import { toast } from 'sonner';

const defaultFolders = ['/', '/Engineering', '/HR', '/Finance', '/Legal', '/Operations'];

const categoryColors = {
  HR: 'bg-purple-100 text-purple-700',
  Engineering: 'bg-blue-100 text-blue-700',
  Finance: 'bg-green-100 text-green-700',
  Legal: 'bg-red-100 text-red-700',
  Other: 'bg-gray-100 text-gray-700',
};

const Documents = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [currentFolder, setCurrentFolder] = useState('/');
  const [folders, setFolders] = useState(defaultFolders);
  const [loading, setLoading] = useState(true);

  // Detail Modal & version upload
  const [activeDoc, setActiveDoc] = useState(null);
  const [uploadingVersion, setUploadingVersion] = useState(false);

  // New Document upload form
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', category: 'Engineering', tags: '', folder_path: '/' });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // New Folder creation
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/documents');
      setDocuments(res.data);
      
      // Dynamically compile any extra folders from documents
      const uniqueFolders = new Set(defaultFolders);
      res.data.forEach(d => {
        if (d.folder_path) uniqueFolders.add(d.folder_path);
      });
      setFolders(Array.from(uniqueFolders));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load document index');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleCreateFolder = (e) => {
    e.preventDefault();
    const formatted = newFolderName.startsWith('/') ? newFolderName : `/${newFolderName}`;
    if (folders.includes(formatted)) {
      toast.error('Folder already exists');
      return;
    }
    setFolders([...folders, formatted]);
    toast.success('Folder created successfully');
    setShowFolderModal(false);
    setNewFolderName('');
  };

  const handleDocumentUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error('Please select a file to upload');
      return;
    }
    try {
      setUploading(true);
      // Step 1: Upload raw file
      const formData = new FormData();
      formData.append('file', uploadFile);
      const fileRes = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { id: fileId, original_filename: fileName, size } = fileRes.data;

      // Step 2: Register Document in DB
      const payload = {
        title: uploadForm.title || fileName,
        category: uploadForm.category,
        tags: uploadForm.tags ? uploadForm.tags.split(',').map(t => t.trim()) : [],
        folder_path: currentFolder,
        file_id: fileId,
        file_name: fileName,
        size: size,
      };

      await api.post('/documents', payload);
      toast.success('Document uploaded and indexed successfully');
      setShowUploadModal(false);
      setUploadForm({ title: '', category: 'Engineering', tags: '', folder_path: '/' });
      setUploadFile(null);
      fetchDocuments();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setUploading(false);
    }
  };

  const handleVersionUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploadingVersion(true);
      const formData = new FormData();
      formData.append('file', file);
      const fileRes = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { id: fileId, original_filename: fileName, size } = fileRes.data;

      await api.post(`/documents/${activeDoc.id}/version`, {
        file_id: fileId,
        file_name: fileName,
        size: size,
      });

      toast.success('New version successfully released');
      setActiveDoc(null);
      fetchDocuments();
    } catch (err) {
      toast.error('Version upload failed');
    } finally {
      setUploadingVersion(false);
    }
  };

  const handleDeleteDocument = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.delete(`/documents/${id}`);
      toast.success('Document removed successfully');
      setActiveDoc(null);
      fetchDocuments();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const handleDownload = (fileId, fileName) => {
    const link = document.createElement('a');
    link.href = `/api/files/${fileId}/download`;
    link.download = fileName || 'document';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter documents by the current folder
  const currentDocs = documents.filter(d => d.folder_path === currentFolder);

  // Subfolders inside the current folder
  const subFolders = folders.filter(f => {
    if (f === currentFolder) return false;
    if (currentFolder === '/') {
      return f.split('/').length === 2; // e.g. /HR
    }
    return f.startsWith(currentFolder) && f.replace(currentFolder, '').split('/').length === 2;
  });

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const dm = 1;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-5" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#111111]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Central Repository</h2>
          <p className="text-sm text-gray-500 mt-0.5">Structured document storage and version tracking</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => setShowFolderModal(true)} className="border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 rounded-sm text-xs">
            <FolderPlus size={14} className="mr-1.5" /> Create Folder
          </Button>
          <Button onClick={() => setShowUploadModal(true)} className="bg-[#0020F5] hover:bg-[#0018C2] text-white rounded-sm text-xs">
            <Upload size={14} className="mr-1.5" /> Upload Document
          </Button>
        </div>
      </div>

      {/* Path Breadcrumbs */}
      <div className="flex items-center space-x-1.5 text-sm bg-white border border-[#E5E7EB] p-3.5 rounded-sm">
        <button onClick={() => setCurrentFolder('/')} className="text-[#0020F5] hover:underline font-semibold">Root</button>
        {currentFolder !== '/' && currentFolder.split('/').filter(Boolean).map((part, idx, arr) => {
          const path = '/' + arr.slice(0, idx + 1).join('/');
          return (
            <React.Fragment key={path}>
              <ChevronRight size={14} className="text-gray-400" />
              <button onClick={() => setCurrentFolder(path)} className="text-[#0020F5] hover:underline font-semibold">{part}</button>
            </React.Fragment>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Directories Column */}
        <div className="bg-white border border-[#E5E7EB] rounded-sm p-4 h-fit space-y-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Folders</h3>
          <div className="space-y-1">
            {folders.sort().map(f => (
              <button key={f} onClick={() => setCurrentFolder(f)}
                className={`w-full text-left flex items-center space-x-2.5 px-3 py-2 rounded-sm text-sm transition-colors ${
                  currentFolder === f ? 'bg-[#0020F5] text-white font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-[#0020F5]'
                }`}>
                <Folder size={16} strokeWidth={currentFolder === f ? 2 : 1.5} />
                <span className="truncate">{f === '/' ? 'Root ( / )' : f}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Contents Grid */}
        <div className="lg:col-span-3 space-y-4">
          {/* Subfolders list inside current directory */}
          {subFolders.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-white p-4 border border-[#E5E7EB] rounded-sm">
              {subFolders.map(sub => (
                <div key={sub} onClick={() => setCurrentFolder(sub)}
                  className="flex items-center space-x-2.5 p-2.5 border border-gray-200 rounded-sm hover:border-[#0020F5] hover:bg-blue-50 bg-white transition-all cursor-pointer group">
                  <Folder size={18} className="text-[#0020F5]" strokeWidth={1.5} />
                  <span className="text-xs font-semibold text-gray-700 group-hover:text-[#0020F5] truncate">{sub.split('/').pop()}</span>
                </div>
              ))}
            </div>
          )}

          {/* Files listing */}
          <div className="bg-white border border-[#E5E7EB] rounded-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#E5E7EB]">
              <h3 className="text-sm font-semibold text-[#111111]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Documents inside {currentFolder}</h3>
            </div>
            {loading ? (
              <div className="py-12 text-center text-sm text-gray-400">Loading document entries...</div>
            ) : currentDocs.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <FileText className="mx-auto text-gray-300" size={32} strokeWidth={1} />
                <p className="text-sm text-gray-400">No documents found in this directory</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-[#E5E7EB]">
                <thead className="bg-gray-50">
                  <tr>
                    {['Name', 'Category', 'Size', 'Owner', 'Modified', 'Actions'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {currentDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setActiveDoc(doc)}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center space-x-2.5">
                          <FileText size={16} className="text-[#0020F5] flex-shrink-0" strokeWidth={1.5} />
                          <div>
                            <p className="text-sm font-semibold text-[#111111] hover:underline">{doc.title}</p>
                            {doc.tags?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {doc.tags.map(tag => (
                                  <span key={tag} className="inline-flex items-center text-[9px] font-medium px-1 bg-gray-150 text-gray-600 rounded-sm">
                                    <Tag size={8} className="mr-0.5" /> {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm whitespace-nowrap">
                        <span className={`text-[11px] px-2 py-0.5 rounded-sm font-medium ${categoryColors[doc.category] || categoryColors.Other}`}>
                          {doc.category}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-500 font-medium" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                        {formatSize(doc.size)}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 whitespace-nowrap">{doc.owner_name}</td>
                      <td className="px-5 py-3.5 text-xs text-gray-400" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                        {new Date(doc.updated_at).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-500" onClick={(e) => e.stopPropagation()}>
                        <div className="flex space-x-1.5">
                          <button onClick={() => handleDownload(doc.current_file_id, doc.current_file_name)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded-sm" title="Download Current Version">
                            <Download size={14} />
                          </button>
                          {(doc.owner_id === user?.id || user?.role === 'super_admin') && (
                            <button onClick={() => handleDeleteDocument(doc.id)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded-sm" title="Delete Document">
                              <Trash size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Document Detail & Version History Panel */}
      {activeDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setActiveDoc(null)}>
          <div className="bg-white rounded-sm border border-[#E5E7EB] w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start border-b pb-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-[#111111]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{activeDoc.title}</h3>
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Document Info</span>
              </div>
              <button onClick={() => setActiveDoc(null)} className="text-gray-450 hover:text-gray-700 text-sm font-semibold">✕</button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 border border-gray-100 rounded-sm text-xs">
                <div className="space-y-1">
                  <p className="text-gray-400 uppercase font-semibold">Folder Path</p>
                  <p className="text-gray-800 font-medium">{activeDoc.folder_path}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-400 uppercase font-semibold">Category</p>
                  <p className="text-gray-800 font-medium">{activeDoc.category}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-400 uppercase font-semibold">Owner</p>
                  <p className="text-gray-800 font-medium flex items-center"><User size={12} className="mr-1 text-gray-500" /> {activeDoc.owner_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-400 uppercase font-semibold">Current Version</p>
                  <p className="text-gray-800 font-medium flex items-center"><History size={12} className="mr-1 text-gray-500" /> v{activeDoc.versions?.length || 1}</p>
                </div>
              </div>

              {/* Version History */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-450 uppercase tracking-wider" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Version History</h4>
                <div className="border border-gray-250 rounded-sm divide-y divide-gray-150 max-h-36 overflow-y-auto">
                  {activeDoc.versions?.map((v, i) => (
                    <div key={i} className="p-3 flex items-center justify-between text-xs hover:bg-gray-50 transition-colors">
                      <div>
                        <p className="font-semibold text-gray-800">Version {v.version} (v{v.version})</p>
                        <p className="text-[10px] text-gray-400" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Uploaded on {new Date(v.created_at).toLocaleString('en-IN')}</p>
                      </div>
                      <button onClick={() => handleDownload(v.file_id, v.file_name)} className="text-[#0020F5] hover:underline flex items-center font-bold">
                        <Download size={12} className="mr-1" /> Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upload new version */}
              <div className="border-t pt-4">
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-2" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Publish New Version</label>
                <div className="flex items-center space-x-2">
                  <label className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-sm shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                    <Upload size={14} className="mr-2 text-gray-400" /> Upload File
                    <input type="file" onChange={handleVersionUpload} className="hidden" />
                  </label>
                  {uploadingVersion && <span className="text-xs text-gray-400">Uploading version...</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Directory Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowFolderModal(false)}>
          <div className="bg-white rounded-sm border border-[#E5E7EB] w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#111111] mb-4" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>New Directory Folder</h3>
            <form onSubmit={handleCreateFolder} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Folder Name</label>
                <input type="text" placeholder="e.g. Engineering/Docs" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] focus:border-[#0020F5] outline-none" />
              </div>
              <div className="flex space-x-3 pt-2">
                <Button type="submit" className="flex-1 bg-[#0020F5] hover:bg-[#0018C2] text-white rounded-sm">Create Folder</Button>
                <Button type="button" onClick={() => setShowFolderModal(false)} className="flex-1 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-sm">Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowUploadModal(false)}>
          <div className="bg-white rounded-sm border border-[#E5E7EB] w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#111111] mb-4" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Upload & Index Document</h3>
            <form onSubmit={handleDocumentUpload} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Document Title</label>
                <input type="text" placeholder="e.g. Employee Handbook 2026" value={uploadForm.title} onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })} required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Category</label>
                <select value={uploadForm.category} onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] bg-white outline-none">
                  <option value="Engineering">Engineering</option>
                  <option value="HR">HR</option>
                  <option value="Finance">Finance</option>
                  <option value="Legal">Legal</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Tags (comma-separated)</label>
                <input type="text" placeholder="e.g. core, hr, standard" value={uploadForm.tags} onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Target Folder</label>
                <select value={currentFolder} disabled
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm bg-gray-50 outline-none">
                  <option value={currentFolder}>{currentFolder}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Attach File</label>
                <input type="file" onChange={(e) => setUploadFile(e.target.files[0])} required
                  className="w-full text-xs file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#0020F5] hover:file:bg-blue-100" />
              </div>
              <div className="flex space-x-3 pt-2">
                <Button type="submit" disabled={uploading} className="flex-1 bg-[#0020F5] hover:bg-[#0018C2] text-white rounded-sm">
                  {uploading ? 'Uploading...' : 'Upload & Register'}
                </Button>
                <Button type="button" onClick={() => setShowUploadModal(false)} className="flex-1 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-sm">Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;
