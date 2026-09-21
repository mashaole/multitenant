import { applyDecorators, SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'required_permission';
export const MODULE_KEY = 'required_module';

export function RequiresPermission(permission: string, moduleKey?: string) {
  return moduleKey
    ? applyDecorators(
        SetMetadata(PERMISSION_KEY, permission),
        SetMetadata(MODULE_KEY, moduleKey),
      )
    : applyDecorators(SetMetadata(PERMISSION_KEY, permission));
}
