/* eslint-disable @typescript-eslint/naming-convention */
export enum AccountTypes {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum AccountSubTypes {
  BUSINESS_ADMIN = 'BUSINESS_ADMIN',
  DRIVER = 'DRIVER',
}

export enum ServerStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  WARNING = 'WARNING',
}

export enum SortType {
  DESCENDING = 'DESCENDING',
  ASCENDING = 'ASCENDING',
}

export enum AddedDoc {
  USER = 'USER',
  FLEET = 'FLEET',
}

export enum S3_BUCKET_FILENAME {
  CUSTOMER_LOGO_UPLOAD = 'CUSTOMER_LOGO_UPLOAD',
  WASTE_LOAD_PICTURE_UPLOAD = 'WASTE_LOAD_PICTURE_UPLOAD',
}

export enum S3_BUCKET_DOCUMENT_NAME {
  DOCUMENT_UPLOAD = 'DOCUMENT_UPLOAD',
}

export enum INVIATION_STATUS {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}
