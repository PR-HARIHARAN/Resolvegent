#!/bin/bash
set -e

echo "=========================================================="
echo "🚀 Resolvegent - AWS EC2 Automated Deployment Script"
echo "=========================================================="

# 1. Update system packages
echo "📦 Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# 2. Install Docker and Docker Compose if not already installed
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker & Docker Compose..."
    sudo apt-get install -y ca-certificates curl gnupg lsb-release
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo usermod -aG docker "$USER"
    echo "✅ Docker installed successfully."
else
    echo "✅ Docker is already installed."
fi

# 3. Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found!"
    if [ -f ".env.example" ]; then
        echo "📋 Copying .env.example to .env..."
        cp .env.example .env
        echo "❗ Please edit .env with your actual GROQ_API_KEY before running!"
    fi
fi

# 4. Build and run containers
echo "🏗️  Building and launching containers..."
sudo docker compose up -d --build

echo "=========================================================="
echo "🎉 Resolvegent is live!"
echo "👉 Open: http://$(curl -s http://checkip.amazonaws.com)"
echo "=========================================================="
