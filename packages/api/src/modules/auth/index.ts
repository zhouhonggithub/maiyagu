export { authRoutes } from './routes';
export * as authService from './service';
export * as authRepo from './repository';
export {
  loginSchema,
  passwordLoginSchema,
  wechatLoginSchema,
  refreshSchema,
} from './schema';
export type {
  LoginInput,
  PasswordLoginInput,
  WechatLoginInput,
  RefreshInput,
} from './schema';
