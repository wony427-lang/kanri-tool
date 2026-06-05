export class NotFoundError extends Error {
  readonly name = "NotFoundError";

  constructor(message = "見つかりません") {
    super(message);
  }
}

export class ValidationError extends Error {
  readonly name = "ValidationError";
  readonly fieldErrors: Record<string, string>;

  constructor(
    message = "入力内容に誤りがあります",
    fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.fieldErrors = fieldErrors;
  }
}
