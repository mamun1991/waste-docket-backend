import {ReadStream} from 'fs-capacitor';

export type AccessToken = {
  UserId: string;
  iat: Number;
  exp: Number;
};
export type File = {
  file: {
    filename: string;
    mimetype: string;
    encoding: string;
    createReadStream(): ReadStream;
  };
};

export type Response = {
  message: string;
  status: Number;
};

export interface IUploader {
  singleFileUploadResolver: (parent, {file}: {file: Promise<File>}) => Promise<Response>;
}

export interface ILinkGenerator {
  generateFileAccessLink: (
    parent,
    {fileUrl, fileType}: {fileUrl: string; fileType: string}
  ) => Promise<string>;
}
