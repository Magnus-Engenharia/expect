import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { useState } from "react";
import { Layout } from "./components/layout.tsx";
import { ToastProvider } from "./components/toast.tsx";
import { DashboardPage } from "./pages/dashboard.tsx";
import { TeamPage } from "./pages/team.tsx";
import { SettingsPage } from "./pages/settings.tsx";
import { BillingPage } from "./pages/billing.tsx";
import { FeaturesPage } from "./pages/features.tsx";
import {
  INITIAL_MEMBERS,
  INITIAL_FEATURE_FLAGS,
  INITIAL_INVOICES,
  PLANS,
  CURRENT_USER,
  type Member,
  type FeatureFlag,
  type Invoice,
  type UserProfile,
} from "./data.ts";

export const App = () => {
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>(INITIAL_FEATURE_FLAGS);
  const [invoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [currentPlanId, setCurrentPlanId] = useState("pro");
  const [currentUser, setCurrentUser] = useState<UserProfile>(CURRENT_USER);

  const currentPlan = PLANS.find((plan) => plan.id === currentPlanId) ?? PLANS[0];

  return (
    <BrowserRouter>
      <ToastProvider>
        <Layout currentUser={currentUser}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <DashboardPage
                  members={members}
                  featureFlags={featureFlags}
                  invoices={invoices}
                  currentPlan={currentPlan}
                  currentUser={currentUser}
                />
              }
            />
            <Route
              path="/team"
              element={
                <TeamPage members={members} setMembers={setMembers} currentUser={currentUser} />
              }
            />
            <Route
              path="/settings"
              element={<SettingsPage currentUser={currentUser} setCurrentUser={setCurrentUser} />}
            />
            <Route
              path="/billing"
              element={
                <BillingPage
                  currentPlan={currentPlan}
                  currentPlanId={currentPlanId}
                  setCurrentPlanId={setCurrentPlanId}
                  invoices={invoices}
                />
              }
            />
            <Route
              path="/features"
              element={
                <FeaturesPage featureFlags={featureFlags} setFeatureFlags={setFeatureFlags} />
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Layout>
      </ToastProvider>
    </BrowserRouter>
  );
};
