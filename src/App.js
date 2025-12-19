import React, { useState, useRef, useEffect } from 'react';
import { Upload, Search, Mic, FileText, ArrowRight, X, ArrowLeft, ZoomIn, ZoomOut, RotateCw, Copy, User, MapPin, Calendar, Building, Hash, FileType, Signature } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './App.css';

// Helper function to get icon for entity type
const getEntityIcon = (entityType) => {
  const type = entityType?.toLowerCase() || '';
  if (type.includes('person') || type.includes('name')) return User;
  if (type.includes('location') || type.includes('locaton')) return MapPin;
  if (type.includes('date')) return Calendar;
  if (type.includes('organization') || type.includes('org')) return Building;
  if (type.includes('id') || type.includes('number')) return Hash;
  if (type.includes('document') || type.includes('type')) return FileType;
  if (type.includes('signature')) return Signature;
  return FileText; // Default icon
};

// Helper function to count entities by type
const countEntitiesByType = (entities) => {
  const counts = {};
  entities.forEach(entity => {
    const type = entity.type || entity.entity_type || 'Unknown';
    counts[type] = (counts[type] || 0) + 1;
  });
  return counts;
};

// Helper to highlight text
const HighlightedText = ({ text, highlight }) => {
  if (!highlight || !text) return <span>{text}</span>;
  
  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() ? (
          <span key={i} className="highlighted-text">{part}</span>
        ) : (
          part
        )
      )}
    </span>
  );
};

function App() {
  const [documents, setDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [currentPage, setCurrentPage] = useState('listing'); // 'listing', 'segmentation', or 'results'
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [activeTab, setActiveTab] = useState('Summary');
  const [currentDocPage, setCurrentDocPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [documentDetails, setDocumentDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  // Search Results State
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const fileInputRef = useRef(null);

  // Fetch documents from API on mount
  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/documents`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
        },
      });
      const data = await response.json();
      if (data && data.documents) {
        const docs = data.documents.map(doc => ({
          id: doc.document_id,
          documentId: doc.document_id,
          name: doc.document_name + (doc.file_extension || ''),
          size: '-',
          uploadTime: new Date(doc.created_timestamp).toLocaleString('en-GB', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
          }),
          progress: doc.status_code === 'PROCESSED' ? 100 : doc.status_code === 'UPLOADED' ? 50 : 0,
          status: doc.status_name,
          extractionAccuracy: doc.textract_accuracy || 100,
          segmentationAccuracy: doc.segmentation_accuracy || 100,
          isNew: false,
          serverPath: doc.storage_path,
          fileType: doc.file_type,
        }));
        setDocuments(docs);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    const date = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return `${date}    ${time}`;
  };

  const uploadFilesToAPI = async (files) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
        },
        body: formData,
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  };

  const addFiles = async (fileList) => {
    const filesArray = Array.from(fileList);
    
    // Create initial documents with uploading status
    const newDocs = filesArray.map((file, index) => ({
      id: Date.now() + index,
      name: file.name,
      size: formatFileSize(file.size),
      uploadTime: getCurrentDateTime(),
      progress: 0,
      status: 'Uploading',
      extractionAccuracy: 100,
      segmentationAccuracy: 100,
      isNew: true,
      file: file,
    }));
    setDocuments(prev => [...prev, ...newDocs]);

    // Upload to API
    const result = await uploadFilesToAPI(filesArray);
    
    if (result && result.documents) {
      // Refresh documents list from server after upload
      await fetchDocuments();
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleFileSelect = (e) => {
    addFiles(e.target.files);
    e.target.value = '';
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteDocument = (id) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  const handleDeleteAll = () => {
    setDocuments([]);
  };

  // Simulate progress
  useEffect(() => {
    const interval = setInterval(() => {
      setDocuments(prev => prev.map(doc => {
        if (doc.progress < 100) {
          const newProgress = Math.min(doc.progress + Math.random() * 15, 100);
          return {
            ...doc,
            progress: newProgress,
            status: newProgress >= 100 ? 'Complete' : 'Processing',
          };
        }
        return doc;
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const totalDocs = documents.length;
  const newlyAddedDocs = documents.filter(d => d.isNew).length;
  const overallExtractionProgress = totalDocs > 0 
    ? Math.round(documents.reduce((sum, d) => sum + d.progress, 0) / totalDocs) 
    : 0;
  const overallSegmentationProgress = totalDocs > 0 
    ? Math.round(documents.reduce((sum, d) => sum + d.progress, 0) / totalDocs) 
    : 0;

  const getProgressTime = (progress) => {
    if (progress >= 100) return 'Done';
    if (progress >= 50) return '~ 30 Sec';
    return '~ 1 Min';
  };

  const handleSegmentationClick = () => {
    if (documents.length > 0) {
      setSelectedDocument(documents[0]);
      setCurrentPage('segmentation');
    }
  };

  const handleBackToListing = () => {
    setCurrentPage('listing');
    setSelectedDocument(null);
  };

  const handleGoToResults = () => {
    setCurrentPage('results');
    setGlobalSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
  };

  const handleBackToSegmentation = () => {
    setCurrentPage('segmentation');
  };

  // Fetch document details from API
  const fetchDocumentDetails = async (documentId) => {
    setIsLoadingDetails(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/documents/${documentId}`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
        },
      });
      const data = await response.json();
      setDocumentDetails(data);
    } catch (error) {
      console.error('Error fetching document details:', error);
      setDocumentDetails(null);
    }
    setIsLoadingDetails(false);
  };

  // Perform Global Search API Call
  const performGlobalSearch = async () => {
    if (!globalSearchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(`http://54.161.174.24:8765/api/search?q=${globalSearchQuery}`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
        },
      });
      const data = await response.json();
      
      if (data && data.results) {
        setSearchResults(data.results);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
    setIsSearching(false);
    setHasSearched(true);
  };

  const handleDocumentClick = (doc) => {
    setSelectedDocument(doc);
    setCurrentPage('segmentation');
    setCurrentDocPage(1);
    setZoomLevel(100);
    setActiveTab('Summary');
    setDocumentDetails(null);
    if (doc.documentId) {
      fetchDocumentDetails(doc.documentId);
    }
  };

  // Get document data for segmentation page
  const getDocumentData = () => {
    if (!selectedDocument) {
      return {
        title: 'No Document Selected',
        segmentationAccuracy: 0,
        confidenceScore: 0,
        totalPages: 1,
        summary: 'Please select a document to view its details.',
        extractedFields: [],
        extractedText: '',
        textAccuracy: 0
      };
    }

    const segAccuracy = documentDetails?.segmentation_accuracy || selectedDocument.segmentationAccuracy || 0;
    const formattedSegAccuracy = segAccuracy < 1 ? (segAccuracy * 100).toFixed(2) : segAccuracy.toFixed(2);
    
    const textAccuracy = documentDetails?.segmentation_output?.confidence_scores?.document_scores?.layout_score || 0;
    const formattedTextAccuracy = textAccuracy < 1 ? (textAccuracy * 100).toFixed(2) : textAccuracy.toFixed(2);
    
    const extAccuracy = selectedDocument.extractionAccuracy || 0;
    const formattedExtAccuracy = extAccuracy < 1 ? (extAccuracy * 100).toFixed(2) : extAccuracy.toFixed(2);

    const totalPages = documentDetails?.segmentation_output?.metadata?.num_pages || 1;

    const summary = documentDetails?.document_summary || 
      `This document "${selectedDocument.name}" has been processed.`;

    const extractedText = documentDetails?.segmentation_output?.metadata?.additional_info?.markdown || 
      documentDetails?.segmentation_output?.extracted_text || '';

    const tablesData = documentDetails?.segmentation_output?.tables_data || [];

    const entities = documentDetails?.entities || 
                     documentDetails?.segmentation_output?.entities || 
                     documentDetails?.named_entities || 
                     [];

    return {
      title: selectedDocument.name || 'Untitled Document',
      segmentationAccuracy: parseFloat(formattedSegAccuracy),
      confidenceScore: parseFloat(formattedExtAccuracy),
      totalPages: totalPages,
      summary: summary,
      extractedText: extractedText,
      textAccuracy: parseFloat(formattedTextAccuracy),
      tablesData: tablesData,
      entities: entities,
      extractedFields: [
        { label: 'Document Type', value: selectedDocument.fileType || 'PDF' },
        { label: 'Status', value: selectedDocument.status || 'Unknown' },
        { label: 'Upload Time', value: selectedDocument.uploadTime || 'N/A' },
        { label: 'Document ID', value: selectedDocument.documentId || 'N/A' },
      ]
    };
  };

  // --- RENDER: RESULTS PAGE ---
  if (currentPage === 'results') {
    return (
      <div className="app">
        {/* Header */}
        <header className="header">
          <h1>Dhira | IndiaAI IDP Platform</h1>
          <div className="step-nav">
            <button className="step-btn" onClick={handleBackToListing}>1. Data Listing</button>
            <ArrowRight size={16} className="arrow-icon" />
            <button className="step-btn" onClick={handleBackToSegmentation}>2. Segmentation</button>
            <ArrowRight size={16} className="arrow-icon" />
            <button className="step-btn active">3. Results</button>
          </div>
        </header>

        <main className="results-main">
          <button className="back-btn" onClick={handleBackToSegmentation} style={{marginBottom: '20px'}}>
            <ArrowLeft size={16} />
            Back to Segmentation
          </button>

          <div className="results-header">
            <h2>Document Search</h2>
            <p>Search across all processed documents and sections</p>
          </div>

          <div className="results-search-container">
            <div className="search-input-wrapper" style={{width: '100%'}}>
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="खोजें / Search documents..."
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && performGlobalSearch()}
                className="search-input"
              />
            </div>
            <button className="mic-btn">
              <Mic className="mic-icon" />
            </button>
            <button className="search-btn" onClick={performGlobalSearch}>
              {isSearching ? '...' : 'Search'}
            </button>
          </div>

          {/* Results List */}
          <div className="search-results-list">
            {!hasSearched && !isSearching ? (
              <div className="empty-search-state">
                <FileText size={64} className="empty-search-icon" strokeWidth={1} />
                <p>Enter a keyword to search across all processed documents.</p>
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((result) => (
                <div key={result.document_id} className="search-result-card">
                  <div className="result-card-header">
                    <div className="result-doc-info">
                      <div className="result-doc-icon">
                        <FileText size={24} />
                      </div>
                      <div className="result-doc-meta">
                        <h4>{result.document_name}</h4>
                        <span className="meta-subtitle">Certificate : Title/Name</span>
                        <span className="meta-time">
                          Time Uploaded: {new Date(result.created_timestamp).toLocaleString()}
                        </span>
                        <span className="meta-time">
                          Processed on: {new Date(result.created_timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="result-accuracy">
                      Accuracy 97%
                    </div>
                  </div>

                  <span className="result-section-label">
                    Result Context (Summary):
                  </span>
                  
                  <div className="result-snippet">
                    <HighlightedText 
                      text={result.document_summary || "No summary available."} 
                      highlight={globalSearchQuery} 
                    />
                  </div>

                  <button 
                    className="copy-result-btn"
                    onClick={() => navigator.clipboard.writeText(result.document_summary)}
                  >
                    <Copy size={14} /> Copy Text
                  </button>
                </div>
              ))
            ) : (
              <div className="empty-search-state">
                <p>No results found for "{globalSearchQuery}"</p>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // --- RENDER: SEGMENTATION PAGE ---
  if (currentPage === 'segmentation') {
    const docData = getDocumentData();
    
    return (
      <div className="app">
        <header className="header">
          <h1>Dhira | IndiaAI IDP Platform</h1>
          <div className="step-nav">
            <button className="step-btn" onClick={handleBackToListing}>1. Data Listing</button>
            <ArrowRight size={16} className="arrow-icon" />
            <button className="step-btn active">2. Segmentation</button>
            <ArrowRight size={16} className="arrow-icon" />
            <button className="step-btn inactive" onClick={handleGoToResults}>3. Results</button>
          </div>
        </header>

        <main className="segmentation-content">
          <div className="segmentation-topbar">
            <button className="back-btn" onClick={handleBackToListing}>
              <ArrowLeft size={16} />
              Back to Landing Page
            </button>
            
            <div className="search-container">
              <div className="search-input-wrapper">
                <Search className="search-icon" />
                <input
                  type="text"
                  placeholder="खोजें /Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
              <button className="mic-btn">
                <Mic className="mic-icon" />
              </button>
              <button className="search-btn">Search</button>
            </div>

            <div className="segmentation-tabs">
              {['Summary', 'Text', 'Tables', 'Entities'].map(tab => (
                <button
                  key={tab}
                  className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="segmentation-main">
            {/* Left Panel - Document Preview */}
            <div className="document-preview-panel">
              <div className="doc-title-section">
                <h2>Document Title : {docData.title}</h2>
                <p className="seg-accuracy">Segmentation Accuracy <span>{docData.segmentationAccuracy}%</span></p>
              </div>
              
              <div className="source-doc-header">
                <span>Source Document</span>
                <div className="zoom-controls">
                  <button onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}><ZoomOut size={16} /></button>
                  <span>{zoomLevel}%</span>
                  <button onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))}><ZoomIn size={16} /></button>
                  <button><RotateCw size={16} /></button>
                </div>
              </div>

              <div className="document-preview-area">
                {(() => {
                  const docName = selectedDocument?.name || '';
                  const isImage = /\.(jpg|jpeg|png|gif|bmp|tiff|tif|webp)$/i.test(docName);
                  if (isImage) {
                    const imagePath = `/${docName}`;
                    return (
                      <div className="image-preview-container">
                        <img 
                          src={imagePath}
                          alt={docName}
                          className="document-image"
                          style={{
                            transform: `scale(${zoomLevel / 100})`,
                            transformOrigin: 'center center'
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const placeholder = e.target.parentElement.querySelector('.doc-placeholder');
                            if (placeholder) placeholder.style.display = 'flex';
                          }}
                        />
                        <div className="doc-placeholder" style={{ display: 'none' }}>
                          <FileText size={64} strokeWidth={1} />
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="doc-placeholder">
                      <FileText size={64} strokeWidth={1} />
                      {docName && <p style={{ marginTop: '1rem', color: '#718096' }}>{docName}</p>}
                    </div>
                  );
                })()}
              </div>

              <div className="page-navigation">
                <button 
                  className="page-nav-btn"
                  onClick={() => setCurrentDocPage(Math.max(1, currentDocPage - 1))}
                  disabled={currentDocPage === 1}
                >
                  Previous Page
                </button>
                <span>Page {currentDocPage} of {docData.totalPages}</span>
                <button 
                  className="page-nav-btn"
                  onClick={() => setCurrentDocPage(Math.min(docData.totalPages, currentDocPage + 1))}
                  disabled={currentDocPage === docData.totalPages}
                >
                  Next Page
                </button>
              </div>
            </div>

            {/* Right Panel - Tab Content */}
            <div className="extraction-panel">
              {isLoadingDetails ? (
                <div className="loading-state"><p>Loading document details...</p></div>
              ) : (
                <>
                  {activeTab === 'Summary' && (
                    <div className="ai-summary-card">
                      <div className="summary-header">
                        <h3>AI Generated Summary</h3>
                        <button className="copy-btn" onClick={() => navigator.clipboard.writeText(docData.summary)}>
                          <Copy size={14} /> Copy
                        </button>
                      </div>
                      <p className="confidence-score">Confidence Score <span>{docData.confidenceScore}%</span></p>
                      <div className="summary-text markdown-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{docData.summary}</ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {activeTab === 'Text' && (
                    <div className="text-content-card">
                      <div className="text-header">
                        <div className="text-accuracy">
                          <span>Text Accuracy</span>
                          <span className="accuracy-value">{docData.textAccuracy}%</span>
                        </div>
                        <button className="copy-btn" onClick={() => navigator.clipboard.writeText(docData.extractedText)}>
                          <Copy size={14} /> Copy
                        </button>
                      </div>
                      <div className="extracted-text-content markdown-content">
                        {docData.extractedText ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{docData.extractedText}</ReactMarkdown> : <p style={{ color: '#718096' }}>No text extracted yet.</p>}
                      </div>
                    </div>
                  )}

                  {activeTab === 'Tables' && (
                    <div className="tables-content-card">
                      <h3>Tables</h3>
                      {docData.tablesData && docData.tablesData.length > 0 ? (
                        <div className="tables-container">
                          {docData.tablesData.map((table, tableIndex) => {
                            const headers = table.data && table.data.length > 0 ? Object.keys(table.data[0]) : [];
                            return (
                              <div key={tableIndex} className="table-wrapper">
                                <div className="table-header-info">
                                  <span className="table-number">Table {tableIndex + 1}</span>
                                  {table.confidence && <span className="table-confidence">Confidence: {(table.confidence * 100).toFixed(2)}%</span>}
                                </div>
                                {headers.length > 0 && (
                                  <table className="data-table">
                                    <thead><tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
                                    <tbody>
                                      {table.data.map((row, rI) => (
                                        <tr key={rI}>{headers.map((h, cI) => <td key={cI}>{row[h]}</td>)}</tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : <p style={{ color: '#718096' }}>No tables found.</p>}
                    </div>
                  )}

                  {activeTab === 'Entities' && (
                    <div className="entities-content-card">
                      <div className="entities-header">
                        <h3>Named entities recognized</h3>
                        <button className="copy-btn" onClick={() => {
                          const t = docData.entities.map(e => `${e.type}: ${e.value}`).join('\n');
                          navigator.clipboard.writeText(t);
                        }}><Copy size={14} /> Copy</button>
                      </div>
                      {docData.entities && docData.entities.length > 0 ? (
                        <>
                          <div className="entity-count-summary">
                            {Object.entries(countEntitiesByType(docData.entities)).map(([type, count]) => (
                              <span key={type} className="entity-count-badge">{type}: {count} x</span>
                            ))}
                          </div>
                          <div className="entities-list">
                            {docData.entities.map((entity, index) => {
                              const EntityIcon = getEntityIcon(entity.type || entity.entity_type);
                              return (
                                <div key={index} className="entity-card">
                                  <div className="entity-icon-wrapper"><EntityIcon size={20} /></div>
                                  <div className="entity-content">
                                    <div className="entity-type">{entity.type || entity.entity_type}</div>
                                    <div className="entity-value">{entity.value || entity.text}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      ) : <p style={{ color: '#718096' }}>No entities found.</p>}
                    </div>
                  )}

                  {activeTab === 'Summary' && (
                    <>
                      <div className="extracted-fields-card">
                        <h3>Key Extracted Fields</h3>
                        <div className="fields-list">
                          {docData.extractedFields.map((field, i) => (
                            <div key={i} className="field-row">
                              <span className="field-label">{field.label}</span>
                              <span className="field-value">{field.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Search Results Button triggering the new page */}
                      <button className="search-results-btn" onClick={handleGoToResults}>
                        Search Results
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- RENDER: LISTING PAGE (Default) ---
  return (
    <div className="app">
      <header className="header">
        <h1>Dhira | IndiaAI IDP Platform</h1>
        <div className="step-nav">
          <button className="step-btn active">1. Data Listing</button>
          <ArrowRight size={16} className="arrow-icon" />
          <button className="step-btn current" onClick={handleSegmentationClick}>2. Segmentation</button>
          <ArrowRight size={16} className="arrow-icon" />
          <button className="step-btn inactive" onClick={handleGoToResults}>3. Results</button>
        </div>
      </header>

      <main className="main-content">
        {/* Upload Area */}
        <div
          className={`upload-area ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="upload-content">
            <Upload className="upload-icon" strokeWidth={1.5} />
            <p className="upload-text">Drag your documents here or click to upload</p>
            <button onClick={handleBrowseClick} className="browse-btn">Browse Files</button>
            <p className="file-types">PDF, JPG, JPEG, PNG, TIFF</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* Document Listing Section */}
        <div className="document-section">
          <div className="document-list">
            <div className="document-header">
              <h2>Document Listing</h2>
              {documents.length > 0 && (
                <button className="delete-all-btn" onClick={handleDeleteAll}>Delete all</button>
              )}
              <div className="search-container">
                <div className="search-input-wrapper">
                  <Search className="search-icon" />
                  <input
                    type="text"
                    placeholder="खोजें /Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                </div>
                <button className="mic-btn"><Mic className="mic-icon" /></button>
                <button className="search-btn">Search</button>
              </div>
            </div>

            {documents.length === 0 ? (
              <div className="empty-state">
                <FileText className="empty-icon" strokeWidth={1} />
                <p className="empty-text">No Files Added Yet</p>
              </div>
            ) : (
              <div className="documents-container">
                {documents.map(doc => (
                  <div 
                    key={doc.id} 
                    className="document-card"
                    onClick={() => handleDocumentClick(doc)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="doc-info-row">
                      <div className="doc-icon"><FileText size={24} /></div>
                      <div className="doc-details">
                        <a href="#" className="doc-name" onClick={(e) => { e.preventDefault(); handleDocumentClick(doc); }}>
                          {doc.name}
                        </a>
                        <div className="doc-meta">
                          <span>{doc.size}</span>
                          <span>Time Uploaded :  {doc.uploadTime}</span>
                        </div>
                      </div>
                      <button 
                        className="doc-delete-btn"
                        onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc.id); }}
                      >
                        <X size={14} />
                      </button>
                      <div className={`doc-status ${doc.status.toLowerCase()}`}>
                        <span className="status-dot"></span>
                        {doc.status}
                      </div>
                      <div className="doc-accuracy">
                        <span>Extraction Accuracy : </span>
                        <span className="accuracy-value">{doc.extractionAccuracy.toFixed(2)}%</span>
                      </div>
                      <div className="doc-accuracy">
                        <span>Segmentation Accuracy : </span>
                        <span className="accuracy-value">{doc.segmentationAccuracy.toFixed(2)}%</span>
                      </div>
                    </div>
                    <div className="doc-progress-row">
                      <span className="progress-percent">{Math.round(doc.progress)}%</span>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${doc.progress}%` }}></div>
                      </div>
                    </div>
                    <div className="doc-progress-time">{getProgressTime(doc.progress)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stats Panel */}
          <div className="stats-panel">
            {documents.length === 0 ? (
              <h3>Upload documents to begin extraction and segmentation</h3>
            ) : (
              <>
                <div className="overall-progress">
                  <span className="progress-label">Overall Progress : </span>
                  <span className="progress-status extracting">Extracting</span>
                </div>
                <div className="progress-bar-container">
                  <span className="progress-percent-small">{overallExtractionProgress}%</span>
                  <div className="progress-bar small">
                    <div className="progress-fill green" style={{ width: `${overallExtractionProgress}%` }}></div>
                  </div>
                </div>

                <div className="overall-progress">
                  <span className="progress-label">Overall Progress : </span>
                  <span className="progress-status segmenting">Segmenting</span>
                </div>
                <div className="progress-bar-container">
                  <span className="progress-percent-small">{overallSegmentationProgress}%</span>
                  <div className="progress-bar small">
                    <div className="progress-fill blue" style={{ width: `${overallSegmentationProgress}%` }}></div>
                  </div>
                </div>
              </>
            )}
            <div className="stat-item">
              <span className="stat-label">Total Documents : </span>
              <span>{totalDocs}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Newly Added Documents : </span>
              <span>{newlyAddedDocs}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;