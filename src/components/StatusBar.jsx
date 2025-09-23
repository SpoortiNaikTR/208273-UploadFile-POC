import React from 'react';

function StatusBar({ status, isUploading }) {
  if (!status) return null;
  return (
    <div className="status-bar">
      {isUploading && <span className="spinner" />}
      <span style={{ marginLeft: isUploading ? 8 : 0 }}>{status}</span>
    </div>
  );
}

export default StatusBar; 