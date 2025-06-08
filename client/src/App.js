import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');

  useEffect(() => {
    console.log('App mounted, fetching files...');
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    console.log('Fetching files from server...');
    try {
      const response = await axios.get('http://localhost:3001/api/files');
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
    console.log('File selected:', e.target.files[0]);
    setFile(e.target.files[0]);
  };

  const handleFileSelect = async (e) => {
    const fileName = e.target.value;
    console.log('File selected from dropdown:', fileName);
    setSelectedFile(fileName);
    if (fileName) {
      try {
        console.log('Fetching data for file:', fileName);
        const response = await axios.get(`http://localhost:3001/api/data?file=${fileName}`);
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
    console.log('Upload button clicked');
    if (!file) {
      console.log('No file selected');
      setError('Please select a file');
      return;
    }

    console.log('Starting file upload process...');
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    console.log('FormData created with file:', file.name);

    try {
      console.log('Sending upload request to server...');
      const response = await axios.post('http://localhost:3001/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('Upload successful:', response.data);
      setFile(null);
      console.log('Refreshing file list...');
      fetchFiles();
    } catch (error) {
      console.error('Error uploading file:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setError(error.response?.data?.error || 'Error uploading file');
    } finally {
      console.log('Upload process completed');
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Pump Performance Data Loader</h1>
        <div className="upload-section">
          <input type="file" onChange={handleFileChange} />
          <button onClick={handleUpload} disabled={loading}>
            {loading ? 'Uploading...' : 'Upload'}
          </button>
          {error && <p className="error">{error}</p>}
        </div>
        <div className="file-selector">
          <select value={selectedFile} onChange={handleFileSelect}>
            <option value="">Select a file</option>
            {files.map((fileName) => (
              <option key={fileName} value={fileName}>
                {fileName}
              </option>
            ))}
          </select>
        </div>
      </header>
      <main>
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
            ).map(([impDia, rows]) => (
              <div key={impDia} className="impeller-section">
                <h3>Impeller Diameter: {impDia}</h3>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Operating Point</th>
                        <th>Flow Rate</th>
                        <th>Head</th>
                        <th>Efficiency</th>
                        <th>Power</th>
                        <th>NPSHR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => (
                        <tr key={index}>
                          <td>{row.operating_point}</td>
                          <td>{row.flow_rate}</td>
                          <td>{row.head}</td>
                          <td>{row.efficiency}</td>
                          <td>{row.power}</td>
                          <td>{row.npshr}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
