import { SignJWT, jwtVerify } from "jose";

export async function signJwt(payload: any, expiresIn: string = "1h") {
  const alg = "HS256";
  let jwt = new SignJWT({
    ...payload,
    nbf: undefined,
    exp: undefined,
  })
    .setProtectedHeader({
      alg,
    })
    .setExpirationTime(expiresIn);
  const jwtSecret = new TextEncoder().encode(process.env.TOKEN_SECRET);
  return jwt.sign(jwtSecret);
}

export async function verifyJwt(token: string) {
  const alg = "HS256";
  const jwtSecret = new TextEncoder().encode(process.env.TOKEN_SECRET);
  return jwtVerify(token, jwtSecret, {
    // issuer: process.env.JWT_ISSUER,
    // audience: process.env.JWT_AUDIENCE,
    algorithms: [alg],
  });
}
