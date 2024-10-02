import type { AuthBindings } from "@refinedev/core";
import * as openpgp from 'openpgp';


import ms from "ms";
import { DateTime } from "luxon";
import { apiClient } from "./eden";

export const TOKEN_KEY = "refine-auth";

export const authProvider: AuthBindings = {
  login: async ({ phone, code, otpSecret, deviceToken }) => {
    try {
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
        let password = import.meta.env.VITE_CRYPTO_KEY!;
        const message = await openpgp.createMessage({ text: credentials });
        const encrypted = await openpgp.encrypt({
          message, // input as Message object
          passwords: [password], // multiple passwords possible
          format: 'armored' // don't ASCII armor (for Uint8Array output)
        });

        localStorage.setItem(TOKEN_KEY, encrypted);
        return { success: true, redirectTo: "/" };
      } else {
        return {
          success: false,
          error: "Invalid credentials",
        };
      }
    } catch (e: any) {
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
      let password = import.meta.env.VITE_CRYPTO_KEY!;
      const encryptedMessage = await openpgp.readMessage({
        armoredMessage: token
      });
      const { data: decrypted } = await openpgp.decrypt({
        message: encryptedMessage,
        passwords: [password],
        format: 'binary'
      });

      const decryptedString = new TextDecoder().decode(decrypted);
      var decryptedData = JSON.parse(decryptedString);
      if (decryptedData.token.accessTokenExpires) {
        let expiration = DateTime.fromMillis(
          decryptedData.token.expirationMillis
        ).minus({ minutes: 20 });
        if (DateTime.local() >= expiration) {
          try {
            const { data } = await apiClient.api.users["refresh-token"].post({
              refreshToken: decryptedData.token.refreshToken,
            });

            if (data) {
              let expirationAddition = parseInt(
                ms(data.token.accessTokenExpires).toString()
              );
              let expiration = DateTime.local().plus({
                milliseconds: expirationAddition,
              });
              data.token.expirationMillis = expiration.toMillis();
              let credentials = JSON.stringify(data);
              let password = import.meta.env.VITE_CRYPTO_KEY!;
              const message = await openpgp.createMessage({ text: credentials });
              const encrypted = await openpgp.encrypt({
                message,
                passwords: [password],
                format: 'armored'
              });

              localStorage.setItem(TOKEN_KEY, encrypted);
              return {
                authenticated: true,
              };
            }
          } catch (e) {
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
  getPermissions: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      let password = import.meta.env.VITE_CRYPTO_KEY!;
      const encryptedMessage = await openpgp.readMessage({
        armoredMessage: token
      });
      const { data: decrypted } = await openpgp.decrypt({
        message: encryptedMessage,
        passwords: [password], // decrypt with password
        format: 'binary' // output as Uint8Array
      });

      // binary to string
      const decryptedString = new TextDecoder().decode(decrypted);

      var decryptedData = JSON.parse(decryptedString);
      return decryptedData.access;
    }
    return null;
  },
  getIdentity: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      return null;
    }

    let password = import.meta.env.VITE_CRYPTO_KEY!;
    const encryptedMessage = await openpgp.readMessage({
      armoredMessage: token
    });
    const { data: decrypted } = await openpgp.decrypt({
      message: encryptedMessage,
      passwords: [password], // decrypt with password
      format: 'binary' // output as Uint8Array
    });

    // binary to string
    const decryptedString = new TextDecoder().decode(decrypted);

    var decryptedData = JSON.parse(decryptedString);
    return decryptedData;
  },
};
