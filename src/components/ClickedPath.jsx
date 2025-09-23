import React from 'react';

function ClickedPath({ path, folderCounts, onRootClick, onCrumbClick }) {
  return (
    <div className="clicked-path">
      <div className="path-item root" onClick={onRootClick}>
      </div>
      {path.map((segment, idx) => {
        const segPrefix = path.slice(0, idx + 1).join('/') + '/';
        const isCurrentFolder = idx === path.length - 1;
        return (
          <div
            key={idx}
            className="path-item"
            style={{ paddingLeft: 16 * (idx + 1), gap: '8px' }}
            onClick={() => onCrumbClick(idx)}
          >
            <span className="path-icon" aria-hidden>
              {isCurrentFolder ? (
                <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="24" height="24" rx="4" fill="white" fillOpacity="0.01"/>
                  <rect x="0.5" y="0.5" width="25" height="25" rx="4.5" stroke="white" strokeOpacity="0.01"/>
                  <path d="M7.09375 11.5625L4 17.7812V6H10.5L12.5 8H19V11H8H7.375L7.09375 11.5625ZM4 20L8 12H22L18 20H4Z" fill="#212223"/>
                </svg>
              ) : (
                <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="24" height="24" rx="4" fill="white" fillOpacity="0.01"/>
                  <rect x="0.5" y="0.5" width="25" height="25" rx="4.5" stroke="white" strokeOpacity="0.01"/>
                  <path d="M12.5 8H18H19V9V11H18V9H12.5H12.0625L11.7812 8.71875L10.0625 7H5V18L8 12H20.875H22L21.5 13L18 20H16H5.09375H5H4V19V7V6H5H10.5L12.5 8ZM5.59375 19H16H17.375L20.375 13H8.59375L5.59375 19Z" fill="#212223"/>
                </svg>
              )}
            </span>
            <span className="path-label" style={{ fontWeight: '400' }}>{segment}</span>
            {folderCounts[segPrefix] !== undefined && (
              <span className="count">({folderCounts[segPrefix]})</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ClickedPath; 