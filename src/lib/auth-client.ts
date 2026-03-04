import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_CONVEX_SITE_URL,
  plugins: [
    convexClient(),
    ...(Platform.OS === "web"
      ? []
      : [
          expoClient({
            scheme: Constants.expoConfig?.scheme as string,
            storagePrefix: Constants.expoConfig?.scheme as string,
            storage: SecureStore,
          }),
        ]),
  ],
});

export type Session = typeof authClient.$Infer.Session;
export type User = typeof authClient.$Infer.Session.user;
