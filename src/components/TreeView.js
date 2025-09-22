import React, { useState, useEffect } from 'react';
import { listS3 } from '../api';

function TreeNode({ item, level, onSelect, selectedPath, expanded, toggleExpand, children }) {
  const isFolder = item.type === 'folder';
  const isExpanded = expanded.includes(item.path);
  const isSelected = selectedPath === item.path;
  
  return (
    <>
      <div 
        className={`tree-item ${isSelected ? 'selected' : ''}`} 
        style={{ paddingLeft: `${(level) * 20}px` }}
        onClick={(e) => {
          e.stopPropagation();
          if (isFolder) {
            toggleExpand(item.path);
          }
          onSelect(item);
        }}
      >
        {level > 0 && <span className="tree-branch">└─</span>}
        <span className="tree-icon">{isFolder ? (isExpanded ? '📂' : '📁') : '📄'}</span>
        <span className="tree-label">
          {item.name}
        </span>
      </div>
      
      {isFolder && isExpanded && children}
    </>
  );
}

function TreeView({ onNavigate, rootName, currentPrefix }) {
  const [treeData, setTreeData] = useState([]);
  const [expanded, setExpanded] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPath, setSelectedPath] = useState('');

  // Load initial data
  useEffect(() => {
    loadFolderContents('');
  }, []);

  // Update selected path when prefix changes
  useEffect(() => {
    setSelectedPath(currentPrefix);
  }, [currentPrefix]);

  const loadFolderContents = async (prefix) => {
    setLoading(true);
    try {
      const res = await listS3(prefix);
      
      if (prefix === '') {
        // Root level initialization
        const rootFolders = res.folders.map(folder => ({
          name: folder.replace(/\/$/, '').split('/').pop(),
          path: folder,
          type: 'folder'
        }));
        
        const rootFiles = res.files.map(file => ({
          name: typeof file === 'string' ? file.split('/').pop() : file.key.split('/').pop(),
          path: typeof file === 'string' ? file : file.key,
          type: 'file',
          size: typeof file === 'string' ? undefined : file.size
        }));
        
        setTreeData([...rootFolders, ...rootFiles]);
      } else {
        // Add newly loaded data to the tree
        const newFolders = res.folders.map(folder => ({
          name: folder.replace(/\/$/, '').split('/').pop(),
          path: folder,
          type: 'folder'
        }));
        
        const newFiles = res.files.map(file => ({
          name: typeof file === 'string' ? file.split('/').pop() : file.key.split('/').pop(),
          path: typeof file === 'string' ? file : file.key,
          type: 'file',
          size: typeof file === 'string' ? undefined : file.size
        }));

        // We don't modify the tree data here, we'll load contents dynamically
      }
    } catch (err) {
      console.error('Failed to load tree data:', err);
    }
    setLoading(false);
  };

  const toggleExpand = (path) => {
    if (expanded.includes(path)) {
      setExpanded(expanded.filter(p => p !== path && !p.startsWith(`${path}/`)));
    } else {
      setExpanded([...expanded, path]);
      // Load contents of this folder if not already loaded
      loadFolderContents(path);
    }
  };
  
  const handleSelect = (item) => {
    setSelectedPath(item.path);
    if (item.type === 'folder') {
      onNavigate(item.path);
    }
  };

  const renderTreeNodes = (items, level = 0) => {
    return items.map(item => {
      if (item.type === 'folder') {
        // For folders, we need to check if it's expanded and render children
        const isItemExpanded = expanded.includes(item.path);
        let childItems = [];
        
        // Only load children if expanded
        if (isItemExpanded) {
          // Dynamic loading approach
          childItems = treeData.filter(child => 
            child.path !== item.path && 
            child.path.startsWith(item.path) &&
            !child.path.replace(item.path, '').includes('/')
          );
        }
        
        return (
          <TreeNode 
            key={item.path}
            item={item}
            level={level}
            onSelect={handleSelect}
            selectedPath={selectedPath}
            expanded={expanded}
            toggleExpand={toggleExpand}
          >
            {childItems.length > 0 && renderTreeNodes(childItems, level + 1)}
          </TreeNode>
        );
      } else {
        // For files, just render the node
        return (
          <TreeNode 
            key={item.path}
            item={item}
            level={level}
            onSelect={handleSelect}
            selectedPath={selectedPath}
            expanded={expanded}
            toggleExpand={toggleExpand}
          />
        );
      }
    });
  };

  return (
    <div className="tree-view">
      <div className="tree-item root" onClick={() => {
        onNavigate('');
        setSelectedPath('');
      }}>
        <span className="tree-icon">🏷️</span>
        <span className="tree-label">{rootName}</span>
      </div>
      
      {loading && <div className="tree-loading">Loading...</div>}
      
      {renderTreeNodes(treeData.filter(item => 
        // Show only top-level items initially
        !item.path.includes('/') || 
        // Or direct children of expanded folders
        expanded.some(exp => item.path.startsWith(exp) && 
          item.path.replace(exp, '').split('/').filter(Boolean).length === 1)
      ))}
    </div>
  );
}

export default TreeView;