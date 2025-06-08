# Pump Performance ETL Application

A full-stack web application for ETL (Extract, Transform, Load) data processing of pump performance data, utilizing React for the frontend and Node.js for the backend. The application uses Gemini AI for data transformation and PostgreSQL for data storage.

## Project Structure

```
pump-performance-etl/
├── client/                 # React frontend
│   ├── public/            # Static files
│   └── src/               # React source code
├── server/                # Node.js backend
│   ├── server.js         # Main server file
│   └── .env              # Environment variables
├── package.json          # Root package.json
└── README.md            # This file
```

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL
- Google Cloud account (for Gemini AI API)

## Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd pump-performance-etl
   ```

2. Install dependencies:
   ```bash
   npm run install-all
   ```

3. Set up environment variables:
   - Copy `.env.example` to `server/.env`
   - Update the variables with your configuration:
     ```
     PORT=3001
     DB_USER=your_db_user
     DB_PASSWORD=your_db_password
     DB_HOST=localhost
     DB_PORT=5432
     DB_NAME=your_db_name
     GEMINI_API_KEY=your_gemini_api_key
     ```

4. Set up the database:
   ```sql
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
   ```

## Running the Application

1. Start both frontend and backend in development mode:
   ```bash
   npm run dev
   ```

2. Or run them separately:
   ```bash
   # Terminal 1 - Backend
   npm run server

   # Terminal 2 - Frontend
   npm run client
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Features

- File upload and processing
- AI-powered data transformation
- Data visualization
- File history tracking
- Grouped data display by impeller diameter
- Summary statistics

## API Endpoints

- `POST /api/upload` - Upload and process a file
- `GET /api/files` - Get list of uploaded files
- `GET /api/data?file=<filename>` - Get data for a specific file

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.
