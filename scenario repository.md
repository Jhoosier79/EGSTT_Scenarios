# Claude Code Prompt: EGS Trade Tool Scenarios Repository

## Project Overview

Create a standalone repository for Empyrion Galactic Survival (EGS) game scenarios that will serve as an external data source for the EGS Trade Tool React web application. This repository should implement a dynamic registry system that automatically generates a master registry file by scanning all scenario folders and extracting metadata.

## Repository Structure

Create the following directory structure:

```
egs-scenarios/
├── .github/
│   └── workflows/
│       ├── generate-registry.yml
│       └── validate-scenarios.yml
├── scenarios/
│   ├── vanilla/
│   │   ├── metadata.json
│   │   ├── factions.csv
│   │   ├── Localization.csv
│   │   ├── TraderNPCConfig.json
│   │   ├── prefabs.json
│   │   └── image.png (optional)
│   ├── reforged-eden-2/
│   │   ├── metadata.json
│   │   ├── factions.csv
│   │   ├── Localization.csv
│   │   ├── TraderNPCConfig.json
│   │   ├── prefabs.json
│   │   └── image.png (optional)
│   ├── re1/
│   │   └── [same files...]
│   └── junkysal/
│       └── [same files...]
├── scripts/
│   ├── generate-registry.js
│   ├── validate-scenarios.js
│   └── package.json
├── registry.json (auto-generated)
├── README.md
└── package.json
```

## Scenario Metadata Format

Each scenario's `metadata.json` should follow this structure:

```json
{
  "id": "reforged-eden-2",
  "name": "Reforged Eden 2",
  "version": "2.1.4",
  "description": "Enhanced gameplay with new factions, items, and balance changes",
  "author": "Vermillion",
  "gameVersion": "1.12.0",
  "lastUpdated": "2025-01-15T10:30:00Z",
  "tags": ["enhanced", "rebalanced", "multiplayer"],
  "difficulty": "intermediate",
  "features": [
    "New factions",
    "Rebalanced economy",
    "Additional traders"
  ],
  "requirements": {
    "minGameVersion": "1.10.0",
    "dlcRequired": false
  },
  "compatibility": {
    "singlePlayer": true,
    "multiplayer": true,
    "dedicatedServer": true
  },
  "links": {
    "forum": "https://example.com/forum",
    "discord": "https://discord.gg/example",
    "documentation": "https://docs.example.com"
  }
}
```

## Registry Generation Requirements

Create a Node.js script (`scripts/generate-registry.js`) that:

1. **Scans scenario directories**: Automatically discovers all scenario folders in `/scenarios/`
2. **Reads metadata.json**: Parses each scenario's metadata file
3. **Validates required files**: Ensures each scenario has all required files:
   - `metadata.json` (required)
   - `factions.csv` (required)
   - `Localization.csv` (required) 
   - `TraderNPCConfig.json` (optional but recommended)
   - `prefabs.json` (optional but recommended)
4. **Generates checksums**: Create SHA-256 hashes for data integrity validation
5. **Creates master registry**: Generates `registry.json` with this structure:

```json
{
  "version": "1.0.0",
  "generated": "2025-01-15T14:22:33Z",
  "baseUrl": "https://cdn.jsdelivr.net/gh/username/egs-scenarios@main/scenarios/",
  "scenarios": {
    "vanilla": {
      "id": "vanilla",
      "name": "Vanilla EGS",
      "version": "1.12.0",
      "description": "Default game scenario",
      "author": "Eleon Game Studios",
      "gameVersion": "1.12.0",
      "lastUpdated": "2025-01-10T12:00:00Z",
      "tags": ["official", "default"],
      "difficulty": "beginner",
      "features": [],
      "requirements": {
        "minGameVersion": "1.0.0",
        "dlcRequired": false
      },
      "compatibility": {
        "singlePlayer": true,
        "multiplayer": true,
        "dedicatedServer": true
      },
      "files": {
        "metadata": {
          "size": 1024,
          "checksum": "abc123...",
          "lastModified": "2025-01-10T12:00:00Z"
        },
        "factions": {
          "size": 2048,
          "checksum": "def456...",
          "lastModified": "2025-01-10T12:00:00Z"
        },
        "localization": {
          "size": 15360,
          "checksum": "ghi789...",
          "lastModified": "2025-01-10T12:00:00Z"
        },
        "traderConfig": {
          "size": 4096,
          "checksum": "jkl012...",
          "lastModified": "2025-01-10T12:00:00Z"
        },
        "prefabs": {
          "size": 8192,
          "checksum": "mno345...",
          "lastModified": "2025-01-10T12:00:00Z"
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

## Validation Requirements

Create a validation script (`scripts/validate-scenarios.js`) that:

1. **Schema validation**: Validates metadata.json against expected schema
2. **File existence**: Confirms all required files are present
3. **File integrity**: Validates file formats (CSV structure, JSON parsing)
4. **Version validation**: Ensures version follows semantic versioning
5. **Content validation**: Basic checks on CSV headers, JSON structure
6. **Generates validation report**: Creates detailed error/warning reports

## GitHub Actions Automation

Create two workflow files:

### 1. Registry Generation (`generate-registry.yml`)
- Triggers on: push to main, manual dispatch, schedule (daily)
- Actions: Run registry generation script, commit updated registry.json
- Cache Node.js dependencies for faster builds

### 2. Scenario Validation (`validate-scenarios.yml`) 
- Triggers on: pull requests, push to any branch
- Actions: Run validation script, fail if scenarios are invalid
- Provide detailed validation feedback in PR comments

## Additional Requirements

1. **README.md**: Comprehensive documentation including:
   - Repository purpose and usage
   - How to add new scenarios
   - Metadata schema documentation
   - API usage examples for consuming applications
   - Contribution guidelines

2. **Package.json**: Include necessary dependencies:
   - File system operations
   - JSON schema validation
   - CSV parsing utilities
   - Crypto for checksums
   - Commander.js for CLI interface

3. **CLI Interface**: Make scripts executable with options:
   ```bash
   npm run generate-registry
   npm run validate-scenarios
   npm run validate-scenarios -- --scenario=vanilla
   npm run generate-registry -- --output=custom-registry.json
   ```

4. **Error Handling**: Robust error handling with:
   - Clear error messages
   - Exit codes for CI/CD integration
   - Detailed logging options
   - Graceful handling of missing files

5. **CDN Optimization**: Structure for optimal CDN delivery:
   - Predictable file paths
   - Proper cache headers considerations
   - Compression-friendly formats

## Starting Data

Begin with these four scenarios (you can create minimal valid data for testing):
- `vanilla` - Official game scenario
- `reforged-eden-2` - Popular mod scenario
- `re1` - Reforged Eden 1
- `junkysal` - Community scenario

Each should have valid metadata.json and at minimum empty but properly formatted CSV files for initial testing.

## Success Criteria

The completed repository should:
1. Generate a valid registry.json automatically
2. Pass all validation checks
3. Be consumable by the EGS Trade Tool React app
4. Support automated updates via GitHub Actions
5. Provide clear documentation for contributors
6. Handle edge cases gracefully (missing files, invalid data, etc.)

## Implementation Notes

- Use semantic versioning for all version fields
- Ensure cross-platform compatibility (Windows, Linux, macOS)
- Design for scalability (hundreds of scenarios)
- Consider bandwidth optimization for mobile users
- Implement proper CORS headers consideration for web consumption