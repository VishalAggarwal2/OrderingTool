const { google } = require('googleapis');
const credentials = require('./config/ google_credentials.json');
const nodemailer = require('nodemailer'); // Importing Nodemailer
const fs = require('fs');
const cron = require('node-cron'); // Importing node-cron

// Authorize and create a client
const auth = new google.auth.GoogleAuth({
  credentials: credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

// Fetch emails from Google Sheets
async function getEmailsFromSheet() {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  const spreadsheetId = '1JX4rK_g6NoZECgES6oeYi71dlpIwmWAOtCpUVFq--Qk';
  const range = 'Mail!A:A';  // Modify this to the column that contains the emails

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: range,
  });

  const emails = response.data.values.flat(); // Flattening the array to get emails as a single array
  console.log('Emails:', emails);

  return emails;
}

// Function to send email with the CSV attachment
async function sendEmailWithCSV(emails) {
  // Create a transporter using SMTP (configure with your email service)
  const transporter = nodemailer.createTransport({
    service: 'gmail', // For example, using Gmail
    auth: {
      user: 'itapnimandi@gmail.com', // Your email
      pass: 'lurr ufdc iofn zdbn', // Your email password or app-specific password
    },
  });

  // Path to the CSV file
  const csvFilePath = 'output.csv';

  // Set up email options
  const mailOptions = {
    from: 'itapnimandi@gmail.com', // Sender's email
    to: emails.join(','), // Join all emails to send to multiple recipients
    subject: 'CSV Report',
    text: 'Please find the attached CSV report.',
    attachments: [
      {
        path: csvFilePath, // Path to the CSV file
      },
    ],
  };

  // Send the email
  await transporter.sendMail(mailOptions);
  console.log('Email sent successfully to:', emails);
}

// Main function to run the tasks
async function main() {
  try {
    const emails = await getEmailsFromSheet();
    await sendEmailWithCSV(emails);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Schedule the job to run every day at 12:00 AM
cron.schedule('0 0 * * *', () => {
  console.log('Running the scheduled task at 12:00 AM...');
  main();
});

// Execute the main function immediately (optional)
main();
