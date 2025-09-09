/**
 * Simple password hashing utility using Web Crypto API
 * This provides basic security for password storage in the JSON data
 */

export class PasswordHasher {
  /**
   * Hash a password with an optional salt using SHA-256
   * @param password - The plain text password to hash
   * @param salt - Optional salt value (default is a fixed salt for simplicity)
   * @returns The hashed password as a hex string
   */
  public static async hashPassword(
    password: string,
    salt = '8940c93207a8584b243698fbf60fa394'
  ): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);

    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return hashHex;
  }

  /**
   * Verify a password against a stored hash and salt
   * @param password - The plain text password to verify
   * @param storedHash - The stored hash
   * @param salt - The salt used when creating the hash
   * @returns True if password matches, false otherwise
   */
  public static async verifyPassword(
    password: string,
    storedHash: string,
    salt?: string
  ): Promise<boolean> {
    const hash = await this.hashPassword(password, salt);
    return hash === storedHash;
  }
}
