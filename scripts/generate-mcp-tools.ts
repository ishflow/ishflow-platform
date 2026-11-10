/**
 * Walks the DSL registry and emits packages/mcp-tools/src/generated/*.ts.
 * Run via `pnpm generate:mcp`.
 *
 * This file is intentionally a thin entry point: each domain has its own
 * generator module under `scripts/generate-mcp-tools/`. Adding a new domain
 * (e.g. register, report) means dropping a new module under that folder and
 * calling its `generate*ToolsFile()` here — no edits to the existing modules.
 *
 * Determinism: each domain generator sorts its config ids alphabetically before
 * emission so the generated files diff cleanly across runs.
 */

// Side-effect import populates the registry. Without it, getRegistry().catalog
// / getRegistry().document return empty records and the emitted enums would be
// single empty literals.
import '@/configs';

import { generateCatalogToolsFile } from './generate-mcp-tools/catalog';
import { generateDocumentToolsFile } from './generate-mcp-tools/document';
import { generateRegisterToolsFile } from './generate-mcp-tools/register';
import { generateReportToolsFile } from './generate-mcp-tools/report';

generateCatalogToolsFile();
generateDocumentToolsFile();
generateRegisterToolsFile();
generateReportToolsFile();
