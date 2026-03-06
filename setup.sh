#!/bin/bash
# AI PBX Setup & Security Script for Ubuntu 24.04
set -e

echo "--- 1. Updating System & Installing Core Packages ---"
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl software-properties-common ufw fail2ban ffmpeg

echo "--- 2. Installing Node.js 20 LTS ---"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo "--- 3. Installing Asterisk 20 LTS ---"
sudo apt install -y asterisk asterisk-modules

echo "--- 4. Configuring Firewall (UFW) ---"
# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw allow ssh

# Allow SIP (Port 5060 TCP/UDP)
sudo ufw allow 5060/udp
sudo ufw allow 5060/tcp

# Allow RTP Media Ports (Audio streams)
sudo ufw allow 10000:20000/udp

# Enable firewall (non-interactive)
sudo ufw --force enable

echo "--- 5. Setting up Node.js Project Directory ---"
mkdir -p ~/ai-pbx
cd ~/ai-pbx
npm init -y
npm install ari-client openai dotenv

# Create directories for audio processing
mkdir -p ~/ai-pbx/audio
sudo chown -R asterisk:asterisk ~/ai-pbx/audio
sudo chmod 777 ~/ai-pbx/audio # Allow both Node and Asterisk to read/write here

echo "✅ Setup Complete! Please follow Step 2 in the README."