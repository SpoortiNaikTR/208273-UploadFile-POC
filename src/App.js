import React, { useState, useRef, useEffect } from 'react';
 import { uploadFile } from './services/uploader';
import { listS3 ,createFolder} from './services/api';
import './App.css';
import UploadArea from './components/UploadArea.jsx';
import ClickedPath from './components/ClickedPath.jsx';
import ActionsBar from './components/ActionsBar.jsx';
import FileTable from './components/FileTable.jsx';
import StatusBar from './components/StatusBar.jsx';
import UploadModal from './components/UploadModal.jsx';
import CreateFolderModal from './components/CreateFolderModal.jsx';

function App() {
  const [progress, setProgress] = useState({});
  const [status, setStatus] = useState('');
  const [prefix, setPrefix] = useState('');
  const [treeData, setTreeData] = useState([]);
  const [path, setPath] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [completedUploads, setCompletedUploads] = useState([]);
  const [failedUploads, setFailedUploads] = useState([]);
  const [initializedRoot, setInitializedRoot] = useState(false);
  const [folderCounts, setFolderCounts] = useState({});
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderError, setNewFolderError] = useState('');
  const fileInputRef = useRef(null);
  const modalFileInputRef = useRef(null);
  const [shouldAutoOpenFileDialog, setShouldAutoOpenFileDialog] = useState(false);
  const hasAutoOpenedRef = useRef(false);

  useEffect(() => {
    fetchTree('');
  }, []);

  useEffect(() => {
    if (!isUploadModalOpen) {
      hasAutoOpenedRef.current = false;
    }
  }, [isUploadModalOpen]);

  useEffect(() => {
    if (isUploadModalOpen && shouldAutoOpenFileDialog && !hasAutoOpenedRef.current) {
      hasAutoOpenedRef.current = true;
      setTimeout(() => {
        if (modalFileInputRef.current) {
          modalFileInputRef.current.click();
        }
        setShouldAutoOpenFileDialog(false);
      }, 0);
    }
  }, [isUploadModalOpen, shouldAutoOpenFileDialog]);

  const fetchTree = async (pfx = '') => {
    setStatus('Loading...');
    try {
      const res = await listS3(pfx);
      const folders = res.folders || [];
      const files = res.files || [];
      const tree = folders.map((f) => ({
        key: f,
        name: f.split('/').filter(Boolean).pop(),
        type: 'folder',
        children: [],
        expanded: false,
      }));
      const fileNodes = files.map((f) => ({
        key: typeof f === 'string' ? f : f.key,
        name: typeof f === 'string' ? f.split('/').pop() : f.key.split('/').pop(),
        type: 'file',
        size: typeof f === 'string' ? undefined : f.size,
        lastModified: typeof f === 'string' ? undefined : f.lastModified,
      }));
      setTreeData([...tree, ...fileNodes]);
      setStatus('');

      const currentCount = folders.length + files.length;
      setFolderCounts(prev => ({ ...prev, [pfx]: currentCount }));

      const toLoad = folders.filter(f => !(f in folderCounts)).slice(0, 50);
      Promise.all(toLoad.map(async (f) => {
        try {
          const r = await listS3(f);
          const c = (r.folders?.length || 0) + (r.files?.length || 0);
          setFolderCounts(prev => ({ ...prev, [f]: c }));
        } catch {}
      }));

      if (!initializedRoot && !pfx && folders.length > 0) {
        setInitializedRoot(true);
        await goToPrefix(folders[0]);
      }
    } catch (err) {
      setStatus('Failed to load');
    }
  };

const toggleExpand = async (node) => {
  if (node.type !== 'folder') return;

  setPrefix(node.key);
  const parts = node.key.split('/').filter(Boolean);
  setPath(parts);

  node.expanded = !node.expanded;

  if (node.expanded && node.children.length === 0) {
    const res = await listS3(node.key);
    const folders = res.folders || [];
    const files = res.files || [];
    node.children = [
      ...folders.map((f) => ({
        key: f,
        name: f.split('/').filter(Boolean).pop(),
        type: 'folder',
        children: [],
        expanded: false,
      })),
      ...files.map((f) => ({
        key: typeof f === 'string' ? f : f.key,
        name: typeof f === 'string' ? f.split('/').pop() : f.key.split('/').pop(),
        type: 'file',
        size: typeof f === 'string' ? undefined : f.size,
        lastModified: typeof f === 'string' ? undefined : f.lastModified,
      })),
    ];

    const expandedCount = folders.length + files.length;
    setFolderCounts(prev => ({ ...prev, [node.key]: expandedCount }));
  }

  setTreeData([...treeData]);
};

const goToPrefix = async (pfx) => {
  const clean = pfx.endsWith('/') ? pfx : `${pfx}/`;
  setPrefix(clean);
  const parts = clean.split('/').filter(Boolean);
  setPath(parts);
  await fetchTree(clean);
};

const renderClickedPath = () => {
  return (
    <div className="clicked-path">
      <div className="path-item root" onClick={() => { setPrefix(''); setPath([]); fetchTree(''); }}>
      </div>
      {path.map((segment, idx) => {
        const segPrefix = path.slice(0, idx + 1).join('/') + '/';
        const isCurrentFolder = idx === path.length - 1;
        return (
          <div
            key={idx}
            className="path-item"
            style={{ paddingLeft: 16 * (idx + 1),gap :'8px'}}
            onClick={() => handleBreadcrumbClick(idx)}
          >
            <span className="path-icon" aria-hidden>
              {isCurrentFolder ? (
                <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="24" height="24" rx="4" fill="white" fill-opacity="0.01"/>
                  <rect x="0.5" y="0.5" width="25" height="25" rx="4.5" stroke="white" stroke-opacity="0.01"/>
                  <path d="M7.09375 11.5625L4 17.7812V6H10.5L12.5 8H19V11H8H7.375L7.09375 11.5625ZM4 20L8 12H22L18 20H4Z" fill="#212223"/>
                </svg>
              ) : (
                <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="24" height="24" rx="4" fill="white" fill-opacity="0.01"/>
                  <rect x="0.5" y="0.5" width="25" height="25" rx="4.5" stroke="white" stroke-opacity="0.01"/>
                  <path d="M12.5 8H18H19V9V11H18V9H12.5H12.0625L11.7812 8.71875L10.0625 7H5V18L8 12H20.875H22L21.5 13L18 20H16H5.09375H5H4V19V7V6H5H10.5L12.5 8ZM5.59375 19H16H17.375L20.375 13H8.59375L5.59375 19Z" fill="#212223"/>
                </svg>
              )}
            </span>
            <span className="path-label" style={{fontWeight:"400"}}>{segment}</span>
            {folderCounts[segPrefix] !== undefined && (
              <span className="count">({folderCounts[segPrefix]})</span>
            )}
          </div>
        );
      })}
    </div>
  );
};


const handleCreateFolder = async () => {
  const folderName = prompt('Enter folder name:');
  if (!folderName || !folderName.trim()) return;

  const folderKey = prefix + folderName.trim() + '/';
  setStatus('Creating folder...');

  try {
    await createFolder(folderKey);
    setStatus('Folder created');

    setPrefix(folderKey);
    const parts = folderKey.split('/').filter(Boolean);
    setPath(parts);
    await fetchTree(folderKey);
  } catch (err) {
    console.error(err);
    setStatus('Failed to create folder');
  }
};


const doUpload = async (file) => {
  const fileId = `${file.name}-${Date.now()}`;
  setProgress(prev => ({ ...prev, [fileId]: 0 }));
  setUploadQueue(prev => [...prev, { file, fileId, status: 'uploading' }]);
  
  try {
    const uploadFileWithPrefix = new File([file], prefix ? prefix + file.name : file.name, { type: file.type });
    const result = await uploadFile(uploadFileWithPrefix, (progressValue) => {
      setProgress(prev => ({ ...prev, [fileId]: progressValue }));
    });
    
    setCompletedUploads(prev => [...prev, { file, fileId, result }]);
    setUploadQueue(prev => prev.filter(item => item.fileId !== fileId));
    setProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileId];
      return newProgress;
    });

    await fetchTree(prefix);

    return result;
  } catch (err) {
    setFailedUploads(prev => [...prev, { file, fileId, error: err.message }]);
    setUploadQueue(prev => prev.filter(item => item.fileId !== fileId));
    setProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileId];
      return newProgress;
    });
    throw err;
  }
};

const handleMultipleUploads = async (files) => {
  if (files.length === 0) return;
  
  setStatus('');
  
  const newUploads = files.map(file => ({
    file,
    fileId: `${file.name}-${Date.now()}-${Math.random()}`,
    status: 'queued'
  }));
  
  setUploadQueue(prev => [...prev, ...newUploads]);
  
  for (const uploadItem of newUploads) {
    try {
      uploadItem.status = 'uploading';
      setUploadQueue(prev => [...prev]);
      
      const uploadFileWithPrefix = new File([uploadItem.file], prefix ? prefix + uploadItem.file.name : uploadItem.file.name, { type: uploadItem.file.type });
      const result = await uploadFile(uploadFileWithPrefix, (progressValue) => {
        setProgress(prev => ({ ...prev, [uploadItem.fileId]: progressValue }));
      });
      
      setCompletedUploads(prev => [...prev, { file: uploadItem.file, fileId: uploadItem.fileId, result }]);
      setUploadQueue(prev => prev.filter(item => item.fileId !== uploadItem.fileId));
      setProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[uploadItem.fileId];
        return newProgress;
      });

      await fetchTree(prefix);
      
    } catch (err) {
      setFailedUploads(prev => [...prev, { file: uploadItem.file, fileId: uploadItem.fileId, error: err.message }]);
      setUploadQueue(prev => prev.filter(item => item.fileId !== uploadItem.fileId));
      setProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[uploadItem.fileId];
        return newProgress;
      });
    }
  }
  
  setStatus('');
};

const onInputChange = async (e) => {
  const files = Array.from(e.target.files || []);
  if (files.length > 0) {
    await handleMultipleUploads(files);
    e.target.value = '';
  }
};

const onModalFileChange = async (e) => {
  const files = Array.from(e.target.files || []);
  if (files.length > 0) {
    await handleMultipleUploads(files);
    e.target.value = '';
    setIsUploadModalOpen(true);
  }
};

  const onDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); };
  const onDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); };

  const handleBreadcrumbClick = (idx) => {
    const newPath = path.slice(0, idx + 1);
    setPath(newPath);
    const newPrefix = newPath.length ? newPath.join('/') + '/' : '';
    setPrefix(newPrefix);
    fetchTree(newPrefix);
  };

  const renderTableRows = () => {
    return treeData.map((node, index) => (
      <tr key={node.key} className="row" style={{ 
        backgroundColor: index % 2 === 1 ? '#F2F6F9' : 'transparent' 
      }}>
        <td className="cell folder-name" style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {node.type === 'folder' ? (
            <>
              <span className="folder-svg" aria-hidden>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.5 7H19H20V8V18V19H19H5H4V18V6V5H5H11L12.5 7ZM19 8H12.5H12L11.6875 7.625L10.5 6H5V18H19V8Z" fill="#404040"/>
                </svg>
              </span>
              <a className="link" style={{color:'#0062C4',textDecoration:'underline',fontWeight:"400"}} href="#" onClick={(e) => { e.preventDefault(); goToPrefix(node.key); }}>{node.name}</a>
            </>
          ) : (
            <span className="file-text">{node.name}</span>
          )}
        </td>
        <td className="cell path-cell" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {node.type === 'folder' ? (
            <span></span>
          ) : (
            <span title={node.key}>{node.key}</span>
          )}
        </td>
        <td className="cell filetype-cell">
          {node.type === 'folder' ? (
            <span>—</span>
          ) : (
            <span>{(node.key.split('.').pop() || '').toUpperCase()}</span>
          )}
        </td>
        <td className="cell filesize-cell">
          {node.type === 'folder' ? (
            <span>—</span>
          ) : (
            <span>{typeof node.size === 'number' ? `${Math.round(node.size / (1024 * 1024))} MB` : '—'}</span>
          )}
        </td>
      </tr>
    ));
  };

  const clearUploadHistory = () => {
    setCompletedUploads([]);
    setFailedUploads([]);
  };

  const getOverallProgress = () => {
    const allFileIds = Object.keys(progress);
    if (allFileIds.length === 0) return 0;
    
    const totalProgress = allFileIds.reduce((sum, fileId) => sum + (progress[fileId] || 0), 0);
    return Math.round(totalProgress / allFileIds.length);
  };

  const formatBytes = (val) => {
    const bytes = typeof val === 'number' ? val : Number(val);
    if (!bytes || Number.isNaN(bytes)) return 'N/A';
    const units = ['B','KB','MB','GB','TB'];
    let i = 0; let b = bytes;
    while (b >= 1024 && i < units.length - 1) { b /= 1024; i++; }
    return `${b.toFixed(b >= 100 ? 0 : b >= 10 ? 1 : 2)} ${units[i]}`;
  };

  const folderCount = treeData.filter(n => n.type === 'folder').length;
 
  const activeFolderName = path.length > 0 ? path[path.length - 1] : 'Help and support S3 file storage';

  const isInternalFolder = () => {
    const p = prefix.toLowerCase();
    return p.includes('/help_internal/') || p.startsWith('help_internal/');
  };

  const isExternalFolder = () => {
    const name = (activeFolderName || '').toLowerCase();
    return name.includes('external') || name.includes('public') || name.includes('private');
  };

  const openCreateModal = () => {
    setNewFolderName('');
    setNewFolderError('');
    setIsCreateModalOpen(true);
  };

  const handleCreateFolderSubmit = async () => {
    if (!newFolderName.trim()) {
      setNewFolderError('Folder name is required');
      return;
    }

    try {
      const folderKey = prefix + newFolderName.trim() + '/';
      await createFolder(folderKey);
      setIsCreateModalOpen(false);
      setNewFolderName('');
      setNewFolderError('');
      setPrefix(folderKey);
      const parts = folderKey.split('/').filter(Boolean);
      setPath(parts);
      await fetchTree(folderKey);
    } catch (err) {
      setNewFolderError('Failed to create folder');
    }
  };

  const handleCreateFolderKey = (e) => {
    if (e.key === 'Enter') {
      handleCreateFolderSubmit();
    }
  };

  return (
    <div className="app-container theme-light">
      <div className="layout-two">
        <aside className="sidebar">
          <div className="sidebar-title">Filepath</div>
          <ClickedPath
            path={path}
            folderCounts={folderCounts}
            onRootClick={() => { setPrefix(''); setPath([]); fetchTree(''); }}
            onCrumbClick={handleBreadcrumbClick}
          />
        </aside>

        <main className="main">
          <header className="page-header">
            <div>
              <h1 className="page-title">{activeFolderName}</h1>
              <div className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span aria-hidden style={{ display: 'inline-flex' }}>
                  {
                    isInternalFolder()? (
                    <svg width="133" height="28" viewBox="0 0 133 28" fill="none" xmlns="http://www.w3.org/2000/svg">
<g filter="url(#filter0_d_197_29145)">
<rect x="2" y="2" width="129" height="24" rx="12" fill="#AB3300"/>
<rect x="1.5" y="1.5" width="130" height="25" rx="12.5" stroke="#AB3300"/>
<path d="M15.5 10.5V12H20.5V10.5C20.5 9.125 19.375 8 18 8C16.5938 8 15.5 9.125 15.5 10.5ZM13.5 12V10.5C13.5 8.03125 15.5 6 18 6C20.4688 6 22.5 8.03125 22.5 10.5V12H25V22H11V12H13.5Z" fill="#FFF8E5"/>
<path d="M33.808 18.668C33.1547 18.668 32.5573 18.5467 32.016 18.304C31.4747 18.052 30.9987 17.716 30.588 17.296L31.246 16.54C31.5727 16.8853 31.96 17.156 32.408 17.352C32.8653 17.548 33.3367 17.646 33.822 17.646C34.4287 17.646 34.9 17.5107 35.236 17.24C35.572 16.96 35.74 16.596 35.74 16.148C35.74 15.8307 35.67 15.5787 35.53 15.392C35.3993 15.2053 35.2173 15.0467 34.984 14.916C34.76 14.7853 34.5033 14.6547 34.214 14.524L32.898 13.95C32.5993 13.8193 32.3053 13.656 32.016 13.46C31.736 13.264 31.5027 13.0167 31.316 12.718C31.1293 12.41 31.036 12.032 31.036 11.584C31.036 11.1173 31.1573 10.702 31.4 10.338C31.652 9.96467 31.9927 9.67533 32.422 9.47C32.8607 9.25533 33.36 9.148 33.92 9.148C34.48 9.148 34.9933 9.25067 35.46 9.456C35.9267 9.66133 36.3187 9.92733 36.636 10.254L36.006 11.01C35.7167 10.758 35.3993 10.5573 35.054 10.408C34.7087 10.2493 34.3307 10.17 33.92 10.17C33.4067 10.17 32.9913 10.2913 32.674 10.534C32.366 10.7767 32.212 11.1033 32.212 11.514C32.212 11.8033 32.2867 12.0413 32.436 12.228C32.5853 12.4147 32.7767 12.5687 33.01 12.69C33.2527 12.8113 33.4953 12.928 33.738 13.04L35.04 13.6C35.404 13.7587 35.726 13.9407 36.006 14.146C36.2953 14.3513 36.5193 14.608 36.678 14.916C36.846 15.224 36.93 15.602 36.93 16.05C36.93 16.5353 36.804 16.9787 36.552 17.38C36.3093 17.772 35.95 18.0847 35.474 18.318C35.0073 18.5513 34.452 18.668 33.808 18.668ZM38.6265 18.5V11.696H39.7745V18.5H38.6265ZM39.2005 10.296C38.9765 10.296 38.7898 10.226 38.6405 10.086C38.5005 9.946 38.4305 9.764 38.4305 9.54C38.4305 9.316 38.5005 9.134 38.6405 8.994C38.7898 8.854 38.9765 8.784 39.2005 8.784C39.4245 8.784 39.6065 8.854 39.7465 8.994C39.8958 9.134 39.9705 9.316 39.9705 9.54C39.9705 9.764 39.8958 9.946 39.7465 10.086C39.6065 10.226 39.4245 10.296 39.2005 10.296ZM44.3678 21.636C43.8172 21.636 43.3272 21.5613 42.8978 21.412C42.4778 21.272 42.1465 21.0667 41.9038 20.796C41.6705 20.5253 41.5538 20.194 41.5538 19.802C41.5538 19.5127 41.6425 19.2327 41.8198 18.962C41.9972 18.7007 42.2398 18.4673 42.5478 18.262V18.206C42.3798 18.094 42.2352 17.9493 42.1138 17.772C42.0018 17.5853 41.9458 17.3613 41.9458 17.1C41.9458 16.8107 42.0252 16.5587 42.1838 16.344C42.3518 16.1293 42.5198 15.9613 42.6878 15.84V15.784C42.4732 15.5973 42.2725 15.3453 42.0858 15.028C41.8992 14.7107 41.8058 14.3513 41.8058 13.95C41.8058 13.4553 41.9225 13.026 42.1558 12.662C42.3985 12.298 42.7112 12.018 43.0938 11.822C43.4858 11.626 43.9105 11.528 44.3678 11.528C44.5545 11.528 44.7318 11.5467 44.8998 11.584C45.0678 11.612 45.2125 11.6493 45.3338 11.696H47.6998V12.578H46.2858V12.634C46.4538 12.7833 46.5892 12.97 46.6918 13.194C46.8038 13.418 46.8598 13.684 46.8598 13.992C46.8598 14.4773 46.7478 14.8973 46.5238 15.252C46.2998 15.5973 46.0012 15.868 45.6278 16.064C45.2545 16.2507 44.8345 16.344 44.3678 16.344C44.1998 16.344 44.0272 16.3253 43.8498 16.288C43.6725 16.2413 43.5045 16.1807 43.3458 16.106C43.2338 16.2087 43.1312 16.3207 43.0378 16.442C42.9538 16.5633 42.9118 16.722 42.9118 16.918C42.9118 17.1327 42.9958 17.31 43.1638 17.45C43.3412 17.59 43.6585 17.66 44.1158 17.66H45.4318C46.2252 17.66 46.8178 17.7907 47.2098 18.052C47.6112 18.304 47.8118 18.7147 47.8118 19.284C47.8118 19.704 47.6718 20.0913 47.3918 20.446C47.1118 20.8007 46.7105 21.0853 46.1878 21.3C45.6745 21.524 45.0678 21.636 44.3678 21.636ZM44.3678 15.574C44.6292 15.574 44.8672 15.5087 45.0818 15.378C45.3058 15.238 45.4832 15.0467 45.6138 14.804C45.7445 14.5613 45.8098 14.2767 45.8098 13.95C45.8098 13.446 45.6698 13.0587 45.3898 12.788C45.1098 12.508 44.7692 12.368 44.3678 12.368C43.9665 12.368 43.6258 12.508 43.3458 12.788C43.0658 13.0587 42.9258 13.446 42.9258 13.95C42.9258 14.2767 42.9912 14.5613 43.1218 14.804C43.2525 15.0467 43.4252 15.238 43.6398 15.378C43.8638 15.5087 44.1065 15.574 44.3678 15.574ZM44.5358 20.838C44.9652 20.838 45.3385 20.7727 45.6558 20.642C45.9825 20.5113 46.2345 20.3387 46.4118 20.124C46.5985 19.9093 46.6918 19.6853 46.6918 19.452C46.6918 19.1347 46.5705 18.9153 46.3278 18.794C46.0945 18.6727 45.7585 18.612 45.3198 18.612H44.1438C44.0132 18.612 43.8685 18.6027 43.7098 18.584C43.5605 18.5653 43.4112 18.5373 43.2618 18.5C43.0098 18.6773 42.8278 18.864 42.7158 19.06C42.6132 19.256 42.5618 19.452 42.5618 19.648C42.5618 20.012 42.7345 20.3013 43.0798 20.516C43.4345 20.7307 43.9198 20.838 44.5358 20.838ZM49.1265 18.5V11.696H50.0785L50.1765 12.676H50.2185C50.5452 12.3493 50.8905 12.0787 51.2545 11.864C51.6185 11.64 52.0338 11.528 52.5005 11.528C53.2192 11.528 53.7418 11.7567 54.0685 12.214C54.4045 12.662 54.5725 13.32 54.5725 14.188V18.5H53.4245V14.342C53.4245 13.698 53.3218 13.236 53.1165 12.956C52.9205 12.6667 52.5938 12.522 52.1365 12.522C51.7912 12.522 51.4785 12.6107 51.1985 12.788C50.9278 12.9653 50.6198 13.2267 50.2745 13.572V18.5H49.1265ZM59.5855 18.5V11.696H60.7335V18.5H59.5855ZM60.1595 10.296C59.9355 10.296 59.7488 10.226 59.5995 10.086C59.4595 9.946 59.3895 9.764 59.3895 9.54C59.3895 9.316 59.4595 9.134 59.5995 8.994C59.7488 8.854 59.9355 8.784 60.1595 8.784C60.3835 8.784 60.5655 8.854 60.7055 8.994C60.8548 9.134 60.9295 9.316 60.9295 9.54C60.9295 9.764 60.8548 9.946 60.7055 10.086C60.5655 10.226 60.3835 10.296 60.1595 10.296ZM63.0308 18.5V11.696H63.9828L64.0808 12.676H64.1228C64.4495 12.3493 64.7948 12.0787 65.1588 11.864C65.5228 11.64 65.9381 11.528 66.4048 11.528C67.1235 11.528 67.6461 11.7567 67.9728 12.214C68.3088 12.662 68.4768 13.32 68.4768 14.188V18.5H67.3288V14.342C67.3288 13.698 67.2261 13.236 67.0208 12.956C66.8248 12.6667 66.4981 12.522 66.0408 12.522C65.6955 12.522 65.3828 12.6107 65.1028 12.788C64.8321 12.9653 64.5241 13.2267 64.1788 13.572V18.5H63.0308ZM73.4898 18.5V11.696H74.4418L74.5398 12.928H74.5818C74.8058 12.4987 75.0858 12.158 75.4218 11.906C75.7578 11.654 76.1218 11.528 76.5138 11.528C76.6631 11.528 76.7938 11.5373 76.9058 11.556C77.0178 11.5747 77.1298 11.612 77.2418 11.668L76.9898 12.648C76.8871 12.62 76.7891 12.6013 76.6958 12.592C76.6118 12.5733 76.4998 12.564 76.3598 12.564C76.0705 12.564 75.7671 12.6807 75.4498 12.914C75.1418 13.1473 74.8711 13.5533 74.6378 14.132V18.5H73.4898ZM80.9646 18.668C80.3579 18.668 79.8026 18.528 79.2986 18.248C78.8039 17.9587 78.4119 17.5527 78.1226 17.03C77.8333 16.498 77.6886 15.854 77.6886 15.098C77.6886 14.3607 77.8379 13.726 78.1366 13.194C78.4353 12.662 78.8179 12.2513 79.2846 11.962C79.7513 11.6727 80.2459 11.528 80.7686 11.528C81.3473 11.528 81.8373 11.6633 82.2386 11.934C82.6493 12.1953 82.9573 12.564 83.1626 13.04C83.3679 13.516 83.4706 14.076 83.4706 14.72C83.4706 14.8413 83.4659 14.958 83.4566 15.07C83.4566 15.182 83.4426 15.294 83.4146 15.406H78.5146V14.496H82.4346C82.4346 13.8427 82.2899 13.3433 82.0006 12.998C81.7206 12.6433 81.3146 12.466 80.7826 12.466C80.4746 12.466 80.1713 12.5547 79.8726 12.732C79.5739 12.9 79.3266 13.1753 79.1306 13.558C78.9439 13.9407 78.8506 14.4493 78.8506 15.084C78.8506 15.6627 78.9486 16.148 79.1446 16.54C79.3499 16.932 79.6253 17.2307 79.9706 17.436C80.3159 17.632 80.6939 17.73 81.1046 17.73C81.4313 17.73 81.7346 17.6833 82.0146 17.59C82.3039 17.4967 82.5653 17.3707 82.7986 17.212L83.2186 17.968C82.9199 18.1733 82.5839 18.3413 82.2106 18.472C81.8466 18.6027 81.4313 18.668 80.9646 18.668ZM89.4639 21.37V18.948L89.5199 17.716C89.2492 17.9773 88.9366 18.2013 88.5819 18.388C88.2366 18.5747 87.8679 18.668 87.4759 18.668C86.6172 18.668 85.9312 18.36 85.4179 17.744C84.9139 17.1187 84.6619 16.2413 84.6619 15.112C84.6619 14.3747 84.7972 13.74 85.0679 13.208C85.3479 12.6667 85.7119 12.2513 86.1599 11.962C86.6079 11.6727 87.0932 11.528 87.6159 11.528C88.0079 11.528 88.3532 11.598 88.6519 11.738C88.9599 11.878 89.2632 12.0787 89.5619 12.34H89.5899L89.7019 11.696H90.6259V21.37H89.4639ZM87.7279 17.702C88.0452 17.702 88.3439 17.6227 88.6239 17.464C88.9039 17.3053 89.1839 17.072 89.4639 16.764V13.208C89.1839 12.9467 88.9086 12.7647 88.6379 12.662C88.3672 12.55 88.0919 12.494 87.8119 12.494C87.4479 12.494 87.1166 12.606 86.8179 12.83C86.5286 13.0447 86.2952 13.348 86.1179 13.74C85.9406 14.1227 85.8519 14.5753 85.8519 15.098C85.8519 15.91 86.0152 16.5493 86.3419 17.016C86.6686 17.4733 87.1306 17.702 87.7279 17.702ZM94.9055 18.668C94.1869 18.668 93.6595 18.444 93.3235 17.996C92.9969 17.5387 92.8335 16.876 92.8335 16.008V11.696H93.9815V15.854C93.9815 16.4887 94.0795 16.9507 94.2755 17.24C94.4809 17.52 94.8075 17.66 95.2555 17.66C95.6009 17.66 95.9089 17.5713 96.1795 17.394C96.4595 17.2073 96.7629 16.918 97.0895 16.526V11.696H98.2375V18.5H97.2855L97.1875 17.436H97.1455C96.8375 17.8093 96.5015 18.108 96.1375 18.332C95.7829 18.556 95.3722 18.668 94.9055 18.668ZM100.533 18.5V11.696H101.681V18.5H100.533ZM101.107 10.296C100.883 10.296 100.696 10.226 100.547 10.086C100.407 9.946 100.337 9.764 100.337 9.54C100.337 9.316 100.407 9.134 100.547 8.994C100.696 8.854 100.883 8.784 101.107 8.784C101.331 8.784 101.513 8.854 101.653 8.994C101.802 9.134 101.877 9.316 101.877 9.54C101.877 9.764 101.802 9.946 101.653 10.086C101.513 10.226 101.331 10.296 101.107 10.296ZM103.978 18.5V11.696H104.93L105.028 12.928H105.07C105.294 12.4987 105.574 12.158 105.91 11.906C106.246 11.654 106.61 11.528 107.002 11.528C107.151 11.528 107.282 11.5373 107.394 11.556C107.506 11.5747 107.618 11.612 107.73 11.668L107.478 12.648C107.375 12.62 107.277 12.6013 107.184 12.592C107.1 12.5733 106.988 12.564 106.848 12.564C106.559 12.564 106.255 12.6807 105.938 12.914C105.63 13.1473 105.359 13.5533 105.126 14.132V18.5H103.978ZM111.453 18.668C110.846 18.668 110.291 18.528 109.787 18.248C109.292 17.9587 108.9 17.5527 108.611 17.03C108.322 16.498 108.177 15.854 108.177 15.098C108.177 14.3607 108.326 13.726 108.625 13.194C108.924 12.662 109.306 12.2513 109.773 11.962C110.24 11.6727 110.734 11.528 111.257 11.528C111.836 11.528 112.326 11.6633 112.727 11.934C113.138 12.1953 113.446 12.564 113.651 13.04C113.856 13.516 113.959 14.076 113.959 14.72C113.959 14.8413 113.954 14.958 113.945 15.07C113.945 15.182 113.931 15.294 113.903 15.406H109.003V14.496H112.923C112.923 13.8427 112.778 13.3433 112.489 12.998C112.209 12.6433 111.803 12.466 111.271 12.466C110.963 12.466 110.66 12.5547 110.361 12.732C110.062 12.9 109.815 13.1753 109.619 13.558C109.432 13.9407 109.339 14.4493 109.339 15.084C109.339 15.6627 109.437 16.148 109.633 16.54C109.838 16.932 110.114 17.2307 110.459 17.436C110.804 17.632 111.182 17.73 111.593 17.73C111.92 17.73 112.223 17.6833 112.503 17.59C112.792 17.4967 113.054 17.3707 113.287 17.212L113.707 17.968C113.408 18.1733 113.072 18.3413 112.699 18.472C112.335 18.6027 111.92 18.668 111.453 18.668ZM117.964 18.668C117.106 18.668 116.42 18.36 115.906 17.744C115.402 17.1187 115.15 16.2413 115.15 15.112C115.15 14.3747 115.286 13.74 115.556 13.208C115.836 12.6667 116.2 12.2513 116.648 11.962C117.096 11.6727 117.582 11.528 118.104 11.528C118.506 11.528 118.846 11.598 119.126 11.738C119.416 11.8687 119.71 12.06 120.008 12.312L119.952 11.15V8.532H121.114V18.5H120.162L120.064 17.702H120.022C119.761 17.9633 119.453 18.192 119.098 18.388C118.744 18.5747 118.366 18.668 117.964 18.668ZM118.216 17.702C118.534 17.702 118.832 17.6227 119.112 17.464C119.392 17.3053 119.672 17.072 119.952 16.764V13.208C119.672 12.9467 119.397 12.7647 119.126 12.662C118.856 12.55 118.58 12.494 118.3 12.494C117.936 12.494 117.605 12.606 117.306 12.83C117.017 13.0447 116.784 13.348 116.606 13.74C116.429 14.1227 116.34 14.5753 116.34 15.098C116.34 15.91 116.504 16.5493 116.83 17.016C117.157 17.4733 117.619 17.702 118.216 17.702Z" fill="#FFF8E5"/>
</g>
<defs>
<filter id="filter0_d_197_29145" x="0" y="0" width="133" height="28" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feMorphology radius="1" operator="dilate" in="SourceAlpha" result="effect1_dropShadow_197_29145"/>
<feOffset/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_197_29145"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_197_29145" result="shape"/>
</filter>
</defs>
</svg>
                    ) : (
                      ""
                    )
                  }
                
                </span>
                <span>
                  {isInternalFolder()
                    ? 'Files uploaded here are for internal use. Sign in to access content.'
                    : 'Files uploaded here are public facing. Others can access and edit them.'}
                </span>
              </div>
            </div>
          </header>
          <ActionsBar
            onOpenUpload={() => { setIsUploadModalOpen(true); setShouldAutoOpenFileDialog(true); }}
            onCreateFolderClick={openCreateModal}
            isUploading={isUploading}
            fileInputRef={fileInputRef}
            onInputChange={onInputChange}
          />

          <FileTable treeData={treeData} uploadQueue={uploadQueue} renderTableRows={renderTableRows} />

          {treeData.length > 0 && (
            <footer className="pagination">
              <div className="pager-left">
                <button className="btn" disabled>{'<' } Previous</button>
                <button className="btn">Next {'>'}</button>
              </div>
              <div className="pager-middle">
                <span>Go to page:</span>
                <input className="input" type="number" min="1" />
                <button className="btn">Go</button>
              </div>
              <div className="pager-right">
                <span>Items per page</span>
                <select className="input">
                  <option>25</option>
                </select>
              </div>
            </footer>
          )}

          <StatusBar status={status} isUploading={isUploading} />
        </main>
      </div>

      <UploadModal
        open={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        modalFileInputRef={modalFileInputRef}
        onModalFileChange={onModalFileChange}
        uploadQueue={uploadQueue}
        progress={progress}
        completedUploads={completedUploads}
        failedUploads={failedUploads}
        currentPath={prefix || '/'}
        onFilesSelected={handleMultipleUploads}
      />

      <CreateFolderModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        newFolderName={newFolderName}
        setNewFolderName={(v) => { setNewFolderName(v); setNewFolderError(''); }}
        newFolderError={newFolderError}
        onSubmit={handleCreateFolderSubmit}
        onKeyDown={handleCreateFolderKey}
      />
    </div>
  );
}

export default App;
