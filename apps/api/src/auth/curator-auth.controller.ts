import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { CuratorAuthService } from './curator-auth.service';

interface CuratorLoginDto {
  email: string;
  password: string;
}

interface CuratorForgotPasswordDto {
  email: string;
}

interface CuratorResetPasswordDto {
  token: string;
  password: string;
}

@Controller('curator/auth')
export class CuratorAuthController {
  constructor(private readonly curatorAuthService: CuratorAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: CuratorLoginDto) {
    const email = dto.email?.trim().toLowerCase();
    const password = dto.password ?? '';

    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const curator = await this.curatorAuthService.validateLogin(email, password);

    if (!curator) {
      throw new UnauthorizedException('Invalid curator credentials');
    }

    return {
      curatorId: curator.id,
      email: curator.email,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout() {
    return;
  }

  @Post('forgot')
  @HttpCode(HttpStatus.ACCEPTED)
  async forgotPassword(@Body() dto: CuratorForgotPasswordDto) {
    const email = dto.email?.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    await this.curatorAuthService.issuePasswordReset(email);

    return { resetRequested: true };
  }

  @Post('reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() dto: CuratorResetPasswordDto) {
    const token = dto.token?.trim();
    const password = dto.password ?? '';

    if (!token || !password) {
      throw new BadRequestException('Reset token and password are required');
    }

    await this.curatorAuthService.resetPassword(token, password);
  }
}
