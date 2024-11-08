const { google } = require('googleapis');
const credentials = require('./config/ google_credentials.json'); // Fixed the path
const fs = require('fs');
const axios = require('axios'); // Importing axios
const csv = require('csv-parser'); // Importing csv-parser for reading CSV files
const moment = require('moment'); // Importing moment.js for date formatting

// Authorize and create a client
const auth = new google.auth.GoogleAuth({
  credentials: credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

// Fetch barcodes from Google Sheets
async function getGoogleSheetsData() {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  // Replace with your actual spreadsheet ID and range (Barcodes in column B)
  const spreadsheetId = '1JX4rK_g6NoZECgES6oeYi71dlpIwmWAOtCpUVFq--Qk';
  const range = 'Barcode!B:B';  // Modify this to column B (Barcodes)

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: range,
  });

  const barcodes = response.data.values.flat(); // Flattening the array to get barcodes as a single array
  console.log('Barcodes:', barcodes);

  return barcodes;
}

// Fetch product name by barcode from sales.csv
async function getProductNameByBarcode(barcode) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream('sales.csv')
      .pipe(csv())
      .on('data', (data) => {
        if (data.product_barcode === barcode) {
          results.push(data.product_name);
        }
      })
      .on('end', () => {
        // Resolve with the first found product name or undefined if not found
        resolve(results.length > 0 ? results[0] : undefined);
      })
      .on('error', (error) => {
        console.error(`Error reading sales.csv: ${error}`);
        reject(error);
      });
  });
}

// Fetch the total sales data for a barcode
async function getTotalOfEachBarCode(barcode) {
  try {
    const response = await axios.get(`https://khazana.apnimandi.us/api_priya/search?query=${barcode}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = response.data;

    // Process the sales data (assuming it follows the same structure)
    const maxValuesObject = await processSalesData(data);

    let maxValues = {
      sunnyvale: maxValuesObject.sunnyvale.maxQuantity,
      fremont: maxValuesObject.fremont.maxQuantity,
      milpitas: maxValuesObject.milpitas.maxQuantity,
      karthik: maxValuesObject.karthik.maxQuantity
    };

    let total = maxValues.karthik + maxValues.fremont + maxValues.sunnyvale + maxValues.milpitas;
    return total;
  } catch (error) {
    console.error(`Error fetching total for barcode ${barcode}:`, error);
    return 0; // Default to 0 if there is an error or no data
  }
}

// Process sales data and return the max quantity for each establishment
function processSalesData(data) {
  // Initialize max values for each establishment
  const maxValues = {
    sunnyvale: { maxQuantity: 0 },
    fremont: { maxQuantity: 0 },
    milpitas: { maxQuantity: 0 },
    karthik: { maxQuantity: 0 }
  };

  data.forEach(entry => {
    // Get establishment ID in lowercase
    const establishment = entry.establishment.toLowerCase();
    // Extract numeric values from the strings
    const quantitySold = parseFloat(entry.quantity_sold.replace(" lb", ""));
    // Update max quantity
    if (quantitySold > maxValues[establishment].maxQuantity) {
      maxValues[establishment].maxQuantity = quantitySold;
    }
  });

  return maxValues;
}

// Write barcodes and totals to output.csv
async function generateCSV() {
  const barcodes = await getGoogleSheetsData();

  // Create a write stream for the CSV file
  const writeStream = fs.createWriteStream('output.csv');
  writeStream.write('Purchase Order Number,Barcode,Product Name,Date,Total\n'); // Write the header

  let purchaseOrderNumber = 1; // Initialize Purchase Order Number

  // Process each barcode
  for (const barcode of barcodes) {
    const total = await getTotalOfEachBarCode(barcode);
    const productName = await getProductNameByBarcode(barcode);
    const date = moment().format('YYYY-MM-DD'); // Get today's date in YYYY-MM-DD format
    writeStream.write(`${purchaseOrderNumber},${barcode},${productName || 'Not Found'},${date},${total}\n`); // Write to CSV
    console.log(`Processed Barcode: ${barcode}, Product Name: ${productName || 'Not Found'}, Total: ${total}`);
    purchaseOrderNumber++; // Increment Purchase Order Number
  }

  writeStream.end(); // End the stream
  console.log('CSV file has been created successfully.');
}

// Run the function to generate CSV
generateCSV().catch(console.error);
