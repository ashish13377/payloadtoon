#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { env } from "./config/env";
import { createServer } from "./server";
import { localTokenService } from "./services/localToken.service";
import { convertJsonToToon } from "./utils/toonParser";

type CliOptions = {
  inputFile?: string;
  outputFile?: string;
  maxDepth: number;
  previewRows: number;
  includeToonString: boolean;
  pretty: boolean;
};

function printHelp(): void {
  console.log(`PayloadTOON CLI

Usage:
  payloadtoon                         Start the PayloadTOON API server
  payloadtoon compress <file.json>    Compress JSON locally without Gemini

Compress options:
  -o, --out <file>       Write output JSON to a file
  --max-depth <number>   Max nested object depth. Default: 5
  --preview-rows <n>     Number of TOON rows in preview. Default: 10
  --no-toon-string       Omit full toonString from CLI output
  --pretty               Pretty print JSON output
  -h, --help             Show help

Accepted input shapes:
  1. Raw JSON array
  2. Object containing documentContext array

Examples:
  payloadtoon compress ./examples/requests/analyze.sample.json
  payloadtoon compress ./data.json --out ./toon-output.json --pretty
`);
}

function parseCompressArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    maxDepth: 5,
    previewRows: 10,
    includeToonString: true,
    pretty: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (!arg) continue;

    if (arg === "-h" || arg === "--help") {
      printHelp();
      process.exit(0);
    }

    if (arg === "-o" || arg === "--out") {
      options.outputFile = args[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--max-depth") {
      options.maxDepth = Number(args[index + 1] ?? 5);
      index += 1;
      continue;
    }

    if (arg === "--preview-rows") {
      options.previewRows = Number(args[index + 1] ?? 10);
      index += 1;
      continue;
    }

    if (arg === "--no-toon-string") {
      options.includeToonString = false;
      continue;
    }

    if (arg === "--pretty") {
      options.pretty = true;
      continue;
    }

    if (!options.inputFile) {
      options.inputFile = arg;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.inputFile) {
    throw new Error(
      "Missing input file. Usage: payloadtoon compress <file.json>",
    );
  }

  if (
    !Number.isInteger(options.maxDepth) ||
    options.maxDepth < 1 ||
    options.maxDepth > 20
  ) {
    throw new Error("--max-depth must be an integer between 1 and 20.");
  }

  if (
    !Number.isInteger(options.previewRows) ||
    options.previewRows < 1 ||
    options.previewRows > 100
  ) {
    throw new Error("--preview-rows must be an integer between 1 and 100.");
  }

  return options;
}

function readDocumentContext(inputFile: string): Record<string, unknown>[] {
  const absolutePath = path.resolve(process.cwd(), inputFile);
  const raw = fs.readFileSync(absolutePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (Array.isArray(parsed)) {
    return parsed as Record<string, unknown>[];
  }

  if (
    parsed &&
    typeof parsed === "object" &&
    "documentContext" in parsed &&
    Array.isArray((parsed as { documentContext?: unknown }).documentContext)
  ) {
    return (parsed as { documentContext: Record<string, unknown>[] })
      .documentContext;
  }

  throw new Error(
    "Input JSON must be either an array of objects or an object with a documentContext array.",
  );
}

function buildCompressionOutput(
  documentContext: Record<string, unknown>[],
  options: CliOptions,
): unknown {
  const startedAt = Date.now();
  const compression = convertJsonToToon(documentContext, {
    maxDepth: options.maxDepth,
  });
  const rawPayload = JSON.stringify(documentContext);
  const optimizedPayload = `${compression.schemaHeader}\n${compression.toonString}`;
  const raw = localTokenService.countTokens(rawPayload);
  const optimized = localTokenService.countTokens(optimizedPayload);
  const tokensSaved = raw.tokens - optimized.tokens;
  const savingsPercentageNumber =
    raw.tokens === 0 ? 0 : (tokensSaved / raw.tokens) * 100;

  return {
    success: true,
    data: {
      optimizationAnalytics: {
        rawTokens: raw.tokens,
        optimizedTokens: optimized.tokens,
        tokensSaved,
        savingsPercentage: `${savingsPercentageNumber.toFixed(1)}%`,
        compressionRatio:
          raw.tokens === 0
            ? 0
            : Number((optimized.tokens / raw.tokens).toFixed(4)),
        model: "local-token-counter",
        tokenCounter: optimized.tokenizer,
        isEstimate: raw.isEstimate || optimized.isEstimate,
        note: optimized.note,
        calculatedAt: new Date().toISOString(),
        processingTimeMs: Date.now() - startedAt,
      },
      toon: {
        schemaHeader: compression.schemaHeader,
        toonString: options.includeToonString
          ? compression.toonString
          : undefined,
        preview: compression.rows.slice(0, options.previewRows).join("\n"),
        rowCount: compression.rowCount,
        columnCount: compression.columnCount,
        keys: compression.keys,
        maxDepthUsed: compression.maxDepthUsed,
      },
    },
  };
}

function runCompressCommand(args: string[]): void {
  const options = parseCompressArgs(args);
  const documentContext = readDocumentContext(options.inputFile as string);
  const output = buildCompressionOutput(documentContext, options);
  const json = JSON.stringify(output, null, options.pretty ? 2 : 0);

  if (options.outputFile) {
    const absoluteOutputPath = path.resolve(process.cwd(), options.outputFile);
    fs.writeFileSync(absoluteOutputPath, `${json}\n`, "utf8");
    console.log(
      `✅ PayloadTOON compression output written to ${absoluteOutputPath}`,
    );
    return;
  }

  console.log(json);
}

function startServer(): void {
  const app = createServer();

  app.listen(env.PORT, () => {
    console.log(
      `🚀 PayloadTOON API running at http://localhost:${env.PORT}/api/v1`,
    );
  });
}

try {
  const [command, ...args] = process.argv.slice(2);

  if (command === "compress" || command === "toon") {
    runCompressCommand(args);
  } else if (command === "-h" || command === "--help") {
    printHelp();
  } else if (command) {
    throw new Error(`Unknown command: ${command}`);
  } else {
    startServer();
  }
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown CLI error.";
  console.error(`❌ ${message}`);
  process.exit(1);
}
