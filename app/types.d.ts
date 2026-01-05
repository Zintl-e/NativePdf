declare module "@jspawn/qpdf-wasm" {
  export class QPDF {
    static create(): Promise<QPDF>;
    encrypt(
      input: Uint8Array,
      options: {
        userPassword?: string;
        ownerPassword?: string;
        encryptionLevel?: 40 | 128 | 256;
      }
    ): Promise<Uint8Array>;
  }
}

declare module "file-saver" {
  export function saveAs(data: Blob | File, filename?: string, disableAutoBOM?: boolean): void;
}

declare module 'formidable';