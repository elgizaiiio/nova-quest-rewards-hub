import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";

export const CommandPalette = lazy(() => import("@/components/CommandPalette"));
export const ShortcutsHelp = lazy(() => import("@/components/ShortcutsHelp"));
export const SettingsShell = lazy(() =>
  import("@/components/settings/SettingsShell").then((m) => ({ default: m.SettingsShell })),
);
export const OfflineBanner = lazy(() => import("@/components/common/OfflineBanner"));
export const CookieConsent = lazy(() => import("@/components/common/CookieConsent"));
export const UnlimitedPromoBanner = lazy(() => import("@/components/promo/UnlimitedPromoBanner"));
export const Analytics = lazy(() => import("@vercel/analytics/react").then((m) => ({ default: m.Analytics })));
export const SpeedInsights = lazy(() => import("@vercel/speed-insights/react").then((m) => ({ default: m.SpeedInsights })));
export const AuthPage = lazy(() => import("@/pages/auth/AuthPage"));
export const AppleCallbackPage = lazy(() => import("@/pages/auth/AppleCallbackPage"));
export const OAuthCallbackPage = lazy(() => import("@/pages/auth/OAuthCallbackPage"));
export const OAuthAuthorizePage = lazy(() => import("@/pages/auth/OAuthAuthorizePage"));
export const ResetPasswordPage = lazy(() => import("@/pages/auth/ResetPasswordPage"));
export const ChangeEmailPage = lazy(() => import("@/pages/auth/ChangeEmailPage"));
export const ChangePasswordPage = lazy(() => import("@/pages/auth/ChangePasswordPage"));
export const TwoFactorPage = lazy(() => import("@/pages/auth/TwoFactorPage"));
export const MfaChallengePage = lazy(() => import("@/pages/auth/MfaChallengePage"));
export const DeleteAccountPage = lazy(() => import("@/pages/auth/DeleteAccountPage"));
export const AcceptInvitePage = lazy(() => import("@/pages/auth/AcceptInvitePage"));
export const ReferralRedirectPage = lazy(() => import("@/pages/auth/ReferralRedirectPage"));
export const LegalPage = lazy(() => import("@/pages/legal/LegalPage"));
export const AgentHubPage = lazy(() => import("@/pages/agent/AgentHubPage"));
