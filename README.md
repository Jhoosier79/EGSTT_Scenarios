# EGS Scenarios Repository

[![Generate Registry](https://github.com/username/egs-scenarios/actions/workflows/generate-registry.yml/badge.svg)](https://github.com/username/egs-scenarios/actions/workflows/generate-registry.yml)
[![Validate Scenarios](https://github.com/username/egs-scenarios/actions/workflows/validate-scenarios.yml/badge.svg)](https://github.com/username/egs-scenarios/actions/workflows/validate-scenarios.yml)

A centralized repository for Empyrion Galactic Survival (EGS) game scenarios that serves as an external data source for the EGS Trade Tool React web application. This repository implements a dynamic registry system that automatically generates a master registry file by scanning all scenario folders and extracting metadata.

## 🚀 Quick Start

### Using the Registry

The main registry file is automatically generated and available at:

```
https://cdn.jsdelivr.net/gh/username/egs-scenarios@main/registry.json
```

### API Usage Examples

```javascript
// Fetch all scenarios
const response = await fetch(
  "https://cdn.jsdelivr.net/gh/username/egs-scenarios@main/registry.json"
);
const registry = await response.json();

// Get scenario list
const scenarios = registry.scenarios;

// Access specific scenario data
const vanillaScenario = scenarios.vanilla;

// Download scenario files
const factionsUrl = `${registry.baseUrl}vanilla/factions.csv`;
```

## 📁 Repository Structure

```
egs-scenarios/
├── .github/workflows/          # GitHub Actions
│   ├── generate-registry.yml   # Auto-generates registry
│   └── validate-scenarios.yml  # Validates scenarios
├── scenarios/                  # Scenario data
│   ├── vanilla/               # Official EGS scenario
│   ├── reforged-eden-2/       # Reforged Eden 2
│   ├── re1/                   # Reforged Eden 1
│   └── junkysal/              # Junkyard Salvager
├── scripts/                   # Node.js automation scripts
│   ├── generate-registry.js   # Registry generation logic
│   ├── validate-scenarios.js  # Validation logic
│   └── package.json          # Script dependencies
├── registry.json             # Auto-generated master registry
├── README.md                 # This file
└── package.json             # Main package configuration
```

## 📋 Scenario Structure

Each scenario must follow this structure:

```
scenarios/[scenario-id]/
├── metadata.json          # Required: Scenario metadata
├── factions.csv          # Required: Faction definitions
├── Localization.csv      # Required: Localization strings
├── TraderNPCConfig.json  # Optional: Trader configurations
├── prefabs.json          # Optional: Prefab definitions
└── image.png            # Optional: Scenario thumbnail
```

### Required Files

- **metadata.json**: Contains scenario information (name, version, author, etc.)
- **factions.csv**: Faction definitions with columns: Name, Faction, ...
- **Localization.csv**: Localization strings with columns: Key, English, ...

### Optional Files

- **TraderNPCConfig.json**: Trading NPC configurations
- **prefabs.json**: Prefab definitions and modifications
- **image.png**: Scenario thumbnail image (recommended: 512x512px)

## 📝 Metadata Schema

Each scenario's `metadata.json` must follow this schema:

```json
{
  "id": "scenario-id",
  "name": "Human Readable Name",
  "version": "1.2.3",
  "description": "Detailed description of the scenario",
  "author": "Author Name",
  "gameVersion": "1.12.0",
  "links": {
    "scenario": "https://forum-url",
    "discord": "https://discord-invite"
  }
}
```

### Schema Requirements

- **id**: Lowercase letters, numbers, and hyphens only (e.g., "reforged-eden-2")
- **version**: Semantic versioning (e.g., "1.2.3" or "1.2")
- **gameVersion**: EGS version number (e.g., "1.12.0")
- **difficulty**: One of: beginner, intermediate, advanced, expert
- **lastUpdated**: ISO 8601 timestamp

## 🛠 Development

### Prerequisites

- Node.js 16+
- npm or yarn

### Setup

1. Clone the repository:

```bash
git clone https://github.com/username/egs-scenarios.git
cd egs-scenarios
```

2. Install dependencies:

```bash
cd scripts
npm install
```

### Available Commands

```bash
# Generate registry from scenarios
npm run generate-registry

# Validate all scenarios
npm run validate-scenarios

# Validate specific scenario
npm run validate-scenario vanilla

# Run full test suite
npm test
```

### CLI Options

#### Registry Generation

```bash
node scripts/generate-registry.js [options]

Options:
  -o, --output <file>     Output file path (default: registry.json)
  --base-url <url>        Base URL for CDN
  -v, --verbose           Verbose output
```

#### Scenario Validation

```bash
node scripts/validate-scenarios.js [options]

Options:
  -s, --scenario <name>   Validate specific scenario only
  -v, --verbose           Verbose output
  --json                  Output results as JSON
```

## 🤝 Contributing

### Adding a New Scenario

1. **Fork the repository**
2. **Create scenario directory**: `scenarios/your-scenario-id/`
3. **Add required files**:
   - `metadata.json` (see schema above)
   - `factions.csv`
   - `Localization.csv`
4. **Add optional files** (recommended):
   - `TraderNPCConfig.json`
   - `prefabs.json`
   - `image.png`
5. **Validate locally**:
   ```bash
   npm run validate-scenario your-scenario-id
   ```
6. **Test registry generation**:
   ```bash
   npm run generate-registry
   ```
7. **Submit pull request**

### CSV File Formats

#### factions.csv

```csv
Name,Faction,Group,Origin
Polaris,1,1,Polaris
Traders,2,2,Traders
```

#### Localization.csv

```csv
Key,English,German,French
ItemName,"Item Name","German Name","French Name"
```

### JSON File Examples

#### TraderNPCConfig.json

```json
{
  "traders": [
    {
      "name": "Equipment Trader",
      "faction": 2,
      "items": ["SuitArmor", "Drill"]
    }
  ]
}
```

#### prefabs.json

```json
{
  "prefabs": [
    {
      "name": "BA_Alien_AuxT1_01",
      "type": "POI",
      "difficulty": 3
    }
  ]
}
```

## 🔄 Automated Processes

### Registry Generation

- **Triggers**: Push to main, daily at 2:00 AM UTC, manual dispatch
- **Process**: Scans scenarios, validates files, generates checksums
- **Output**: Updated `registry.json` with file metadata and integrity hashes

### Scenario Validation

- **Triggers**: Pull requests, pushes to any branch
- **Process**: Validates metadata schema, file existence, CSV structure, JSON parsing
- **Output**: Validation report with errors and warnings

## 📊 Registry API

The generated `registry.json` provides:

```json
{
  "version": "1.0.0",
  "generated": "2025-01-15T14:22:33Z",
  "baseUrl": "https://cdn.jsdelivr.net/gh/username/egs-scenarios@main/scenarios/",
  "scenarios": {
    "scenario-id": {
      // Scenario metadata
      "files": {
        "metadata": {
          "size": 1024,
          "checksum": "abc123...",
          "lastModified": "..."
        },
        "factions": {
          "size": 2048,
          "checksum": "def456...",
          "lastModified": "..."
        }
      },
      "hasImage": true,
      "isValid": true,
      "validationErrors": []
    }
  },
  "stats": {
    "totalScenarios": 4,
    "validScenarios": 4,
    "invalidScenarios": 0
  }
}
```

## 🏷 Available Scenarios

| Scenario              | Author             | Difficulty   | Description                        |
| --------------------- | ------------------ | ------------ | ---------------------------------- |
| **Vanilla EGS**       | Eleon Game Studios | Beginner     | Official game scenario             |
| **Reforged Eden 2**   | Vermillion         | Intermediate | Enhanced gameplay with new content |
| **Reforged Eden 1**   | Vermillion         | Intermediate | Original enhanced scenario         |
| **Junkyard Salvager** | Community          | Advanced     | Hardcore survival scenario         |

## 🚦 Status Indicators

Scenarios are automatically validated and marked with status indicators:

- ✅ **Valid**: All files present and properly formatted
- ❌ **Invalid**: Missing files or validation errors
- ⚠️ **Warnings**: Optional files missing or minor issues

## 📈 Performance

- **CDN Optimized**: Files served via jsDelivr CDN
- **Caching**: Registry cached for 24 hours
- **Compression**: All JSON and CSV files are gzip-compressed
- **Bandwidth**: Optimized for mobile users

## 🛡 Security

- **Validation**: All files validated before inclusion
- **Checksums**: SHA-256 hashes for file integrity
- **CORS**: Proper headers for web consumption
- **No Secrets**: No sensitive data in repository

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤔 Support

- **Issues**: [GitHub Issues](https://github.com/username/egs-scenarios/issues)
- **Discussions**: [GitHub Discussions](https://github.com/username/egs-scenarios/discussions)
- **Wiki**: [Repository Wiki](https://github.com/username/egs-scenarios/wiki)

## 🎯 Roadmap

- [ ] Schema versioning support
- [ ] Scenario dependencies system
- [ ] Automated testing with game files
- [ ] Multi-language metadata support
- [ ] Scenario popularity tracking
- [ ] Community rating system

---

**Made with ❤️ by the EGS Community**
