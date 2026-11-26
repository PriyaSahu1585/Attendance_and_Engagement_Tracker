export async function checked<T>(request: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<{ data: T; error: null }> {
  const result = await request;
  if (result.error) throw new Error(result.error.message);
  return { data: result.data, error: null };
}