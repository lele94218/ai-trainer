# AI Trainer

AI Trainer is a desktop application that helps you analyze screenshots using GPT vision capabilities. Take a screenshot, ask questions about it, and get instant AI-powered analysis.

## Features

- **Quick Screenshot Analysis**: Capture screenshots and get instant AI analysis
- **Interactive Q&A**: Ask follow-up questions about the captured screenshot
- **Global Shortcuts**:
  - `⌘ + ⇧ + A`: Capture screenshot
  - `⌘ + ⇧ + S`: Show window
  - `⌘ + H`: Hide window
  - `⌘ + I`: Quick input focus
  - `⌘ + ,`: Open settings
  - `⌘ + Q`: Quit app
  - `Enter`: Send message
- **Customizable Settings**:
  - OpenAI API key configuration
  - GPT model selection
  - Default analysis message
  - Font size adjustment
- **Dark Mode Support**: Native macOS dark mode integration
- **Markdown Rendering**: Beautiful rendering of AI responses with code highlighting

## Installation

1. Download the latest release from the releases page
2. Mount the DMG file
3. Drag AI Trainer to your Applications folder
4. Launch AI Trainer
5. Configure your OpenAI API key in Settings (⌘ + ,)

## Development

### Prerequisites

- Node.js (v18 or later)
- npm
- ImageMagick (for icon generation)
- librsvg (for SVG conversion)

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd ai-trainer

# Install dependencies
npm install

# Start development mode
npm run dev
```

### Building

```bash
# Build the application
npm run build
```

The built application will be available in the `dist` directory.

### Icon Generation

The application icon is generated from an SVG file. To modify the icon:

1. Edit `assets/icon.svg`
2. Run the icon generation script:
```bash
./scripts/create-icns.sh
```

## Configuration

The application settings are stored in:
```
~/Library/Application Support/AI Trainer/settings.json
```

## Dependencies

- [Electron](https://www.electronjs.org/): Cross-platform desktop application framework
- [OpenAI API](https://platform.openai.com/): GPT vision capabilities
- [Marked](https://marked.js.org/): Markdown rendering

## License

This project is proprietary software. All rights reserved.

## Support

For issues, feature requests, or questions, please open an issue in the repository. 