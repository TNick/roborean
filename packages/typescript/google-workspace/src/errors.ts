/**
 * Raised when a stored entity cannot be found.
 */
export class NotFoundError extends Error {
  /**
   * @param message - Human-readable missing-entity description.
   */
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

/**
 * Raised when an idempotency or revision conflict occurs.
 */
export class ConflictError extends Error {
  /**
   * @param message - Human-readable conflict description.
   */
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

/**
 * Raised when Google Workspace access or configuration is invalid.
 */
export class GoogleWorkspaceError extends Error {
  /**
   * @param message - Human-readable configuration or API failure.
   */
  constructor(message: string) {
    super(message);
    this.name = "GoogleWorkspaceError";
  }
}
