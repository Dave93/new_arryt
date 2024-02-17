import type { AuthBindings } from "@refinedev/core";
import { gql } from "graphql-request";
import { client } from "./graphConnect";
import { AES, enc } from "crypto-js";

import ms from "ms";
import { DateTime } from "luxon";
import { apiClient } from "./eden";

export const TOKEN_KEY = "refine-auth";

export const authProvider: AuthBindings = {
  login: async ({ phone, code, otpSecret, deviceToken }) => {
    console.log('davr')
    try {
      console.log('phone', phone);
      console.log('code', phone);
      const { data } = await apiClient.api.users["verify-otp"].post({
        otp: code,
        phone,
        verificationKey: otpSecret,
      });
      if (data) {
        let expirationAddition = parseInt(
          ms(data!.token!.accessTokenExpires).toString()
        );
        let expiration = DateTime.local().plus({
          milliseconds: expirationAddition,
        });
        data!.token!.expirationMillis = expiration.toMillis();
        let credentials = JSON.stringify(data);
        let password = process.env.REACT_APP_CRYPTO_KEY!;
        const encrypted = AES.encrypt(credentials, password).toString();

        localStorage.setItem(TOKEN_KEY, encrypted);
        return { success: true, redirectTo: "/" };
      } else {
        return {
          success: false,
          error: "Invalid credentials",
        };
      }
    } catch (e: any) {
      console.log('login error', e);
      return {
        success: false,
        error: e.response.errors.map((e: any) => e.message).join("\n"),
      };
    }
  },
  logout: async (params) => {
    localStorage.removeItem(TOKEN_KEY);
    return {
      success: true,
      redirectTo: "/login",
    };
  },
  onError: async (error) => {
    return { error };
  },
  check: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      let password = process.env.REACT_APP_CRYPTO_KEY!;
      var bytes = AES.decrypt(token, password);
      var decryptedData = JSON.parse(bytes.toString(enc.Utf8));
      if (decryptedData.token.accessTokenExpires) {
        let expiration = DateTime.fromMillis(
          decryptedData.token.expirationMillis
        );
        if (DateTime.local() > expiration) {
          try {
            let query = gql`
            mutation {
              refreshToken(
                refreshToken: "${decryptedData.token.refreshToken}"
              ) {
                accessToken
                accessTokenExpires
                refreshToken
                tokenType
              }
            }
          `;
            const data = await client.request(query);
            let expirationAddition = parseInt(
              ms(data.refreshToken.accessTokenExpires)
            );
            let expiration = DateTime.local().plus({
              milliseconds: expirationAddition,
            });
            decryptedData.token = data.refreshToken;
            decryptedData.token.expirationMillis = expiration.toMillis();
            let credentials = JSON.stringify(decryptedData);
            let password = process.env.REACT_APP_CRYPTO_KEY!;
            const encrypted = AES.encrypt(credentials, password).toString();

            localStorage.setItem(TOKEN_KEY, encrypted);
            return {
              authenticated: true,
            };
          } catch (e) {
            console.log("auth error", e);
            return {
              authenticated: false,
              error: new Error("Invalid token"),
              logout: true,
              redirectTo: "/login",
            };
          }
        }
      }
      return {
        authenticated: true,
      };
    }

    return {
      authenticated: false,
      error: new Error("Invalid token"),
      logout: true,
      redirectTo: "/login",
    };
  },
  getPermissions: () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      let password = process.env.REACT_APP_CRYPTO_KEY!;
      var bytes = AES.decrypt(token, password);
      var decryptedData = JSON.parse(bytes.toString(enc.Utf8));
      return decryptedData.access;
    }
    return null;
  },
  getIdentity: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      return null;
    }

    let password = process.env.REACT_APP_CRYPTO_KEY!;
    var bytes = AES.decrypt(token, password);
    var decryptedData = JSON.parse(bytes.toString(enc.Utf8));
    return decryptedData;
  },
};
