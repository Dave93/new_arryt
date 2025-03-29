import {
  createCipheriv,
  createDecipheriv,
  scryptSync
} from "crypto";
export const encode = (string: string) => {
  let password = process.env.CRYPTO_KEY!;
  // var iv = Buffer.from(this.configService.get<string>('CRYPTO_IV'));
  // var ivstring = iv.toString('hex');
  const iv = Buffer.alloc(16, 0);
  const key = scryptSync(password, "GfG", 24);
  var cipher = createCipheriv("aes-192-cbc", key, iv);
  var part1 = cipher.update(string, "utf8");
  var part2 = cipher.final();
  const encrypted = Buffer.concat([part1, part2]).toString("base64");
  return encrypted;
};

export const decode = (string: string) => {
  let password = process.env.CRYPTO_KEY!;
  const iv = Buffer.alloc(16, 0);
  const key = scryptSync(password, "GfG", 24);
  var decipher = createDecipheriv("aes-192-cbc", key, iv);
  var decrypted = decipher.update(string, "base64", "utf8");
  decrypted += decipher.final();
  return decrypted;
};
