/**
 * Cognito auth wrapper — mobile's own independent implementation (per your
 * answer: web and mobile are fully separate codebases hitting the same backend).
 * Mirrors web/lib/cognito.ts's shape and principles exactly, but is NOT shared
 * code — matches docs/PRD.md principle #1 (pseudonymous by design): only email +
 * password collected, never a real name.
 *
 * Requires 'react-native-get-random-values' imported once at the app entry point
 * (see index.ts) — amazon-cognito-identity-js needs crypto.getRandomValues,
 * which isn't present in React Native's JS engine by default.
 */

import {
  CognitoUserPool,
  CognitoUserAttribute,
  CognitoUser,
  AuthenticationDetails,
} from "amazon-cognito-identity-js";
import Constants from "expo-constants";

let poolInstance: CognitoUserPool | null = null;
let initPromise: Promise<void> | null = null;

function getPool() {
  if (poolInstance) return poolInstance;

  const UserPoolId = Constants.expoConfig?.extra?.cognitoUserPoolId as string | undefined;
  const ClientId = Constants.expoConfig?.extra?.cognitoClientId as string | undefined;

  if (!UserPoolId || !ClientId) {
    throw new Error(
      "Cognito not configured. Run `python infra/scripts/manage.py up` in the backend, then set " +
        "cognitoUserPoolId and cognitoClientId under `extra` in mobile/app.json"
    );
  }

  poolInstance = new CognitoUserPool({ UserPoolId, ClientId });
  return poolInstance;
}

export function initAuth(): Promise<void> {
  if (initPromise) return initPromise;
  
  const syncPromise = new Promise<void>((resolve) => {
    try {
      const pool = getPool();
      const storage = (pool as any).storage;
      if (storage && typeof storage.sync === "function") {
        storage.sync((err: any) => {
          if (err) {
            console.warn("Failed to sync Cognito storage:", err);
          }
          resolve();
        });
      } else {
        resolve();
      }
    } catch (e) {
      console.warn("Failed to initialize Cognito pool in initAuth:", e);
      resolve();
    }
  });

  const timeoutPromise = new Promise<void>((resolve) => {
    setTimeout(() => {
      console.warn("Cognito storage sync timed out after 1500ms");
      resolve();
    }, 1500);
  });

  initPromise = Promise.race([syncPromise, timeoutPromise]);
  return initPromise;
}

export function signUp(email: string, password: string): Promise<CognitoUser> {
  return new Promise((resolve, reject) => {
    const attributeList = [new CognitoUserAttribute({ Name: "email", Value: email })];

    getPool().signUp(email, password, attributeList, [], (err, result) => {
      if (err || !result) return reject(err);
      resolve(result.user);
    });
  });
}

export function confirmSignUp(email: string, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: getPool() });
    user.confirmRegistration(code, true, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export function signIn(email: string, password: string): Promise<CognitoUser> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: getPool() });
    const authDetails = new AuthenticationDetails({ Username: email, Password: password });

    user.authenticateUser(authDetails, {
      onSuccess: () => resolve(user),
      onFailure: (err) => reject(err),
    });
  });
}

/**
 * The Cognito `sub` — used as the backend's user_id everywhere (see
 * backend/app/models/user.py). Requires an active session, i.e. called after
 * signIn() succeeds.
 */
export function getCurrentUserId(): Promise<string> {
  return new Promise((resolve, reject) => {
    const user = getPool().getCurrentUser();
    if (!user) return reject(new Error("No signed-in user."));

    user.getSession((err: Error | null, session: { getIdToken: () => { payload: { sub: string } } } | null) => {
      if (err || !session) return reject(err || new Error("No session."));
      resolve(session.getIdToken().payload.sub);
    });
  });
}

export function isSignedIn(): boolean {
  return getPool().getCurrentUser() !== null;
}

/**
 * The current session's ID token — attach as `Authorization: Bearer <token>`
 * for any @require_auth-protected backend endpoint (currently just moderator
 * resolve-report actions — see backend/app/auth.py and README.md's Phase 20
 * section). Resolves null if there's no active session.
 */
export function getCurrentIdToken(): Promise<string | null> {
  return new Promise((resolve) => {
    const user = getPool().getCurrentUser();
    if (!user) return resolve(null);

    user.getSession((err: Error | null, session: { getIdToken: () => { getJwtToken: () => string } } | null) => {
      if (err || !session) return resolve(null);
      resolve(session.getIdToken().getJwtToken());
    });
  });
}

export function signOut(): void {
  const user = getPool().getCurrentUser();
  if (user) {
    user.signOut();
  }
}
