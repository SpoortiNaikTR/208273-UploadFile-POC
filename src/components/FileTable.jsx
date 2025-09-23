import React from 'react';

function FileTable({ treeData, uploadQueue, renderTableRows }) {
  return (
    <section className="card">
      {(treeData.length > 0 || uploadQueue.length > 0) ? (
        <table className="table" style={{ 
          tableLayout: 'fixed',
          width: '100%',
          whiteSpace: 'nowrap'
        }}>
          <thead style={{ backgroundColor: '#DAE4ED' }}>
            <tr>
              <th style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '25%' }}>Folder name</th>
              <th style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '50%' }}>Filepath</th>
              <th style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '15%' }}>File type</th>
              <th style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '10%' }}>File size</th>
            </tr>
          </thead>
          <tbody>
            {renderTableRows()}
          </tbody>
        </table>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
          color: '#888'
        }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            border: '3px solid #E44F13',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            color: '#E44F13',
            fontSize: 36,
            fontWeight: 600
          }}>!</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: '#333' }}>No files here yet</div>
          <div style={{ marginTop: 8, color: '#666', textAlign: 'center' }}>
            Get started by uploading a file or creating a folder.
          </div>
        </div>
      )}
    </section>
  );
}

export default FileTable; 