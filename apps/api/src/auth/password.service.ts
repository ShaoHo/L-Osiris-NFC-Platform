import { BadRequestException, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class PasswordService {
  async hashPassword(password: string): Promise<string> {
    if (!password) {
      throw new BadRequestException('Password is required');
    }

    return argon2.hash(password, { type: argon2.argon2id });
  }

  async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    if (!password || !storedHash) {
      return false;
    }

    return argon2.verify(storedHash, password);
  }
}
