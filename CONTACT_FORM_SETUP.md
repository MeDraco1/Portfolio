# Contact form setup

The portfolio is hosted as a static GitHub Pages site. GitHub Pages serves the files but does not run a private server or database, so the form sends messages to a hosted form endpoint. Messages stay in that provider's account and are not committed to this repository.

## Connect the form

1. Create a form endpoint with a hosted form service such as Formspree and copy its submission URL (for example, `https://formspree.io/f/abcdwxyz`).
2. Open `main.js` and set `CONTACT_FORM_ENDPOINT` to that URL:

   ```js
   const CONTACT_FORM_ENDPOINT = 'https://formspree.io/f/abcdwxyz';
   ```

3. Save and publish the updated portfolio to GitHub Pages. Submit a test message and confirm that it appears in the provider's submissions inbox.

The direct contact page uses `contact-direct-background.jpg.png` beside `index.html` as its background. If the image is unavailable, the dark page color and overlay remain as fallbacks, and the translucent form panels keep their contrast.

The endpoint identifier is public in the page source, so it must only identify the form; never put an API key, password, or private token there. The browser code only permits an HTTPS Formspree form URL and sends no cookies or referrer. Name, email, and message fields have size limits, are trimmed before sending, and a hidden honeypot helps filter basic bots. These browser checks help, but they are not a replacement for the provider's server-side spam controls; turn on any available CAPTCHA or spam protection in the provider dashboard.

Do not save visitors' names, email addresses, or messages in a public GitHub repository. Form submissions are stored by the form provider in the account connected to the endpoint. If you want submissions stored in a GitHub-hosted database, use a private repository with a separate serverless backend and its credentials stored as server-side secrets.

Until `CONTACT_FORM_ENDPOINT` is configured, the form reports that it is not connected and does not pretend the message was sent.
