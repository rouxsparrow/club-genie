import http from "node:http";
import { URLSearchParams } from "node:url";

const clientId = process.env.GMAIL_CLIENT_ID;
const clientSecret = process.env.GMAIL_CLIENT_SECRET;
const port = Number(process.env.GMAIL_OAUTH_PORT ?? 3002);

if (!clientId || !clientSecret) {
  console.error("Missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET.");
  process.exit(1);
}

const redirectUri = `http://localhost:${port}/callback`;

const params = new URLSearchParams({
  client_id: clientId,
  redirect_uri: redirectUri,
  response_type: "code",
  scope: "https://www.googleapis.com/auth/gmail.readonly",
  access_type: "offline",
  prompt: "consent"
});

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

console.log("Open this URL in your browser to grant access:");
console.log(authUrl);
console.log("\nIf you are not redirected, ensure the OAuth redirect URI matches:");
console.log(redirectUri);

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400);
    res.end("Missing URL");
    return;
  }

  const url = new URL(req.url, `http://localhost:${port}`);
  if (url.pathname !== "/callback") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    res.writeHead(400);
    res.end(`OAuth error: ${error}`);
    server.close();
    process.exit(1);
  }

  if (!code) {
    res.writeHead(400);
    res.end("Missing code in callback.");
    server.close();
    process.exit(1);
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });

    const payload = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", payload);
      res.writeHead(500);
      res.end("Token exchange failed. Check console.");
      server.close();
      process.exit(1);
    }

    if (!payload.refresh_token) {
      console.error("No refresh_token returned.");
      console.error("Possible causes: already consented without prompt=consent, wrong account, or redirect mismatch.");
      res.writeHead(200);
      res.end("No refresh_token returned. Check terminal output for next steps.");
      server.close();
      process.exit(1);
    }

    console.log("\nRefresh token (store securely):");
    console.log(payload.refresh_token);

    res.writeHead(200);
    res.end("Success! You can close this window.");
    server.close();
  } catch (err) {
    console.error("Unexpected error:", err);
    res.writeHead(500);
    res.end("Unexpected error. Check console.");
    server.close();
    process.exit(1);
  }
});

server.listen(port, () => {
  console.log(`\nListening on ${redirectUri}`);
});
