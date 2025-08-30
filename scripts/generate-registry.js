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

  async validateScenarioFiles(scenarioDir) {
    const requiredFiles = ['metadata.json', 'factions.csv', 'Localization.csv'];
    const optionalFiles = ['TraderNPCConfig.json', 'prefabs.json', 'image.png'];
    
    const files = {};
    const errors = [];
    let isValid = true;

    // Check required files
    for (const fileName of requiredFiles) {
      const filePath = path.join(scenarioDir, fileName);
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
      const filePath = path.join(scenarioDir, fileName);
      if (await fs.pathExists(filePath)) {
        files[this.getFileKey(fileName)] = await this.getFileStats(filePath);
        this.log(`Found optional file: ${fileName}`);
      }
    }

    // Check for image
    const hasImage = await fs.pathExists(path.join(scenarioDir, 'image.png'));

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

  async loadScenarioMetadata(scenarioDir) {
    const metadataPath = path.join(scenarioDir, 'metadata.json');
    try {
      const data = await fs.readJSON(metadataPath);
      this.log(`Loaded metadata for scenario: ${data.id || path.basename(scenarioDir)}`);
      return data;
    } catch (error) {
      this.error(`Failed to load metadata from ${metadataPath}: ${error.message}`);
      return null;
    }
  }

  async processScenario(scenarioName) {
    const scenarioDir = path.join(this.scenariosDir, scenarioName);
    
    if (!await fs.pathExists(scenarioDir)) {
      this.error(`Scenario directory not found: ${scenarioDir}`);
      return null;
    }

    this.log(`Processing scenario: ${scenarioName}`);
    
    const metadata = await this.loadScenarioMetadata(scenarioDir);
    if (!metadata) {
      return null;
    }

    const validation = await this.validateScenarioFiles(scenarioDir);
    
    return {
      ...metadata,
      files: validation.files,
      hasImage: validation.hasImage,
      isValid: validation.isValid,
      validationErrors: validation.validationErrors
    };
  }

  async discoverScenarios() {
    try {
      const entries = await fs.readdir(this.scenariosDir, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    } catch (error) {
      this.error(`Failed to read scenarios directory: ${error.message}`);
      return [];
    }
  }

  async generateRegistry() {
    this.log('Starting registry generation...');
    
    const scenarioNames = await this.discoverScenarios();
    this.log(`Discovered ${scenarioNames.length} scenarios: ${scenarioNames.join(', ')}`);
    
    const scenarios = {};
    let validCount = 0;
    let invalidCount = 0;

    for (const scenarioName of scenarioNames) {
      const scenario = await this.processScenario(scenarioName);
      if (scenario) {
        scenarios[scenario.id || scenarioName] = scenario;
        if (scenario.isValid) {
          validCount++;
        } else {
          invalidCount++;
        }
      } else {
        invalidCount++;
      }
    }

    const registry = {
      version: '1.0.0',
      generated: new Date().toISOString(),
      baseUrl: this.baseUrl,
      scenarios,
      stats: {
        totalScenarios: scenarioNames.length,
        validScenarios: validCount,
        invalidScenarios: invalidCount
      }
    };

    this.log(`Generated registry with ${validCount} valid and ${invalidCount} invalid scenarios`);
    return registry;
  }

  async saveRegistry(registry) {
    try {
      await fs.writeJSON(this.outputPath, registry, { spaces: 2 });
      console.log(`Registry generated successfully: ${this.outputPath}`);
      console.log(`Total scenarios: ${registry.stats.totalScenarios}`);
      console.log(`Valid scenarios: ${registry.stats.validScenarios}`);
      console.log(`Invalid scenarios: ${registry.stats.invalidScenarios}`);
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
