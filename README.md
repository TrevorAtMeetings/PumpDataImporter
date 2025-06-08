# Pump Performance Data Import ETL

A full-stack web application for importing and transforming pump performance data using AI (Gemini AI) to automatically convert data into SQL format.

## Features

- File upload support for TXT, JSON, and CSV files
- AI-powered data transformation using Google's Gemini AI
- Automatic SQL table population
- Data visualization and management
- Delete functionality for imported records

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database
- Google Gemini AI API key

## Setup

1. Clone the repository
2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Install frontend dependencies:
   ```bash
   cd client
   npm install
   ```

4. Create a `.env` file in the root directory with the following content:
   ```
   DATABASE_URL=postgresql://myuser:mypassword@localhost:5432/data_imported
   GEMINI_API_KEY=your_gemini_api_key
   PORT=5000
   ```

5. Create the database and table:
   ```sql
   CREATE DATABASE data_imported;
   
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
       npshr NUMERIC
   );
   ```

## Running the Application

1. Start the backend server:
   ```bash
   npm run dev
   ```

2. In a new terminal, start the frontend:
   ```bash
   cd client
   npm start
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Click the "Choose File" button to select a TXT, JSON, or CSV file containing pump performance data
2. Click "Upload File" to process the data
3. The AI will automatically transform the data and insert it into the database
4. View the imported data in the table below
5. Use the delete button to remove any unwanted records

## Error Handling

- The application includes error handling for file uploads and data processing
- Invalid files will be rejected with appropriate error messages
- Database errors are caught and displayed to the user

## Security

- API keys are stored in environment variables
- File uploads are validated before processing
- SQL injection prevention through parameterized queries 