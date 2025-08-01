#!/bin/bash

# Script to set up KeepTouch Pro in a separate folder

echo "Setting up KeepTouch Pro in a separate folder..."

# Go up one directory
cd ..

# Clone the repository into a new folder
echo "Cloning repository into project-pro folder..."
git clone . project-pro

# Enter the new folder
cd project-pro

# Checkout the real-estate branch
echo "Switching to real-estate-version branch..."
git checkout real-estate-version

# Copy the pro environment file
echo "Setting up environment..."
cp .env.pro .env

# Install dependencies
echo "Installing dependencies..."
npm install

# Clear any cached data
echo "Clearing Expo cache..."
npx expo start --clear

echo "✅ Setup complete!"
echo "📁 Your Pro version is now in: $(pwd)"
echo "🚀 To start developing, run: npm run ios"