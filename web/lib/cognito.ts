/**
 * Cognito auth wrapper. Reads pool/client IDs from env vars, populated after
 * you run `python infra/scripts/manage.py up` (see README.md).
 *
 * Deliberately collects only email + password at signup — no real-name field,
 * per docs/PRD.md principle #1 (pseudonymous by design). The Anonymous Identity
 * (interest-generated name) is written separately to the DynamoDB profile,
 * never to Cognito's user attributes — see docs/Architecture.md section 4.
 */

import {
  CognitoUserPool,
  CognitoUserAttribute,
  CognitoUser,
  AuthenticationDetails,
} from "amazon-cognito-identity-js";

function getPool() {
  const UserPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
  const ClientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;

  if (!UserPoolId || !ClientId) {
    throw new Error(
      "Cognito not configured. Run `python infra/scripts/manage.py up`, then set " +
        "NEXT_PUBLIC_COGNITO_USER_POOL_ID and NEXT_PUBLIC_COGNITO_CLIENT_ID in web/.env.local"
    );
  }

  return new CognitoUserPool({ UserPoolId, ClientId });
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
 * The current session's ID token — attach as `Authorization: Bearer <token>`
 * for any @require_auth-protected backend endpoint (currently just moderator
 * resolve-report actions, see backend/app/auth.py and README.md's Phase 20
 * section for the full picture of what is and isn't protected yet).
 * Resolves null if there's no active session — callers should treat that as
 * "not signed in" rather than throwing.
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

export function getCurrentUserSub(): Promise<string | null> {
  return new Promise((resolve) => {
    const user = getPool().getCurrentUser();
    if (!user) return resolve(null);

    user.getSession((err: Error | null, session: any) => {
      if (err || !session) return resolve(null);
      resolve(session.getIdToken().decodePayload().sub);
    });
  });
}

export function signOut(): void {
  const user = getPool().getCurrentUser();
  if (user) {
    user.signOut();
  }
}
