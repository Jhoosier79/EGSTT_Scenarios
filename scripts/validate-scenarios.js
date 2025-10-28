#!/usr/bin/env node

const fs = require("fs-extra");
const path = require("path");
const Ajv = require("ajv");
const csv = require("csv-parser");
const { program } = require("commander");

program
  .name("validate-scenarios")
  .description("Validate EGS scenario files and metadata")
  .option("-s, --scenario <name>", "Validate specific scenario only")
  .option("-v, --verbose", "Verbose output")
  .option("--json", "Output results as JSON")
  .parse();

const options = program.opts();

class ScenarioValidator {
  constructor(options) {
    this.options = options;
    this.scenariosDir = path.resolve(__dirname, "../scenarios");
    this.verbose = options.verbose;
    this.jsonOutput = options.json;
    this.ajv = new Ajv({ allErrors: true, strict: false });
    this.results = {
      totalScenarios: 0,
      validScenarios: 0,
      invalidScenarios: 0,
      scenarios: {},
      summary: [],
    };

    this.initializeSchemas();
  }

  initializeSchemas() {
    this.metadataSchema = {
      type: "object",
      required: ["id", "name", "version", "description", "author"],
      properties: {
        id: { type: "string", pattern: "^[a-z0-9-]+$" },
        name: { type: "string", minLength: 1 },
        version: {
          type: "string",
          pattern: "^\\d+\\.\\d+(\.\\d+)?$|^[Bb]uild\\s+\\d+$|^[Bb]\\d+$",
        },
        description: { type: "string", minLength: 10 },
        author: { type: "string", minLength: 1 },
        lastUpdated: { type: "string" },
        links: {
          type: "object",
          properties: {
            forum: { type: "string" },
            discord: { type: "string" },
            documentation: { type: "string" },
          },
        },
      },
      additionalProperties: false,
    };

    this.validateMetadata = this.ajv.compile(this.metadataSchema);
  }

  log(message) {
    if (this.verbose && !this.jsonOutput) {
      console.log(`[Validator] ${message}`);
    }
  }

  error(message) {
    if (!this.jsonOutput) {
      console.error(`[Validator ERROR] ${message}`);
    }
  }

  /**
   * Validates if a version string matches any accepted format
   * @param {string} version - Version string to validate
   * @returns {boolean} - True if version matches any accepted format
   */
  isValidVersion(version) {
    if (!version || typeof version !== 'string') {
      return false;
    }

    const validPatterns = [
      /^\d+\.\d+(\.\d+)?$/,           // Semantic: 1.2.3 or 1.2
      /^[Bb]uild\s+\d+$/,              // Build Number: Build 36 (case insensitive)
      /^[Bb]\d+$/                      // Short Build: b36 (case insensitive)
    ];

    return validPatterns.some(pattern => pattern.test(version.trim()));
  }

  /**
   * Returns helpful message about accepted version formats
   * @returns {string} - Help message about version formats
   */
  getVersionFormatHelp() {
    return 'Accepted formats: semantic (1.2.3, 1.2), build (Build 36), or short build (b36)';
  }

  async validateCSVStructure(filePath, expectedHeaders = []) {
    return new Promise((resolve) => {
      const headers = [];
      const errors = [];
      let rowCount = 0;

      fs.createReadStream(filePath)
        .pipe(csv())
        .on("headers", (headerList) => {
          headers.push(...headerList);

          // Check for expected headers if provided
          if (expectedHeaders.length > 0) {
            const missingHeaders = expectedHeaders.filter(
              (h) => !headers.includes(h)
            );
            if (missingHeaders.length > 0) {
              errors.push(
                `Missing expected headers: ${missingHeaders.join(", ")}`
              );
            }
          }
        })
        .on("data", (row) => {
          rowCount++;
          // Basic row validation
          if (Object.keys(row).length === 0) {
            errors.push(`Empty row at line ${rowCount + 1}`);
          }
        })
        .on("error", (err) => {
          errors.push(`CSV parsing error: ${err.message}`);
          resolve({ isValid: false, errors, headers, rowCount });
        })
        .on("end", () => {
          resolve({
            isValid: errors.length === 0,
            errors,
            headers,
            rowCount,
          });
        });
    });
  }

  async validateJSONFile(filePath) {
    try {
      const data = await fs.readJSON(filePath);
      return { isValid: true, data, errors: [] };
    } catch (error) {
      return {
        isValid: false,
        data: null,
        errors: [`JSON parsing error: ${error.message}`],
      };
    }
  }

  async validateMetadataFile(filePath) {
    const result = await this.validateJSONFile(filePath);

    if (!result.isValid) {
      return result;
    }

    const isValidSchema = this.validateMetadata(result.data);
    const schemaErrors = [];

    if (!isValidSchema && this.validateMetadata.errors) {
      this.validateMetadata.errors.forEach((error) => {
        // Enhance version validation error messages
        if (error.instancePath === '/version' && error.keyword === 'pattern') {
          const actualVersion = result.data.version || '(empty)';
          schemaErrors.push(
            `version: Invalid format "${actualVersion}". ${this.getVersionFormatHelp()}`
          );
        } else {
          schemaErrors.push(`${error.instancePath} ${error.message}`);
        }
      });
    }

    return {
      isValid: isValidSchema,
      data: result.data,
      errors: [...result.errors, ...schemaErrors],
    };
  }

  async validateScenarioFiles(scenarioDir) {
    const files = {
      metadata: {
        required: true,
        path: path.join(scenarioDir, "metadata.json"),
      },
      factions: {
        required: true,
        path: path.join(scenarioDir, "factions.csv"),
      },
      localization: {
        required: true,
        path: path.join(scenarioDir, "Localization.csv"),
      },
      traderConfig: {
        required: false,
        path: path.join(scenarioDir, "TraderNPCConfig.json"),
      },
      prefabs: {
        required: false,
        path: path.join(scenarioDir, "prefabs.json"),
      },
      image: { required: false, path: path.join(scenarioDir, "image.png") },
    };

    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      fileResults: {},
    };

    // Check file existence
    for (const [fileKey, fileInfo] of Object.entries(files)) {
      const exists = await fs.pathExists(fileInfo.path);

      if (fileInfo.required && !exists) {
        validation.errors.push(
          `Missing required file: ${path.basename(fileInfo.path)}`
        );
        validation.isValid = false;
      } else if (!fileInfo.required && !exists) {
        validation.warnings.push(
          `Optional file not found: ${path.basename(fileInfo.path)}`
        );
      }

      validation.fileResults[fileKey] = {
        exists,
        required: fileInfo.required,
        path: fileInfo.path,
      };
    }

    // Validate existing files
    if (validation.fileResults.metadata.exists) {
      const metadataResult = await this.validateMetadataFile(
        files.metadata.path
      );
      validation.fileResults.metadata = {
        ...validation.fileResults.metadata,
        ...metadataResult,
      };

      if (!metadataResult.isValid) {
        validation.errors.push(
          ...metadataResult.errors.map((e) => `Metadata: ${e}`)
        );
        validation.isValid = false;
      }
    }

    if (validation.fileResults.factions.exists) {
      const csvResult = await this.validateCSVStructure(files.factions.path, [
        "id",
        "name",
      ]);
      validation.fileResults.factions = {
        ...validation.fileResults.factions,
        ...csvResult,
      };

      if (!csvResult.isValid) {
        validation.errors.push(
          ...csvResult.errors.map((e) => `Factions CSV: ${e}`)
        );
        validation.isValid = false;
      }
    }

    if (validation.fileResults.localization.exists) {
      const csvResult = await this.validateCSVStructure(
        files.localization.path,
        ["KEY", "English"]
      );
      validation.fileResults.localization = {
        ...validation.fileResults.localization,
        ...csvResult,
      };

      if (!csvResult.isValid) {
        validation.errors.push(
          ...csvResult.errors.map((e) => `Localization CSV: ${e}`)
        );
        validation.isValid = false;
      }
    }

    if (validation.fileResults.traderConfig.exists) {
      const jsonResult = await this.validateJSONFile(files.traderConfig.path);
      validation.fileResults.traderConfig = {
        ...validation.fileResults.traderConfig,
        ...jsonResult,
      };

      if (!jsonResult.isValid) {
        validation.errors.push(
          ...jsonResult.errors.map((e) => `TraderNPCConfig: ${e}`)
        );
        validation.isValid = false;
      }
    }

    if (validation.fileResults.prefabs.exists) {
      const jsonResult = await this.validateJSONFile(files.prefabs.path);
      validation.fileResults.prefabs = {
        ...validation.fileResults.prefabs,
        ...jsonResult,
      };

      if (!jsonResult.isValid) {
        validation.errors.push(
          ...jsonResult.errors.map((e) => `Prefabs: ${e}`)
        );
        validation.isValid = false;
      }
    }

    return validation;
  }

  async validateScenario(scenarioName) {
    const scenarioDir = path.join(this.scenariosDir, scenarioName);

    if (!(await fs.pathExists(scenarioDir))) {
      return {
        name: scenarioName,
        isValid: false,
        errors: [`Scenario directory not found: ${scenarioName}`],
        warnings: [],
      };
    }

    this.log(`Validating scenario: ${scenarioName}`);

    const validation = await this.validateScenarioFiles(scenarioDir);

    return {
      name: scenarioName,
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings,
      fileResults: validation.fileResults,
    };
  }

  async discoverScenarios() {
    try {
      const entries = await fs.readdir(this.scenariosDir, {
        withFileTypes: true,
      });
      return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
    } catch (error) {
      this.error(`Failed to read scenarios directory: ${error.message}`);
      return [];
    }
  }

  async validateAll() {
    let scenarios = [];

    if (this.options.scenario) {
      scenarios = [this.options.scenario];
    } else {
      scenarios = await this.discoverScenarios();
    }

    this.results.totalScenarios = scenarios.length;

    for (const scenarioName of scenarios) {
      const result = await this.validateScenario(scenarioName);
      this.results.scenarios[scenarioName] = result;

      if (result.isValid) {
        this.results.validScenarios++;
      } else {
        this.results.invalidScenarios++;
      }

      // Add to summary
      this.results.summary.push({
        name: scenarioName,
        status: result.isValid ? "VALID" : "INVALID",
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
      });
    }

    return this.results;
  }

  printResults() {
    if (this.jsonOutput) {
      console.log(JSON.stringify(this.results, null, 2));
      return;
    }

    console.log("\n=== EGS Scenario Validation Results ===\n");

    this.results.summary.forEach((scenario) => {
      const status = scenario.status === "VALID" ? "✅" : "❌";
      console.log(
        `${status} ${scenario.name} (${scenario.errorCount} errors, ${scenario.warningCount} warnings)`
      );

      if (this.verbose) {
        const details = this.results.scenarios[scenario.name];
        if (details.errors.length > 0) {
          details.errors.forEach((error) => console.log(`   ERROR: ${error}`));
        }
        if (details.warnings.length > 0) {
          details.warnings.forEach((warning) =>
            console.log(`   WARNING: ${warning}`)
          );
        }
      }
    });

    console.log(`\nSummary:`);
    console.log(`- Total scenarios: ${this.results.totalScenarios}`);
    console.log(`- Valid scenarios: ${this.results.validScenarios}`);
    console.log(`- Invalid scenarios: ${this.results.invalidScenarios}`);

    if (this.results.invalidScenarios > 0) {
      console.log("\n❌ Validation failed. Fix errors above.");
      process.exit(1);
    } else {
      console.log("\n✅ All scenarios are valid!");
    }
  }

  async run() {
    try {
      await this.validateAll();
      this.printResults();
    } catch (error) {
      this.error(`Validation failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const validator = new ScenarioValidator(options);
  validator.run();
}

module.exports = ScenarioValidator;
