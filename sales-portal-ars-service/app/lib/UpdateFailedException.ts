class UpdateFailedException extends Error {
  constructor(message) {
    super(message);
    this.name = "UpdateFailedException";
    Error.captureStackTrace(this, this.constructor);
  }
}

export default UpdateFailedException;