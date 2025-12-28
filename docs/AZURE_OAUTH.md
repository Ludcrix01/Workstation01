# Microsoft OAuth (Azure App) — Guide rapide

Suivez ces étapes pour créer une application Microsoft (Azure AD) afin d'autoriser MJWorkHub à accéder à Planner et Outlook.

1) Créer l'application dans Azure AD
- Ouvrez Azure Portal -> Azure Active Directory -> App registrations -> New registration.
- Nom : "MJWorkHub - <company>".
- Redirect URI : `https://<your-host>/auth/microsoft/callback` (ou pour développement `http://localhost:3000/auth/microsoft/callback`).

2) Configurer les API permissions
- Microsoft Graph -> Delegated permissions :
  - `openid`, `profile`, `offline_access`
  - `Tasks.ReadWrite` (Planner)
  - `Mail.Read` or `Mail.ReadWrite` (Outlook)
  - `Files.ReadWrite.All` (if attachments via OneDrive)
- If you need background sync across tenant, add Application permissions and request admin consent.

3) Client secret
- Go to Certificates & secrets -> New client secret. Copy the value (only visible once).
- In MJWorkHub Super Admin UI, create a provider 'microsoft' and paste the client_id and client_secret.

4) Redirect URI
- Ensure the redirect URI configured in Azure matches `APP_BASE_URL + '/auth/microsoft/callback'` (see `.env` APP_BASE_URL).

5) Test flow
- As Super Admin: create provider with client_id and client_secret.
- Assign the provider to a company.
- On the company side, run the OAuth flow: visit `/auth/microsoft/start?providerId=<id>&companyId=<companyId>` and complete consent.
- The callback will store a token set (in test environment it is kept in memory).

Note: in production, tokens must be stored encrypted and refresh tokens used to renew access tokens. Use the `MJ_SECRET_KEY` env var to encrypt secrets.
