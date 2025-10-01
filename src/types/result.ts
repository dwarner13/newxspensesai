export type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

export const Ok = <T>(value: T): Result<T> => ({ ok: true, value});
export const Err = <E>(error: E): Result<never, E> => ({ ok: false, error});

export async function wrapAsync<T>(
  fn: () => Promise<T>
): Promise<Result<T>> {
  try {
    const value = await fn();
    return Ok(value);
  } catch (error) {
    return Err(error as Error);
  }
}
