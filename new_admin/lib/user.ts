import { apiClient } from "./eden-client";

export const sendOtp = async (phone: string) => {
  const response = await apiClient.api.users['send-otp'].post({
      phone,
  });
  return response;
};

export const verifyOtp = async (phone: string, code: string, otpSecret: string, tgId: number | undefined) => {
  const response = await apiClient.api.users['verify-otp'].post({
    phone,
    otp: code,
    verificationKey: otpSecret,
    tgId: tgId,
  });
  return response;
};
