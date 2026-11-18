import { createBrowserRouter } from "react-router-dom";
import { CheckEmailPage } from "../features/auth/CheckEmailPage";
import { ForgotPasswordPage } from "../features/auth/ForgotPasswordPage";
import { LoginPage } from "../features/auth/LoginPage";
import { RegisterPage } from "../features/auth/RegisterPage";
import { ResetPasswordPage } from "../features/auth/ResetPasswordPage";
import { VerifyEmailPage } from "../features/auth/VerifyEmailPage";
import { AdminPage } from "../features/admin/AdminPage";
import { FeedPage } from "../features/feed/FeedPage";
import { NewPostPage } from "../features/feed/NewPostPage";
import { PostDetailPage } from "../features/feed/PostDetailPage";
import { ProfilePage } from "../features/profile/ProfilePage";
import { SettingsPage } from "../features/profile/SettingsPage";
import { DesignKit } from "../pages/DesignKit";
import { NotFound } from "../pages/NotFound";
import { AppShell } from "./AppShell";
import { AuthLayout } from "./AuthLayout";
import { GuestOnly, RequireAuth, StaffOnly } from "./guards";

export const router = createBrowserRouter([
  // Signed-in screens
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <FeedPage /> },
          { path: "new", element: <NewPostPage /> },
          { path: "posts/:id", element: <PostDetailPage /> },
          { path: "u/:username", element: <ProfilePage /> },
          { path: "settings", element: <SettingsPage /> },
          {
            path: "admin",
            element: (
              <StaffOnly>
                <AdminPage />
              </StaffOnly>
            ),
          },
        ],
      },
    ],
  },

  // Signed-out screens
  {
    element: <AuthLayout />,
    children: [
      {
        element: <GuestOnly />,
        children: [
          { path: "login", element: <LoginPage /> },
          { path: "register", element: <RegisterPage /> },
          { path: "check-email", element: <CheckEmailPage /> },
          { path: "forgot-password", element: <ForgotPasswordPage /> },
        ],
      },
      // Reachable whether or not a session exists (opened from an email link).
      { path: "verify-email", element: <VerifyEmailPage /> },
      { path: "reset-password", element: <ResetPasswordPage /> },
    ],
  },

  // Style guide and 404
  { path: "design", element: <AppShellLessDesign /> },
  { path: "*", element: <NotFound /> },
]);

function AppShellLessDesign() {
  return (
    <div className="mx-auto max-w-xl px-4 py-4">
      <DesignKit />
    </div>
  );
}
