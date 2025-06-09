import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const apiPort = process.env.REACT_APP_API_PORT || '3005';
const apiUrl = `http://localhost:${apiPort}`;

function App() {
  const [filesToUpload, setFilesToUpload] = useState([]); // Array of files
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadStatus, setUploadStatus] = useState([]); // Array of {name, status}
  const [uploadHistory, setUploadHistory] = useState([]); // For last 10 files

  useEffect(() => {
    console.log('App mounted, fetching files...');
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    console.log('Fetching files from server...');
    try {
      const response = await axios.get(`${apiUrl}/api/files`);
      console.log('Files fetched successfully:', response.data);
      setFiles(response.data);
    } catch (error) {
      console.error('Error fetching files:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
    }
  };

  const handleFileChange = (e) => {
    const filesArr = Array.from(e.target.files);
    setFilesToUpload(filesArr);
    setUploadSuccess(false);
    // Add selected files to the top of the uploadHistory with status 'none', keeping only last 10
    const newFiles = filesArr.map(f => ({ name: f.name, status: 'none' }));
    const updatedHistory = [...newFiles, ...uploadHistory].slice(0, 10);
    setUploadStatus(newFiles);
    setUploadHistory(updatedHistory);
  };

  const handleFileSelect = async (e) => {
    const fileName = e.target.value;
    console.log('File selected from dropdown:', fileName);
    setSelectedFile(fileName);
    if (fileName) {
      try {
        console.log('Fetching data for file:', fileName);
        const response = await axios.get(`${apiUrl}/api/data?file=${fileName}`);
        console.log('Data fetched successfully:', response.data);
        setData(response.data);
      } catch (error) {
        console.error('Error fetching data for file:', error);
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
      }
    } else {
      console.log('No file selected, clearing data');
      setData([]);
    }
  };

  const handleUpload = async () => {
    if (!filesToUpload.length) {
      setError('Please select at least one file');
      return;
    }
    setLoading(true);
    setError(null);
    setUploadSuccess(false);
    // Update status to pending for selected files
    let statuses = filesToUpload.map(f => ({ name: f.name, status: 'pending' }));
    setUploadStatus(statuses);
    let allSuccess = true;
    let newHistory = [...uploadHistory];
    // Update the top N files in uploadHistory to pending
    for (let i = 0; i < filesToUpload.length; i++) {
      if (newHistory[i] && newHistory[i].name === filesToUpload[i].name) {
        newHistory[i].status = 'pending';
      }
    }
    setUploadHistory([...newHistory]);
    for (let i = 0; i < filesToUpload.length; i++) {
      const formData = new FormData();
      formData.append('file', filesToUpload[i]);
      try {
        await axios.post(`${apiUrl}/api/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        statuses[i].status = 'success';
        if (newHistory[i] && newHistory[i].name === filesToUpload[i].name) {
          newHistory[i].status = 'success';
        }
      } catch (error) {
        statuses[i].status = 'error';
        allSuccess = false;
        setError(error.response?.data?.error || `Error uploading file: ${filesToUpload[i].name}`);
        if (newHistory[i] && newHistory[i].name === filesToUpload[i].name) {
          newHistory[i].status = 'error';
        }
      }
      setUploadStatus([...statuses]);
      setUploadHistory([...newHistory]);
    }
    setFilesToUpload([]);
    setUploadSuccess(allSuccess);
    setUploadHistory(newHistory.slice(0, 10)); // Keep only last 10
    fetchFiles();
    setLoading(false);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Pump Performance Data Loader</h1>
      </header>
      <div className="main-flex-layout">
        <main className="main-content-area">
          <div className="file-selector">
            <select value={selectedFile} onChange={handleFileSelect}>
              <option value="">Select a file</option>
              {files.filter(fileName => fileName).map((fileName) => (
                <option key={fileName} value={fileName}>
                  {fileName}
                </option>
              ))}
            </select>
            {selectedFile && (
              <div className="selected-file">
                <span className="selected-file-label">Currently viewing:</span>
                <span className="selected-file-name">{selectedFile}</span>
              </div>
            )}
          </div>
          {data.length > 0 && (
            <div className="data-display">
              <h2>Data for {selectedFile}</h2>
              <div className="pump-summary">
                <h3>Pump Summary</h3>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span className="label">Pump Type:</span>
                    <span className="value">{data[0].pump_type}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Pump Model:</span>
                    <span className="value">{data[0].pump_model}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Speed:</span>
                    <span className="value">{data[0].speed}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Supplier:</span>
                    <span className="value">{data[0].supplier}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Pump Application:</span>
                    <span className="value">{data[0].pump_application}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Pump Range:</span>
                    <span className="value">{data[0].pump_range}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Impeller Type:</span>
                    <span className="value">{data[0].impeller_type}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">BEP Flow Std:</span>
                    <span className="value">{data[0].bep_flow_std}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">BEP Head Std:</span>
                    <span className="value">{data[0].bep_head_std}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Min Speed:</span>
                    <span className="value">{data[0].min_speed}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Max Speed:</span>
                    <span className="value">{data[0].max_speed}</span>
                  </div>
                </div>
              </div>
              {Object.entries(
                data.reduce((acc, row) => {
                  const impDia = row.imp_dia;
                  if (!acc[impDia]) {
                    acc[impDia] = [];
                  }
                  acc[impDia].push(row);
                  return acc;
                }, {})
              ).flatMap(([impDia, rows]) => {
                // Split rows into chunks of 7
                const chunkSize = 7;
                const chunks = [];
                for (let i = 0; i < rows.length; i += chunkSize) {
                  chunks.push(rows.slice(i, i + chunkSize));
                }
                const attributes = [
                  { label: 'Flow Rate', key: 'flow_rate', unit: 'm³/hr' },
                  { label: 'Head', key: 'head', unit: 'm' },
                  { label: 'Efficiency', key: 'efficiency', unit: '%' },
                  { label: 'Power', key: 'power', unit: 'kW' },
                  { label: 'NPSH', key: 'npshr', unit: 'm' },
                ];
                return chunks.map((chunk, chunkIdx) => (
                  <div key={impDia + '-' + chunkIdx} className="impeller-section">
                    <div className="matrix-table-container">
                      <table className="matrix-table">
                        <tbody>
                          {attributes.map((attr, attrIdx) => (
                            <tr key={attr.key}>
                              <td>{attr.label}</td>
                              <td>{attr.unit}</td>
                              {chunk.map((row, idx) => (
                                <td key={idx}>{row[attr.key]}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ));
              })}
            </div>
          )}
        </main>
        <aside className="upload-sidebar">
          <div className="upload-sidebar-inner">
            <div className="file-input-group upload-sidebar-controls">
              <input
                type="file"
                multiple
                id="custom-file-input"
                className="custom-file-input"
                onChange={handleFileChange}
              />
              <label htmlFor="custom-file-input" className="custom-file-label btn-same">
                Choose File
              </label>
              <button onClick={handleUpload} disabled={!filesToUpload.length || loading} className="btn-same upload-sidebar-btn">
                {loading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
            <div className="upload-status-section upload-sidebar-status">
              <div className="upload-status-title">Last 10 Files</div>
              <div className="upload-status-table">
                <div className="upload-status-table-header">
                  <span className="upload-status-table-col upload-status-table-filename">File Name</span>
                  <span className="upload-status-table-col upload-status-table-status">Status</span>
                </div>
                {uploadHistory.length === 0 && (
                  <div className="upload-status-table-row">
                    <span className="upload-status-table-col upload-status-table-filename">No uploads yet</span>
                    <span className="upload-status-table-col upload-status-table-status"></span>
                  </div>
                )}
                {uploadHistory.map((fileStat, idx) => (
                  <div key={fileStat.name + idx} className="upload-status-table-row">
                    <span className="upload-status-table-col upload-status-table-filename">{fileStat.name}</span>
                    <span className={`upload-status-table-col upload-status-table-status status-${fileStat.status}`}>
                      {fileStat.status === 'none' && 'None'}
                      {fileStat.status === 'pending' && 'Pending...'}
                      {fileStat.status === 'success' && (
                        <span className="upload-tick" title="Upload successful">✔</span>
                      )}
                      {fileStat.status === 'error' && 'Error'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {error && <p className="error">{error}</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;
