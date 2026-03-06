# Asterisk AI PBX (Turn-Based)

This repository contains everything needed to set up an AI voice assistant using Asterisk, Node.js, and OpenAI on Ubuntu 24.04.

## Prerequisites
- A clean Ubuntu 24.04 VM (Proxmox recommended).
- A SIP Handset (e.g., Grandstream, Yealink, MicroSIP softphone).
- An OpenAI API Key.

## Step 1: Install Git and Clone the Repository
First, update your package list and install Git so you can download the code.

```bash
sudo apt update
```

```bash
sudo apt install git -y
```

Clone the repository and move into the project folder:

```bash
git clone https://github.com/spidervex/voip
```

```bash
cd voip
```

## Step 2: Install System Dependencies
Make the setup script executable and run it to install Asterisk, Node.js, and configure the firewall.

```bash
chmod +x setup.sh
```

```bash
sudo ./setup.sh
```

## Step 3: Apply Asterisk Configurations
Back up the default configuration files:

```bash
sudo mv /etc/asterisk/http.conf /etc/asterisk/http.conf.bak
```

```bash
sudo mv /etc/asterisk/ari.conf /etc/asterisk/ari.conf.bak
```

```bash
sudo mv /etc/asterisk/pjsip.conf /etc/asterisk/pjsip.conf.bak
```

```bash
sudo mv /etc/asterisk/extensions.conf /etc/asterisk/extensions.conf.bak
```

Copy the custom configurations from this repository into the Asterisk directory:

```bash
sudo cp asterisk/* /etc/asterisk/
```

Restart Asterisk to apply the changes:

```bash
sudo systemctl restart asterisk
```

## Step 4: Setup the Node.js App
Install the required Node.js libraries:

```bash
npm install
```

Create your environment variables file from the provided example:

```bash
cp .env.example .env
```

Open the `.env` file to add your API key:

```bash
nano .env
```
*Paste your actual OpenAI API key into the `.env` file. Press `CTRL+X`, then `Y`, and then `Enter` to save and exit.*

## Step 5: Configure your SIP Phone
Connect your physical handset or softphone to the VM using these credentials:
- **Server/Domain:** `<Your VM's IP Address>`
- **Username:** `100`
- **Password:** `SuperSecret123`

## Step 6: Start the App
Run the Node.js application:

```bash
npm start
```

## Step 7: Test it out!
1. Dial `200` on your SIP phone.
2. Wait for the beep, then speak.
3. Stop speaking for 2 seconds. The AI will process your speech and reply.

## Step 8: The Morning News Anchor
This PBX includes a script that uses Perplexity AI to research current events and OpenAI to read them to you as a morning news brief.

1. Ensure your `PERPLEXITY_API_KEY` is added to your `.env` file.
2. Dial **9001** on your handset to trigger the AI to research and write the news. Hang up, and the PBX will call you back in ~20 seconds when the audio is ready.
3. Dial **9000** to replay the most recent news brief.

**To schedule the news automatically:**
Open your crontab:
```bash
crontab -e
```

Add this line to the bottom to have the AI call you with the news every morning at 7:30 AM (Update `/home/vex/voip` to your actual path if different):
```text
# Set the timezone to Mountain Time
CRON_TZ=America/Edmonton

# Now this will run at 7:30 AM Calgary time regardless of UTC
30 7 * * * /usr/bin/node /home/vex/voip/news-anchor.js >> /home/vex/voip/news.log 2>&1
```