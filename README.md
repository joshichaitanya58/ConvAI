# ConvAI — AI-Powered Chat Assistant

ConvAI is an AI chat web application built with **Python, Flask, MongoDB, and JavaScript**. It provides a chat interface with selectable AI models, conversation history, file attachments, voice input, account management, and customizable appearance settings.

<p align="center">
  <strong>AI Chat · Multiple Models · File Uploads · Chat History · Voice Input · User Accounts</strong>
</p>

## Overview

ConvAI brings common AI assistant features into a single web application. Users can create an account, start conversations, switch between supported models, attach documents for context, manage previous chats, and personalize the interface.

## Features

### AI Chat
- Chat interface with message composer and suggested prompts
- Selectable model options integrated with supported AI providers
- Start new conversations and revisit previous chats
- Rename, delete, clear, and share conversations
- Rate chat responses
- Search conversations by title
- Responsive chat layout with collapsible sidebar

### File Attachments
- Attach files through the file picker or drag and drop
- Extract text from supported document formats, including PDF, TXT, Markdown, CSV, DOCX, Excel, and PowerPoint files
- Attachments can be included as context in a chat request
- Client-side attachment size check (10 MB)

### Account & Authentication
- Sign up and log in
- Email OTP verification and resend flow
- Google OAuth sign-in (requires OAuth credentials)
- Forgot-password and reset-password flow
- Profile settings and avatar support
- Delete account option

### Personalization
- Dark and light themes
- Font-size preferences
- Voice input in browsers that support the Web Speech API
- Mobile-friendly layout and on-screen keyboard adjustments

### Subscription & Email Workflows
- Monthly and yearly plan pages
- UPI QR display for payment instructions
- Email templates for OTPs, welcome messages, password/account workflows, and subscription notifications

> **Payment note:** The included payment flow is an application-level/demo flow. Do not treat it as verified payment processing unless you integrate and validate a trusted payment gateway and confirm transactions server-side.

## Tech Stack

| Technology | Purpose |
|---|---|
| Python | Application logic |
| Flask | Web server, routes, and API endpoints |
| MongoDB | User accounts, chats, preferences, and related records |
| Flask-Login | Session-based user authentication |
| Flask-PyMongo / PyMongo | MongoDB integration |
| Groq SDK | AI model requests through Groq |
| Google Gen AI SDK | Gemini / Google AI integration |
| Authlib | Google OAuth integration |
| Flask-Mail | Email delivery for OTP and account workflows |
| itsdangerous | Time-limited reset tokens |
| PyPDF2 | PDF text extraction |
| python-docx | DOCX text extraction |
| openpyxl | Excel workbook reading |
| python-pptx | PowerPoint document reading |
| APScheduler | Background scheduled tasks |
| HTML, CSS, JavaScript | Frontend interface and interactions |
| Gunicorn | Production WSGI server |

## Getting Started

### Prerequisites

- Python 3.11+ recommended
- MongoDB instance (local or hosted)
- pip
- API credentials for the AI provider(s) you want to use
- SMTP credentials for email verification and password recovery
- Google OAuth credentials if you want Google sign-in

### 1. Clone the repository

```bash
git clone https://github.com/joshichaitanya58/ConvAI.git
cd ConvAI
```

### 2. Create a virtual environment

**Windows (PowerShell):**

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**macOS / Linux:**

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install dependencies

```bash
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

### 4. Configure environment variables

Create a `.env` file in the project root. Add the values for the services you plan to use:

```env
# Flask
SECRET_KEY=replace-with-a-long-random-secret

# MongoDB
MONGO_URI=mongodb://localhost:27017/convai

# AI providers
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama-3.3-70b-versatile
GEMINI_API_KEY=your-google-ai-api-key

# Optional Google OAuth
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# Email / SMTP
MAIL_SERVER=smtp.example.com
MAIL_PORT=587
MAIL_USE_TLS=true
MAIL_USERNAME=your-smtp-username
MAIL_PASSWORD=your-smtp-password
MAIL_DEFAULT_SENDER=your-verified-sender@example.com

# Optional plan/payment display configuration
UPI_ID=your-upi-id
MONTHLY_PRICE=299
YEARLY_PRICE=3500
```

Replace every example value with your own credentials. Keep `.env` out of Git by adding it to `.gitignore`. Never publish API keys, OAuth secrets, SMTP passwords, database credentials, or a production `SECRET_KEY`.

**Configuration notes:**
- `MONGO_URI` must point to a reachable MongoDB database.
- The application can use the Groq and Google Gen AI integrations; available models depend on your API account and provider access.
- If using Google OAuth, configure the authorized redirect URI to match your deployment's `/google/auth` callback.
- If email features are needed, configure a working SMTP service and a valid sender address.
- Google Cloud Vertex AI mode may require `GOOGLE_CLOUD_PROJECT` and `GOOGLE_CLOUD_LOCATION` if no Google AI Studio API key is configured.

### 5. Run the application

```bash
python app.py
```

Open the local URL printed by Flask in your terminal. If the app does not specify a port, Flask's development server commonly uses:

**http://127.0.0.1:5000/**

For development, use Flask's built-in server. For production, use a production WSGI server such as Gunicorn with the appropriate hosting configuration.

## Main Routes

| Route | Purpose |
|---|---|
| `/` | Main chat interface |
| `/signup` | Account registration |
| `/login` | Login |
| `/google/login` | Start Google OAuth |
| `/verify-otp/<flow>` | Verify signup/login OTP |
| `/forgot-password` | Request password reset |
| `/reset-password` | Reset password |
| `/profile` | User profile and preferences |
| `/help` | Help page |
| `/plans` | Subscription plans |
| `/api/chat` | Send a chat message, optionally with a file |
| `/api/chats` | Retrieve chat history |
| `/api/chat/<chat_id>` | Retrieve, update, or delete a conversation |
| `/api/chats/clear` | Clear conversation history |
| `/api/chat/<chat_id>/share` | Create a share link |
| `/share/<chat_id>` | View a shared conversation |
| `/api/chat/rate` | Submit response feedback |

Most chat and profile API endpoints require an authenticated user session.

## Project Structure

```text
ConvAI/
├── app.py                         # Flask application, auth, AI calls, and API routes
├── requirements.txt               # Python dependencies
├── vercel.json                    # Deployment configuration
├── static/
│   ├── css/
│   │   └── style.css              # Main application styling
│   ├── js/
│   │   └── script.js              # Chat UI, attachments, theme, and interactions
│   └── uploads/
│       └── avatars/                # User avatar uploads (created at runtime)
└── templates/
    ├── index.html                 # Main chat interface
    ├── login.html                 # Login page
    ├── signup.html                # Registration page
    ├── profile.html               # Profile settings
    ├── plans.html                 # Subscription plans
    ├── payment.html               # Payment instructions/demo flow
    ├── verify_otp.html            # OTP verification
    ├── forgot_password.html       # Password recovery
    ├── reset_password.html        # Password reset
    ├── help.html                  # Help page
    ├── privacy.html               # Privacy policy
    └── terms.html                 # Terms and conditions
```

## Deployment Notes

The repository includes a `vercel.json` file, but deployment requirements depend on the platform's Python runtime, request limits, and filesystem behavior.

- Configure all environment variables in your hosting provider's dashboard.
- Use a hosted MongoDB service or a secured MongoDB server accessible from the deployed application.
- Use a production-grade secret key and restrict OAuth callback URLs.
- Do not rely on local filesystem uploads for durable storage on serverless platforms; use object storage for persistent avatars or attachments.
- Background schedulers may run more than once or stop between serverless invocations. Use a dedicated worker or managed scheduler for reliable scheduled jobs.
- Confirm the deployment supports the app's installed dependencies and AI provider network access.

## Security & Privacy Checklist

Before production use:

- Replace the development fallback `SECRET_KEY` with a strong, randomly generated secret.
- Restrict database access and use least-privilege credentials.
- Validate and limit uploads on the server, not only in the browser.
- Add rate limiting and abuse protection to authentication, OTP, and AI endpoints.
- Ensure shared conversation links do not expose private data unexpectedly.
- Use CSRF protection for state-changing form routes and review session cookie settings.
- Keep provider API keys server-side and monitor usage/costs.
- Verify payment status with a trusted payment gateway before granting paid access.
- Review data retention, deletion, and privacy-policy behavior for chat histories and uploaded files.

## Future Enhancements

- Add automated tests for authentication, chat APIs, uploads, and sharing permissions.
- Add streaming AI responses and clear error/retry states.
- Add persistent object storage for user uploads.
- Add usage limits, provider fallback, and transparent token/cost tracking.
- Add administrative monitoring and account-level data export.
- Improve accessibility and keyboard navigation.

## Author

**Chaitanya Joshi**

- GitHub: [@joshichaitanya58](https://github.com/joshichaitanya58)
- Portfolio: [my-portfolio-delta-virid-82.vercel.app](https://my-portfolio-delta-virid-82.vercel.app/)
- LinkedIn: [Chaitanya Joshi](https://www.linkedin.com/in/chaitanya-joshi-644b39298/)

---

<p align="center">Built with Flask, Python, MongoDB, and AI APIs.</p>
