import os
import pandas as pd
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication  # Importing MIMEApplication
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from apscheduler.schedulers.blocking import BlockingScheduler

# Load credentials
SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']
SERVICE_ACCOUNT_FILE = './config/ google_credentials.json'

credentials = Credentials.from_service_account_file(
    SERVICE_ACCOUNT_FILE, scopes=SCOPES)

# Fetch emails from Google Sheets
def get_emails_from_sheet():
    service = build('sheets', 'v4', credentials=credentials)

    spreadsheet_id = '1JX4rK_g6NoZECgES6oeYi71dlpIwmWAOtCpUVFq--Qk'
    range_name = 'Mail!A:A'  # Modify this to the column that contains the emails

    # Call the Sheets API
    result = service.spreadsheets().values().get(
        spreadsheetId=spreadsheet_id,
        range=range_name).execute()
    
    emails = result.get('values', [])
    emails = [email[0] for email in emails]  # Flatten the list to get emails as a single list

    print('Emails:', emails)
    return emails

# Function to send email with the CSV attachment
def send_email_with_csv(emails):
    # Create the email
    sender_email = 'itapnimandi@gmail.com'
    sender_password = 'lurr ufdc iofn zdbn'  # Your email password or app-specific password
    csv_file_path = 'output.csv'

    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = ', '.join(emails)
    msg['Subject'] = 'CSV Report'
    
    # Email body
    body = 'Please find the attached CSV report.'
    msg.attach(MIMEText(body, 'plain'))

    # Attach the CSV file
    with open(csv_file_path, 'rb') as attachment:
        part = MIMEApplication(attachment.read(), Name=os.path.basename(csv_file_path))
        part['Content-Disposition'] = f'attachment; filename="{os.path.basename(csv_file_path)}"'
        msg.attach(part)

    # Send the email
    with smtplib.SMTP('smtp.gmail.com', 587) as server:
        server.starttls()
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, emails, msg.as_string())
    
    print('Email sent successfully to:', emails)

# Main function to run the tasks
def main():
    print("start")
    try:
        emails = get_emails_from_sheet()
        send_email_with_csv(emails)
    except Exception as e:
        print('Error:', e)

# Schedule the job to run every day at 12:00 AM
scheduler = BlockingScheduler()
scheduler.add_job(main, 'cron', hour=0, minute=0)

# Start the scheduler
scheduler.start()

# Execute the main function immediately (optional)
main()
