import mongoose from 'mongoose';

const {Schema} = mongoose;

const PdfSchema = new Schema(
  {
    user: {type: Schema.Types.ObjectId, ref: 'User'},
    customerEmail: {type: String},
    pdfUrl: String,
    expireAt: {
      type: Date,
      default: Date.now,
      expires: 600, // Expire Document 10min from Creation
    },
  },
  {collection: 'pdfs', timestamps: true}
);

export default mongoose.model('Pdf', PdfSchema);
