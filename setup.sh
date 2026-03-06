#!/bin/bash
# System-level dependencies and firewall setup for AI PBX
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
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 5060/udp # SIP
sudo ufw allow 5060/tcp # SIP
sudo ufw allow 10000:20000/udp # RTP Media
sudo ufw --force enable

echo "--- 5. Preparing /data/audio Directory ---"
sudo mkdir -p /data/audio
sudo chown -R asterisk:asterisk /data/audio
sudo chmod -R 777 /data/audio

echo "--- 6. Setting up User Permissions ---"
# Add current user to asterisk group so we can write call files without sudo
sudo usermod -aG asterisk $USER
sudo chmod 775 /var/spool/asterisk/outgoing
sudo chmod 775 /var/spool/asterisk/tmp

echo "✅ System setup complete! Please log out and log back in (or run 'newgrp asterisk') to apply group permissions, then follow the README."