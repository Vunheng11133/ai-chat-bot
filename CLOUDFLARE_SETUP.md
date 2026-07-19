# Cloudflare Admin + D1 setup

The website works without D1, but shared Admin teaching requires these settings.

1. In Cloudflare, open **Storage & databases → D1 SQL database → Create**.
2. Name it `ai-chat-bot-db`.
3. Open its **Console** and run the SQL from `schema.sql`.
4. Open **Workers & Pages → ai-chat-bot → Settings → Bindings**.
5. Add a **D1 database binding** named exactly `DB` and select `ai-chat-bot-db`.
6. Under **Variables and Secrets**, add an encrypted secret named exactly `ADMIN_PASSWORD`.
7. Redeploy the latest deployment.

Normal users only have chat access. Only requests containing the Cloudflare secret can add shared knowledge.
