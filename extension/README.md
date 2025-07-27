# CatPass Chrome Extension

## Installation Steps

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension` folder from this project
5. The CatPass extension should now appear in your extensions list

## Usage

1. Make sure the CatPass web app is running on http://localhost:3000
2. Click the CatPass extension icon in Chrome toolbar
3. The extension will show:
   - Login form if not authenticated
   - Unlock form if authenticated but vault locked
   - Main interface with Projects, Groups, and Secrets tabs

## Features

- View all your projects
- View all your groups  
- Browse secrets by project or group context
- Search through secrets
- View secret details in modal
- Copy passwords and other fields to clipboard
- Quick password copy from secrets list

## Demo Data

The extension currently uses mock/demo data for testing:
- Sample projects (Personal, Work, Development)
- Sample groups (Family, Dev Team)
- Sample secrets with different contexts

## API Endpoints Used

- `/api/auth/status` - Check authentication status
- `/api/projects` - Get user's projects
- `/api/groups` - Get user's groups
- `/api/secrets` - Get secrets (filtered by project/group)
- `/api/secrets/[id]` - Get specific secret details

## Icons

Currently using placeholder text. To add proper icons:
1. Create PNG icons in sizes 16x16, 48x48, and 128x128
2. Save them as `icon16.png`, `icon48.png`, `icon128.png` in the `icons` folder
3. Or convert the provided SVG icon to PNG in these sizes

## Development

To modify the extension:
1. Edit files in the `extension` folder
2. Go to `chrome://extensions/`
3. Click the refresh button on the CatPass extension
4. Test your changes
