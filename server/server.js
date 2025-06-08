require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Pool } = require('pg');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Validate environment variables
console.log('=== Environment Variables Check ===');
console.log('Current directory:', __dirname);
console.log('PORT:', process.env.PORT);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not Set');
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Set' : 'Not Set');
console.log('================================');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Initialize database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to the database:', err.stack);
  } else {
    console.log('Successfully connected to database');
    release();
  }
});

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Test Gemini AI connection
async function testGeminiConnection() {
  try {
    console.log('Testing Gemini AI connection...');
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent('Test connection');
    console.log('Gemini AI connection successful');
    return true;
  } catch (error) {
    console.error('Gemini AI connection failed:', error.message);
    return false;
  }
}

// File upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  console.log('=== File Upload Request Received ===');
  try {
    if (!req.file) {
      console.log('No file uploaded in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File details:', {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      buffer: req.file.buffer ? 'Buffer present' : 'No buffer'
    });

    const fileContent = req.file.buffer.toString();
    console.log('File content length:', fileContent.length);
    console.log('First 100 characters of file:', fileContent.substring(0, 100));

    const fileType = req.file.mimetype;
    const fileName = req.file.originalname;

    // Initialize Gemini AI model
    console.log('Initializing Gemini AI model...');
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log('Gemini AI model initialized successfully');

    // Prepare prompt for AI transformation
    console.log('Preparing prompt for AI transformation...');
    const prompt = `
      Transform this data into SQL INSERT statements for the pump_performance table.
      IMPORTANT: Return ONLY the raw SQL statements without any markdown formatting, code blocks, or additional text.
      
      Data to transform:
      ${fileContent}
      
      IMPORTANT DATA MAPPING INSTRUCTIONS:
      - objPump.pM_IMP contains impeller diameters, separated by spaces.
      - For each impeller diameter, the corresponding values in objPump.pM_HEAD, objPump.pM_EFF, objPump.pM_NP, etc. are separated by a pipe (|).
      - For each impeller diameter group, the values are further separated by semicolons (;) for each operating point.
      - For example, the first group in objPump.pM_HEAD (before the first |) is for the first impeller diameter in objPump.pM_IMP, the second group is for the second impeller diameter, etc.
      - Each value in the group (split by ;) is for an operating point.
      - For each impeller diameter and each operating point, create a row in the SQL table with the correct values for head, efficiency, NPSH, etc.
      
      Table Structure:
      CREATE TABLE pump_performance (
          pump_id SERIAL PRIMARY KEY,
          pump_type VARCHAR(255),
          pump_model VARCHAR(255),
          speed VARCHAR(50),
          imp_dia VARCHAR(50),
          operating_point INTEGER,
          flow_rate NUMERIC,
          head NUMERIC,
          efficiency NUMERIC,
          power NUMERIC,
          npshr NUMERIC,
          supplier VARCHAR(255),
          pump_application VARCHAR(255),
          pump_range VARCHAR(255),
          impeller_type VARCHAR(255),
          bep_flow_std NUMERIC,
          bep_head_std NUMERIC,
          min_speed NUMERIC,
          max_speed NUMERIC,
          file_name VARCHAR(255)
      );
      
      Mapping from source data to SQL columns:
      - objPump.pFilter1 → supplier
      - objPump.pFilter2 → pump_application
      - objPump.pFilter4 → pump_range
      - objPump.pFilter6 → impeller_type
      - objPump.pBEPFlowStd → bep_flow_std
      - objPump.pBEPHeadStd → bep_head_std
      - objPump.pMinSpeed → min_speed
      - objPump.pMaxSpeed → max_speed
      
      Rules:
      1. Parse the data according to the schema above
      2. Generate valid SQL INSERT statements
      3. Handle multiple curves and operating points
      4. If a power value is present in the input data for an operating point, use it. If not, set power to 0.
      5. Return ONLY the SQL statements, one per line
      6. Do not include any markdown formatting or code blocks
      7. Each statement should end with a semicolon
      8. String values must be properly quoted with single quotes
      9. Escape any single quotes in string values with another single quote
      10. Include the file name '${fileName}' in the file_name column for all INSERT statements
      11. Format example:
          INSERT INTO pump_performance (pump_type, pump_model, speed, imp_dia, operating_point, flow_rate, head, efficiency, power, npshr, supplier, pump_application, pump_range, impeller_type, bep_flow_std, bep_head_std, min_speed, max_speed, file_name) 
          VALUES ('HSC', '6 K 6 VANE', '1460', '295.00', 1, 10, 26, 8.33, 5.2, 0, 'SupplierName', 'Water Supply', 'K', 'Closed Double Suction', 100, 50, 900, 1500, '${fileName}');
    `;

    console.log('Sending data to Gemini AI for transformation...');
    // Get AI response
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let sqlStatements = response.text().replace(/```sql|```/g, '').trim();
    
    console.log('Received transformation from Gemini AI');
    console.log('First SQL statement:', sqlStatements.split(';')[0]);

    // Execute SQL statements
    console.log('Connecting to database...');
    const client = await pool.connect();
    try {
      console.log('Starting database transaction...');
      await client.query('BEGIN');
      const statements = sqlStatements.split(';').filter(stmt => stmt.trim());
      console.log(`Executing ${statements.length} SQL statements`);
      
      for (const stmt of statements) {
        if (stmt.trim()) {
          try {
            console.log('Executing statement:', stmt.substring(0, 100) + '...');
            await client.query(stmt);
          } catch (err) {
            console.error('Error executing statement:', stmt);
            console.error('Error details:', err);
            throw err;
          }
        }
      }
      console.log('Committing transaction...');
      await client.query('COMMIT');
      console.log('SQL statements executed successfully');
      res.json({ message: 'Data imported successfully' });
    } catch (err) {
      console.error('Error in database transaction:', err);
      await client.query('ROLLBACK');
      throw err;
    } finally {
      console.log('Releasing database connection...');
      client.release();
    }
  } catch (error) {
    console.error('Error processing file:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Error processing file' });
  }
  console.log('=== File Upload Request Completed ===');
});

// Get pump performance data
app.get('/api/pump-performance', async (req, res) => {
  try {
    console.log('Fetching pump performance data...');
    const result = await pool.query('SELECT * FROM pump_performance ORDER BY pump_id');
    console.log(`Retrieved ${result.rows.length} records`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pump performance data:', error);
    res.status(500).json({ error: 'Error fetching data' });
  }
});

// Delete pump performance data
app.delete('/api/pump-performance/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Deleting pump performance record with ID: ${id}`);
    await pool.query('DELETE FROM pump_performance WHERE pump_id = $1', [id]);
    console.log('Record deleted successfully');
    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({ error: 'Error deleting record' });
  }
});

// New endpoint to fetch unique file names
app.get('/api/files', async (req, res) => {
  console.log('=== Fetching File Names ===');
  try {
    console.log('Querying database for unique file names...');
    const result = await pool.query('SELECT DISTINCT file_name FROM pump_performance ORDER BY file_name');
    console.log('Files found:', result.rows.map(row => row.file_name));
    res.json(result.rows.map(row => row.file_name));
  } catch (error) {
    console.error('Error fetching file names:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Error fetching file names' });
  }
  console.log('=== File Names Fetch Completed ===');
});

// Add endpoint to fetch data for a specific file
app.get('/api/data', async (req, res) => {
  console.log('=== Fetching Data for File ===');
  const fileName = req.query.file;
  console.log('Requested file:', fileName);
  
  try {
    console.log('Querying database for file data...');
    const result = await pool.query(
      'SELECT * FROM pump_performance WHERE file_name = $1 ORDER BY pump_id',
      [fileName]
    );
    console.log(`Found ${result.rows.length} records for file ${fileName}`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching file data:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Error fetching file data' });
  }
  console.log('=== File Data Fetch Completed ===');
});

// Start server
app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  // Test Gemini AI connection on startup
  const geminiConnected = await testGeminiConnection();
  if (!geminiConnected) {
    console.error('WARNING: Gemini AI is not properly configured. File uploads will fail.');
  }
}); 