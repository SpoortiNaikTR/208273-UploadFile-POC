import React from 'react';

function CreateFolderModal({ open, onClose, newFolderName, setNewFolderName, newFolderError, onSubmit, onKeyDown }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create folder</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <label htmlFor="new-folder" style={{ display: 'block', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Folder name*</label>
          <input
            id="new-folder"
            className="input"
            placeholder="[New+folder+name]"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={onKeyDown}
            style={{ width: '100%', height: 44 }}
          />
          {newFolderError && (
            <div className="modal-error" style={{ color: '#D64000', marginTop: 8 }}>{newFolderError}</div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onSubmit}>Create folder</button>
        </div>
      </div>
    </div>
  );
}

export default CreateFolderModal; 