// Types
export {
  VALID_ELEMENTS,
  BST_RANGES,
  DIET_TYPES,
  InkMonSchema,
  type Element,
  type EvolutionStage,
  type DietType,
  type InkMon,
  type InkMonListItem,
  type FilterOptions,
} from "./types.js";

// Database
export {
  getDatabase,
  closeDatabase,
  getDatabasePath,
  setDatabasePath,
} from "./database.js";

// Schema
export { initializeDatabase } from "./schema.js";

// Validators
export {
  validateInkMon,
  validateBstCalculation,
  validateBstRange,
  type ValidationError,
} from "./validators.js";

// Queries
export {
  rowToInkMon,
  getAllInkMons,
  getInkMonByNameEn,
  getInkMonByDexNumber,
  searchInkMons,
  filterInkMons,
  listInkMonNamesEn,
  getNextDexNumber,
  getInkMonCount,
  addInkMon,
  updateInkMon,
  type AddInkMonResult,
  type UpdateInkMonResult,
} from "./queries.js";

// File Operations
export {
  getInkMonsDir,
  readInkMonFile,
  addInkMonFromFile,
  listLocalInkMonFiles,
  compareInkMon,
  batchCompareInkMons,
  syncInkMonFromFile,
  type CompareResult,
  type DiffItem,
  type BatchCompareItem,
  type SyncResult,
} from "./file-ops.js";
