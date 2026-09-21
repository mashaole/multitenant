export const TOKEN_HASHER = Symbol('TOKEN_HASHER');

export interface ITokenHasher {
  hash(value: string): string;
}
