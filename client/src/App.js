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
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/files');
      setFiles(response.data);
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleFileSelect = async (e) => {
    const fileName = e.target.value;
    setSelectedFile(fileName);
    if (fileName) {
      try {
        const response = await axios.get(`http://localhost:3001/api/data?file=${fileName}`);
        setData(response.data);
      } catch (error) {
        console.error('Error fetching data for file:', error);
      }
    } else {
      setData([]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post('http://localhost:3001/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setFile(null);
      fetchFiles(); // Refresh the list of files
    } catch (error) {
      setError(error.response?.data?.error || 'Error uploading file');
    } finally {
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
            <table>
              <thead>
                <tr>
                  <th>Pump Type</th>
                  <th>Pump Model</th>
                  <th>Speed</th>
                  <th>Impeller Diameter</th>
                  <th>Operating Point</th>
                  <th>Flow Rate</th>
                  <th>Head</th>
                  <th>Efficiency</th>
                  <th>Power</th>
                  <th>NPSHR</th>
                  <th>Supplier</th>
                  <th>Pump Application</th>
                  <th>Pump Range</th>
                  <th>Impeller Type</th>
                  <th>BEP Flow Std</th>
                  <th>BEP Head Std</th>
                  <th>Min Speed</th>
                  <th>Max Speed</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr key={index}>
                    <td>{row.pump_type}</td>
                    <td>{row.pump_model}</td>
                    <td>{row.speed}</td>
                    <td>{row.imp_dia}</td>
                    <td>{row.operating_point}</td>
                    <td>{row.flow_rate}</td>
                    <td>{row.head}</td>
                    <td>{row.efficiency}</td>
                    <td>{row.power}</td>
                    <td>{row.npshr}</td>
                    <td>{row.supplier}</td>
                    <td>{row.pump_application}</td>
                    <td>{row.pump_range}</td>
                    <td>{row.impeller_type}</td>
                    <td>{row.bep_flow_std}</td>
                    <td>{row.bep_head_std}</td>
                    <td>{row.min_speed}</td>
                    <td>{row.max_speed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
