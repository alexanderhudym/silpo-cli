import type { Certificate } from "../entities/certificate.js";

export const GET_MY_CERTIFICATES = "silpo_get_my_certificates";

export type GetMyCertificatesArgs = {
  limit?: number;
  offset?: number;
};

export type GetMyCertificatesResult = {
  success: boolean;
  summary: string;
  certificates: Certificate[];
};
