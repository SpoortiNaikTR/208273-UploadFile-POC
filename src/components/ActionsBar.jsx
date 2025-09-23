import React from 'react';

function ActionsBar({ onOpenUpload, onCreateFolderClick, isUploading, fileInputRef, onInputChange }) {
  return (
    <div className="actions">
      <button type="button" className="btn btn-primary" onClick={onOpenUpload}>
        <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: 8 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8.34375 0.40625L12.3438 4.40625L12.6875 4.75L12 5.46875L11.625 5.125L8.5 1.96875V10.5V11H7.5V10.5V1.96875L4.34375 5.125L4 5.46875L3.28125 4.75L3.625 4.40625L7.625 0.40625L8 0.0625L8.34375 0.40625ZM2 10.5V15H14V10.5V10H15V10.5V15.5V16H14.5H1.5H1V15.5V10.5V10H2V10.5Z" fill="#FAFAFA"/>
          </svg>
        </span>
        Upload file
      </button>
      <input ref={fileInputRef} id="file-input" type="file" multiple onChange={onInputChange} style={{ display: 'none' }} />
      <button className="btn" onClick={onCreateFolderClick} disabled={isUploading}>
        <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: 8 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1H7L8.5 3H15H16V4V14V15H15H1H0V14V2V1H1ZM8.5 4H8L7.6875 3.625L6.5 2H1V14H15V4H8.5ZM8.5 6V6.5V8.5H10.5H11V9.5H10.5H8.5V11.5V12H7.5V11.5V9.5H5.5H5V8.5H5.5H7.5V6.5V6H8.5Z" fill="#1F1F1F"/>
          </svg>
        </span>
        Create folder
      </button>
    </div>
  );
}

export default ActionsBar; 