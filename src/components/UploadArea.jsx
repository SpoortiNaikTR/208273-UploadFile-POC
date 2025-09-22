import React, { useRef, useState } from 'react';

function UploadArea({ onFilesSelected, uploadQueue, progress, completedUploads, failedUploads, onClearHistory, onCreateFolder, currentPath, hideControls, variant, onCancelUpload }) {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const handleClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleInputChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0 && typeof onFilesSelected === 'function') {
      onFilesSelected(files);
      // reset so same files can be re-selected
      e.target.value = '';
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0 && typeof onFilesSelected === 'function') {
      onFilesSelected(files);
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const overallProgress = () => {
    const ids = Object.keys(progress || {});
    if (ids.length === 0) return 0;
    const total = ids.reduce((sum, id) => sum + (progress[id] || 0), 0);
    return Math.round(total / ids.length);
  };

  const formatMB = (bytes) => {
    const b = typeof bytes === 'number' ? bytes : Number(bytes);
    if (!b || Number.isNaN(b)) return '0 MB';
    const mb = b / (1024 * 1024);
    return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
  };

  const isModal = variant === 'modal';

  return (
    <div
      className="upload"
      onDrop={hideControls ? undefined : onDrop}
      onDragOver={hideControls ? undefined : onDragOver}
      onDragLeave={hideControls ? undefined : onDragLeave}
      style={{ outline: !hideControls && dragActive ? '2px solid #2b5cff' : 'none' }}
    >
      {!hideControls && (
        <>
          {isModal ? (
            <>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Disclaimer:</div>
              <div style={{ color: '#D64000', fontWeight: 600, margin: '0 0 12px 0' }}>Upload one file at a time. To add more, use 'Add file' or drag files individually.</div>
              <div className="dropzone" onClick={handleClick}>
                <div style={{ color: '#111827', marginBottom: 16 }}>Select <strong>Add file</strong> or drag a file into this space.</div>
                <button className="button" type="button" onClick={handleClick}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: 8, fontSize: 18 }}>+</span>
                  Add file
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                {/* <div className="path"><strong>Current Path:</strong> {currentPath || '/'}</div> */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="button" type="button" onClick={handleClick}>Add file</button>
                  {onCreateFolder && (
                    <button className="button secondary" type="button" onClick={onCreateFolder}>Create folder</button>
                  )}
                </div>
              </div>

              <div className="upload-warning" style={{ display: 'none' }}>
                <span className="warning-icon">⚠️</span>
                <span className="warning-text">Internal files only. Do not upload sensitive or personal data without approval.</span>
              </div>

              <div className="dropzone" onClick={handleClick}>
                Drag & drop files here, or click Upload
              </div>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleInputChange}
            style={{ display: 'none' }}
          />
        </>
      )}

      {Array.isArray(uploadQueue) && uploadQueue.length > 0 && (
        <div className="upload-queue">
          {!isModal && <h4>Uploading Files ({uploadQueue.length})</h4>}
          {uploadQueue.map(({ file, fileId }) => {
            const pct = progress[fileId] || 0;
            const uploadedBytes = Math.round((pct / 100) * file.size);
            return (
              <div key={fileId} className="upload-item">
                <div className="upload-row">
                  <span className="file-name-row">{file.name}</span>
                  <div className="row-right">
                    <span className="progress-inline">{pct}% complete</span>
                    <button className="row-cancel" title="Cancel" onClick={() => onCancelUpload && onCancelUpload(fileId)}>×</button>
                  </div>
                </div>
                <div className="progress">
                  <div className="progress-bar" style={{ width: `${pct}%` }} />
                </div>
                {!isModal && (
                  <span className="progress-label">
                    {formatMB(uploadedBytes)} / {formatMB(file.size)} ({pct}%)
                  </span>
                )}
              </div>
            );
          })}
          {Object.keys(progress || {}).length > 0 && !isModal && (
            <div className="overall-progress">
              <span>Overall Progress: {overallProgress()}%</span>
            </div>
          )}
        </div>
      )}

      {!hideControls && Array.isArray(completedUploads) && completedUploads.length > 0 && (
        <div className="upload-history">
          <div className="history-header">
            <h4>Completed Uploads ({completedUploads.length})</h4>
            {onClearHistory && (
              <button className="clear-btn" onClick={onClearHistory}>Clear</button>
            )}
          </div>
          {completedUploads.slice(-5).map(({ file, fileId }) => (
            <div key={fileId} className="upload-item completed">
              <span className="file-name">✅ {file.name}</span>
            </div>
          ))}
        </div>
      )}

      {!hideControls && Array.isArray(failedUploads) && failedUploads.length > 0 && (
        <div className="upload-history">
          <h4>Failed Uploads ({failedUploads.length})</h4>
          {failedUploads.slice(-5).map(({ file, fileId, error }) => (
            <div key={fileId} className="upload-item failed">
              <span className="file-name">❌ {file.name}</span>
              <span className="error-message">{error}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default UploadArea;

