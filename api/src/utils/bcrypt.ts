import { randomBytes, pbkdf2, createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { JwtPayload } from "./jwt-payload.dto";
import { TokenDto } from "../modules/user/users.dto";
async function hashPassword(
  password: string
): Promise<{ hash: string; salt: string }> {
  const salt = randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    pbkdf2(password, salt, 1000, 64, "sha512", (error, derivedKey) => {
      if (error) {
        return reject(error);
      }
      return resolve({ hash: derivedKey.toString("hex"), salt });
    });
  });
}

async function comparePassword(
  password: string,
  salt: string,
  hash: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    pbkdf2(password, salt, 1000, 64, "sha512", (error, derivedKey) => {
      if (error) {
        return reject(error);
      }
      return resolve(hash === derivedKey.toString("hex"));
    });
  });
}

function md5hash(text: string) {
  return createHash("md5").update(text).digest("hex");
}

async function signJwt(payload: any, expiresIn: string = "1h") {
  const alg = "HS256";
  let jwt = new SignJWT({
    ...payload
  })
    .setProtectedHeader({
      alg,
    })
    .setIssuedAt()
    .setIssuer(process.env.JWT_ISSUER!) // issuer
    .setAudience(process.env.JWT_AUDIENCE!) // audience
    .setExpirationTime(expiresIn);
  const jwtSecret = new TextEncoder().encode(process.env.JWT_SECRET);
  return jwt.sign(jwtSecret);
}

async function verifyJwt(token: string) {
  const alg = "HS256";
  const jwtSecret = new TextEncoder().encode(process.env.JWT_SECRET);
  return jwtVerify(token, jwtSecret, {
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
  });
}

async function generateAuthToken(payload: JwtPayload): Promise<TokenDto> {
  const accessTokenExpires = process.env.ACCESS_TOKEN_EXPIRES_IN!;
  const refreshTokenExpires = process.env.REFRESH_TOKEN_EXPIRES_IN!;
  const tokenType = process.env.TOKEN_TYPE!;
  const accessToken = await signJwt(payload, accessTokenExpires);
  const refreshToken = await signJwt(payload, refreshTokenExpires);

  return {
    tokenType,
    accessToken,
    accessTokenExpires,
    refreshToken,
  };
}

export {
  hashPassword,
  comparePassword,
  md5hash,
  signJwt,
  verifyJwt,
  generateAuthToken,
};
