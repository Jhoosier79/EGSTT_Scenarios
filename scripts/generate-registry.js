#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { program } = require('commander');

program
  .name('generate-registry')
  .description('Generate registry.json from scenario metadata')
  .option('-o, --output <file>', 'Output file path', 'registry.json')
  .option('--base-url <url>', 'Base URL for CDN', 'https://cdn.jsdelivr.net/gh/username/egs-scenarios@main/scenarios/')
  .option('-v, --verbose', 'Verbose output')
  .parse();

const options = program.opts();

class RegistryGenerator {
  constructor(options) {
    this.options = options;
    this.scenariosDir = path.resolve(__dirname, '../scenarios');
    this.outputPath = path.resolve(path.dirname(__dirname), options.output);
    this.baseUrl = options.baseUrl;
    this.verbose = options.verbose;
  }

  log(message) {
    if (this.verbose) {
      console.log(`[Registry] ${message}`);
    }
  }

  error(message) {
    console.error(`[Registry ERROR] ${message}`);
  }

  async generateChecksum(filePath) {
    try {
      const data = await fs.readFile(filePath);
      return crypto.createHash('sha256').update(data).digest('hex');
    } catch (error) {
      this.error(`Failed to generate checksum for ${filePath}: ${error.message}`);
      return null;
    }
  }

  async getFileStats(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const checksum = await this.generateChecksum(filePath);
      return {
        size: stats.size,
        checksum,
        lastModified: stats.mtime.toISOString()
      };
    } catch (error) {
      this.error(`Failed to get stats for ${filePath}: ${error.message}`);
      return null;
    }
  }

  async validateScenarioFiles(versionDir) {
    const requiredFiles = ['metadata.json', 'factions.csv', 'Localization.csv'];
    const optionalFiles = ['TraderNPCConfig.json', 'prefabs.json', 'image.png'];

    const files = {};
    const errors = [];
    let isValid = true;

    // Check required files
    for (const fileName of requiredFiles) {
      const filePath = path.join(versionDir, fileName);
      if (await fs.pathExists(filePath)) {
        files[this.getFileKey(fileName)] = await this.getFileStats(filePath);
        this.log(`Found required file: ${fileName}`);
      } else {
        errors.push(`Missing required file: ${fileName}`);
        isValid = false;
      }
    }

    // Check optional files
    for (const fileName of optionalFiles) {
      const filePath = path.join(versionDir, fileName);
      if (await fs.pathExists(filePath)) {
        files[this.getFileKey(fileName)] = await this.getFileStats(filePath);
        this.log(`Found optional file: ${fileName}`);
      }
    }

    // Check for image
    const hasImage = await fs.pathExists(path.join(versionDir, 'image.png'));

    return { files, isValid, validationErrors: errors, hasImage };
  }

  getFileKey(fileName) {
    const keyMap = {
      'metadata.json': 'metadata',
      'factions.csv': 'factions',
      'Localization.csv': 'localization',
      'TraderNPCConfig.json': 'traderConfig',
      'prefabs.json': 'prefabs',
      'image.png': 'image'
    };
    return keyMap[fileName] || fileName.replace(/\.[^/.]+$/, '');
  }

  async loadScenarioMetadata(versionDir) {
    const metadataPath = path.join(versionDir, 'metadata.json');
    try {
      const data = await fs.readJSON(metadataPath);
      this.log(`Loaded metadata for version at: ${path.basename(versionDir)}`);
      return data;
    } catch (error) {
      this.error(`Failed to load metadata from ${metadataPath}: ${error.message}`);
      return null;
    }
  }

  async processVersion(scenarioName, versionName) {
    const versionDir = path.join(this.scenariosDir, scenarioName, versionName);

    this.log(`Processing version: ${scenarioName}/${versionName}`);

    const metadata = await this.loadScenarioMetadata(versionDir);
    if (!metadata) {
      return null;
    }

    const validation = await this.validateScenarioFiles(versionDir);

    // Construct the path for files relative to scenarios/
    const relativeDir = `${scenarioName}/${versionName}/`;

    return {
      ...metadata,
      path: relativeDir,
      files: validation.files,
      hasImage: validation.hasImage,
      isValid: validation.isValid,
      validationErrors: validation.validationErrors
    };
  }

  async discoverScenarios() {
    try {
      const entries = await fs.readdir(this.scenariosDir, { withFileTypes: true });
      const scenarioMap = {};

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const scenarioName = entry.name;
          const scenarioDir = path.join(this.scenariosDir, scenarioName);
          const versionEntries = await fs.readdir(scenarioDir, { withFileTypes: true });

          const versions = versionEntries
            .filter(v => v.isDirectory())
            .map(v => v.name);

          if (versions.length > 0) {
            scenarioMap[scenarioName] = versions;
          }
        }
      }
      return scenarioMap;
    } catch (error) {
      this.error(`Failed to read scenarios directory: ${error.message}`);
      return {};
    }
  }

  async generateRegistry() {
    this.log('Starting registry generation...');

    const scenarioMap = await this.discoverScenarios();
    const scenarioNames = Object.keys(scenarioMap);
    this.log(`Discovered ${scenarioNames.length} scenarios`);

    const scenarios = {};
    let totalVersions = 0;
    let validCount = 0;
    let invalidCount = 0;

    for (const scenarioName of scenarioNames) {
      const versions = scenarioMap[scenarioName];
      const processedVersions = {};
      let scenarioMetadata = null;

      for (const versionName of versions) {
        const versionData = await this.processVersion(scenarioName, versionName);
        if (versionData) {
          processedVersions[versionName] = versionData;
          totalVersions++;

          if (versionData.isValid) {
            validCount++;
          } else {
            invalidCount++;
          }

          // Use the latest or first valid metadata as the scenario-level metadata
          if (!scenarioMetadata || versionData.isValid) {
            scenarioMetadata = {
              id: versionData.id,
              name: versionData.name,
              description: versionData.description,
              author: versionData.author
            };
          }
        }
      }

      if (Object.keys(processedVersions).length > 0) {
        scenarios[scenarioName] = {
          ...scenarioMetadata,
          versions: processedVersions
        };
      }
    }

    const registry = {
      version: '2.0.0', // Incremented version for schema change
      generated: new Date().toISOString(),
      baseUrl: this.baseUrl,
      scenarios,
      stats: {
        totalScenarios: scenarioNames.length,
        totalVersions,
        validVersions: validCount,
        invalidVersions: invalidCount
      }
    };

    this.log(`Generated registry with ${validCount} valid and ${invalidCount} invalid versions across ${scenarioNames.length} scenarios`);
    return registry;
  }

  async saveRegistry(registry) {
    try {
      await fs.writeJSON(this.outputPath, registry, { spaces: 2 });
      console.log(`Registry generated successfully: ${this.outputPath}`);
      console.log(`Total Scenarios: ${registry.stats.totalScenarios}`);
      console.log(`Total Versions: ${registry.stats.totalVersions}`);
      console.log(`Valid Versions: ${registry.stats.validVersions}`);
      console.log(`Invalid Versions: ${registry.stats.invalidVersions}`);
    } catch (error) {
      this.error(`Failed to save registry: ${error.message}`);
      process.exit(1);
    }
  }

  async run() {
    try {
      const registry = await this.generateRegistry();
      await this.saveRegistry(registry);
    } catch (error) {
      this.error(`Registry generation failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const generator = new RegistryGenerator(options);
  generator.run();
}

module.exports = RegistryGenerator;
