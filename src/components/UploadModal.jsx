import React from 'react';
import UploadArea from './UploadArea.jsx';

function UploadModal({ open, onClose, modalFileInputRef, onModalFileChange, uploadQueue, progress, completedUploads, failedUploads, currentPath, onFilesSelected }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Upload file</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="modal-disclaimer"><strong>Disclaimer:</strong></div>
          <UploadArea
            variant="modal"
            onFilesSelected={onFilesSelected}
            uploadQueue={uploadQueue}
            progress={progress}
            completedUploads={completedUploads}
            failedUploads={failedUploads}
            currentPath={currentPath}
          />
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => modalFileInputRef.current && modalFileInputRef.current.click()}>Upload file</button>
          <input ref={modalFileInputRef} type="file" multiple onChange={onModalFileChange} style={{ display: 'none' }} />
        </div>
      </div>
    </div>
  );
}

export default UploadModal; 