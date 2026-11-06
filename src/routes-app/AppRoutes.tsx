import { Route, Navigate } from "react-router-dom";
import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";
import { ProtectedRoute } from "./routeHelpers";
import { AnimatedShell } from "./AnimatedShell";
import {
  AuthPage,
  OAuthCallbackPage,
  AppleCallbackPage,
  OAuthAuthorizePage,
  ResetPasswordPage,
  ChangeEmailPage,
  ChangePasswordPage,
  TwoFactorPage,
  MfaChallengePage,
  DeleteAccountPage,
  AcceptInvitePage,
  ReferralRedirectPage,
  LegalPage,
  AgentHubPage,
} from "./lazyPages";

const CeyoLanding = lazy(() => import("@/pages/ceyo/CeyoLanding"));
const ZzForm = lazy(() => import("@/pages/zz/FormPreview"));
const CeyoSettings = lazy(() => import("@/pages/ceyo/CeyoSettings"));

const guard = (el: React.ReactNode, guest?: string) => <ProtectedRoute guestEntry={guest}>{el}</ProtectedRoute>;
const home = <Navigate to="/" replace />;

/** Ceyo: landing, sign-in, the bot home and settings. Everything else returns home. */
export const AppRoutes = (_props: { currentUserId: string | null }) => (
  <>
    <Route path="/" element={guard(<AgentHubPage />, "/welcome")} />
    <Route path="/index" element={guard(<AgentHubPage />, "/welcome")} />
    <Route path="/zzform" element={<ZzForm />} />
    <Route path="/welcome" element={<CeyoLanding />} />
    <Route path="/landing" element={<CeyoLanding />} />

    <Route element={<AnimatedShell />}>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/signin" element={<AuthPage />} />
      <Route path="/signup" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />
      <Route path="/auth/apple-callback" element={<AppleCallbackPage />} />
      <Route path="/auth/callback/:provider" element={<OAuthCallbackPage />} />
      <Route path="/auth/mfa" element={<MfaChallengePage />} />
      <Route path="/oauth/authorize" element={<OAuthAuthorizePage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/invite/:token" element={<AcceptInvitePage />} />
      <Route path="/ref/:code" element={<ReferralRedirectPage />} />
      <Route path="/r/:code" element={<ReferralRedirectPage />} />
      <Route path="/settings/change-email" element={guard(<ChangeEmailPage />)} />
      <Route path="/settings/change-password" element={guard(<ChangePasswordPage />)} />
      <Route path="/settings/two-factor" element={guard(<TwoFactorPage />)} />
      <Route path="/settings/delete-account" element={guard(<DeleteAccountPage />)} />
    </Route>

    <Route path="/settings" element={guard(<CeyoSettings />)} />
    <Route path="/settings/:section" element={guard(<CeyoSettings />)} />
    <Route path="/settings/:section/:sub" element={guard(<CeyoSettings />)} />

    <Route path="/terms" element={<LegalPage slug="terms" />} />
    <Route path="/privacy" element={<LegalPage slug="privacy" />} />

    <Route path="/chat" element={home} />
    <Route path="*" element={home} />
  </>
);
