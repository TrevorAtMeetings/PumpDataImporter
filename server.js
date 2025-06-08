require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Pool } = require('pg');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Initialize Gemini AI with logging
console.log('Initializing Gemini AI...');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY is not set in environment variables');
  process.exit(1);
}
console.log('GEMINI_API_KEY found in environment variables');

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
console.log('Gemini AI initialized successfully');

// File upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      console.log('No file uploaded in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File received:', {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    const fileContent = req.file.buffer.toString();
    const fileType = req.file.mimetype;

    // Initialize Gemini AI model
    console.log('Initializing Gemini AI model for file processing...');
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log('Gemini AI model initialized successfully');

    // Prepare prompt for AI transformation
    const prompt = `
      Transform this data into SQL INSERT statements for the pump_performance table.
      IMPORTANT: Return ONLY the raw SQL statements without any markdown formatting, code blocks, or additional text.
      
      Data to transform:
      ${fileContent}
      
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
          max_speed NUMERIC
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
      10. Format example:
          INSERT INTO pump_performance (pump_type, pump_model, speed, imp_dia, operating_point, flow_rate, head, efficiency, power, npshr, supplier, pump_application, pump_range, impeller_type, bep_flow_std, bep_head_std, min_speed, max_speed) 
          VALUES ('HSC', '6 K 6 VANE', '1460', '295.00', 1, 10, 26, 8.33, 5.2, 0, 'SupplierName', 'Water Supply', 'K', 'Closed Double Suction', 100, 50, 900, 1500);
    `;

    console.log('Sending data to Gemini AI for transformation...');
    // Get AI response
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let sqlStatements = response.text().replace(/```sql|```/g, '').trim();
    
    // Validate and clean SQL statements
    sqlStatements = sqlStatements
      .split(';')
      .filter(stmt => stmt.trim())
      .map(stmt => {
        // Validate the statement structure
        if (!stmt.toUpperCase().includes('INSERT INTO PUMP_PERFORMANCE')) {
          console.error('Invalid statement structure:', stmt);
          return null;
        }

        // Fix string values in the SQL statement
        return stmt
          .replace(/VALUES\s*\((.*?)\)/g, (match, values) => {
            // Split the values and process each one
            const processedValues = values.split(',').map(value => {
              value = value.trim();
              // If it's a string value (starts and ends with single quote)
              if (value.startsWith("'") && value.endsWith("'")) {
                // Remove existing quotes and escape single quotes
                value = value.slice(1, -1).replace(/'/g, "''");
                return `'${value}'`;
              }
              return value;
            });
            return `VALUES (${processedValues.join(', ')})`;
          })
          .trim();
      })
      .filter(stmt => stmt !== null) // Remove invalid statements
      .join(';\n') + ';';

    console.log('Received transformation from Gemini AI');
    console.log('First SQL statement for validation:', sqlStatements.split(';')[0]);

    // Execute SQL statements
    console.log('Executing SQL statements...');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const statements = sqlStatements.split(';').filter(stmt => stmt.trim());
      console.log(`Executing ${statements.length} SQL statements`);
      
      for (const stmt of statements) {
        if (stmt.trim()) {
          try {
            // Validate statement before execution
            if (!stmt.toUpperCase().includes('INSERT INTO PUMP_PERFORMANCE')) {
              console.error('Skipping invalid statement:', stmt);
              continue;
            }
            await client.query(stmt);
          } catch (err) {
            console.error('Error executing statement:', stmt);
            console.error('Error details:', err);
            throw err;
          }
        }
      }
      await client.query('COMMIT');
      console.log('SQL statements executed successfully');
      res.json({ message: 'Data imported successfully' });
    } catch (err) {
      console.error('Error executing SQL statements:', err);
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ error: 'Error processing file' });
  }
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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 