import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './models/login.dto';
import { CurrentAuth } from '../../shared/http/current-auth.decorator';
import { TokenClaims } from '../../shared/ports/token-signer.port';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.auth.login(body.email, body.password, body.orgId);
  }

  @Post('logout')
  logout(@CurrentAuth() auth: TokenClaims) {
    return this.auth.logout(auth.jti, auth.orgId, auth.sub);
  }
}
