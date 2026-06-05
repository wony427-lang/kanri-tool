export class UnauthenticatedError extends Error {
  readonly name = "UnauthenticatedError";

  constructor(message = "認証が必要です") {
    super(message);
  }
}

export class ForbiddenError extends Error {
  readonly name = "ForbiddenError";

  constructor(message = "権限がありません") {
    super(message);
  }
}
