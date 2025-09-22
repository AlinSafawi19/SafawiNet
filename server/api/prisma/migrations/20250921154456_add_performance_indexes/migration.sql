-- CreateIndex
CREATE INDEX "email_logs_email_status_idx" ON "public"."email_logs"("email", "status");

-- CreateIndex
CREATE INDEX "email_logs_email_type_idx" ON "public"."email_logs"("email", "type");

-- CreateIndex
CREATE INDEX "loyalty_accounts_userId_idx" ON "public"."loyalty_accounts"("userId");

-- CreateIndex
CREATE INDEX "loyalty_accounts_lifetimePoints_idx" ON "public"."loyalty_accounts"("lifetimePoints");

-- CreateIndex
CREATE INDEX "loyalty_accounts_tierUpgradedAt_idx" ON "public"."loyalty_accounts"("tierUpgradedAt");

-- CreateIndex
CREATE INDEX "loyalty_tiers_name_idx" ON "public"."loyalty_tiers"("name");

-- CreateIndex
CREATE INDEX "loyalty_tiers_maxPoints_idx" ON "public"."loyalty_tiers"("maxPoints");

-- CreateIndex
CREATE INDEX "loyalty_transactions_orderId_idx" ON "public"."loyalty_transactions"("orderId");

-- CreateIndex
CREATE INDEX "loyalty_transactions_points_idx" ON "public"."loyalty_transactions"("points");

-- CreateIndex
CREATE INDEX "refresh_sessions_userId_isActive_idx" ON "public"."refresh_sessions"("userId", "isActive");

-- CreateIndex
CREATE INDEX "refresh_sessions_userId_expiresAt_idx" ON "public"."refresh_sessions"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "refresh_sessions_createdAt_idx" ON "public"."refresh_sessions"("createdAt");

-- CreateIndex
CREATE INDEX "user_sessions_deviceType_idx" ON "public"."user_sessions"("deviceType");

-- CreateIndex
CREATE INDEX "user_sessions_browser_idx" ON "public"."user_sessions"("browser");

-- CreateIndex
CREATE INDEX "user_sessions_os_idx" ON "public"."user_sessions"("os");

-- CreateIndex
CREATE INDEX "user_sessions_ipAddress_idx" ON "public"."user_sessions"("ipAddress");

-- CreateIndex
CREATE INDEX "user_sessions_createdAt_idx" ON "public"."user_sessions"("createdAt");

-- CreateIndex
CREATE INDEX "users_isVerified_idx" ON "public"."users"("isVerified");

-- CreateIndex
CREATE INDEX "users_twoFactorEnabled_idx" ON "public"."users"("twoFactorEnabled");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "public"."users"("createdAt");

-- CreateIndex
CREATE INDEX "users_roles_idx" ON "public"."users"("roles");

-- CreateIndex
CREATE INDEX "users_email_isVerified_idx" ON "public"."users"("email", "isVerified");
