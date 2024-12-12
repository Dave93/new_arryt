import * as openpgp from 'openpgp';
import { apiClient } from "../eden";
import ms from "ms";
import { DateTime } from "luxon";
export const TOKEN_KEY = "refine-auth";

export const refreshToken = async () => {
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
            const { data } = await apiClient.api.users["refresh_token"].post({
              refresh_token: decryptedData.token.refreshToken,
            });

            if (data) {
              let newData = {
                ...decryptedData,
                token: data
              }
              let expirationAddition = parseInt(
                ms(newData.token.accessTokenExpires).toString()
              );
              let expiration = DateTime.local().plus({
                milliseconds: expirationAddition,
              });
              newData.token.expirationMillis = expiration.toMillis();
              let credentials = JSON.stringify(newData);
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
};