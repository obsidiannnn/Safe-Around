# SafeAround - Complete Deployment Guide 🚀

This guide provides everything you need to deploy the SafeAround stack to any VPS (DigitalOcean, AWS, GCP, Azure, etc.).

---

## 🏗️ 1. Initial Server Setup

We've provided an automated script to install Docker, Compose, and harden your server.

1.  **SSH into your server**:
    ```bash
    ssh user@your-server-ip
    ```
2.  **Clone the repository**:
    ```bash
    git clone https://github.com/obsidiannnn/Safe-Around.git
    cd Safe-Around
    ```
3.  **Run the setup script**:
    ```bash
    chmod +x deploy/scripts/setup.sh
    ./deploy/scripts/setup.sh
    ```

---

## 📝 2. Configuration

1.  **Edit your environment variables**:
    ```bash
    vi .env
    ```
    *   **DB_PASSWORD**: Set a strong password.
    *   **FCM_SERVER_KEY**: Your Firebase Cloud Messaging key for notifications.
    *   **TWILIO_ACCOUNT_SID/AUTH_TOKEN**: For emergency SMS alerts.
    *   **ENVIRONMENT**: Set to `production`.

---

## 🔒 3. SSL & Nginx (The Easy Way)

We use **Certbot** with Nginx to manage SSL certificates.

1.  **Run Nginx and Certbot**:
    ```bash
    # Update your domain in deploy/nginx/safearound.conf first!
    docker compose up -d nginx certbot
    ```
2.  **Request a certificate**:
    ```bash
    docker compose run --rm certbot certonly --webroot --webroot-path /var/www/certbot/ -d safearound.app
    ```

---

## 🔄 4. CI/CD (GitHub Actions)

Your repository is already pre-configured with a `.github/workflows/production.yml` workflow.

1.  **Add Secrets to GitHub**:
    *   Go to `Settings` -> `Secrets and variables` -> `Actions` on your repo.
    *   Add:
        *   `DOCKERHUB_USERNAME`: Your DockerHub username.
        *   `DOCKERHUB_TOKEN`: Your DockerHub PAT.
        *   `SERVER_IP`, `SERVER_USER`, `SERVER_SSH_KEY`: For automated SSH deployment.

---

## 💾 5. Database Backups

We've provided a script to automate nightly backups.

1.  **Set up the cron job**:
    ```bash
    chmod +x deploy/scripts/backup.sh
    crontab -e
    # Paste this to run every night at 2:00 AM:
    0 2 * * * /home/user/Safe-Around/deploy/scripts/backup.sh
    ```

---

## 📱 6. Mobile App Deployment (Expo)

To deploy the mobile app to the Apple App Store or Google Play:

1.  **Login to Expo EAS**:
    ```bash
    cd frontend
    eas login
    ```
2.  **Build your app**:
    ```bash
    # For Android APK/AAB
    eas build --platform android --profile production
    
    # For iOS IPA
    eas build --platform ios --profile production
    ```

---

## 🛠️ Monitoring & Maintenance

*   **View Logs**: `docker compose logs -f backend`
*   **Infrastructure Health**: Visit `http://your-server-ip:3000` (Grafana - default password: `safearound123`)
*   **Update System**: `git pull && docker compose up -d`

**✅ Your India-Wide Real-time Crime Heatmap is officially PRODUCTION READY!**
