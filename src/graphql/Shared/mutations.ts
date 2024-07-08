import {gql} from 'apollo-server-express';

export const mutations = gql`
  enum AllowedUploads {
    CUSTOMER_LOGO_UPLOAD
    WASTE_LOAD_PICTURE_UPLOAD
  }

  enum AllowedDeleteTypes {
    CUSTOMER_LOGO_UPLOAD
    WASTE_LOAD_PICTURE_UPLOAD
  }

  type Mutation {
    singleUpload(
      file: Upload!
      accessToken: String!
      uploadType: AllowedUploads
      documentId: String
    ): Response

    deleteFileFromBucket(
      fileUrl: String!
      accessToken: String!
      fileType: AllowedDeleteTypes!
      documentId: String
    ): Response
  }
`;
