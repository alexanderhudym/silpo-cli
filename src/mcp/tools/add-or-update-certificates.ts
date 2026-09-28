
export const ADD_OR_UPDATE_CERTIFICATES = "silpo_add_or_update_certificates";

export type CertificateInput = {
  barcode: string;
  pincode?: string;
};

export type AddOrUpdateCertificatesArgs = {
  shoppingCartId: string;
  certificatesToAdd?: CertificateInput[];
  certificatesToRemove?: CertificateInput[];
};

export type CertificateValidation = {
  type: string;
  level: string;
  message: string;
  context?: Record<string, unknown>;
};

export type AddedCertificate = {
  barcode: string;
  faceValue: number | null;
  validations: CertificateValidation[];
};

export type AddOrUpdateCertificatesResult = {
  success: boolean;
  summary: string;
  added: AddedCertificate[];
  removed: string[];
};
