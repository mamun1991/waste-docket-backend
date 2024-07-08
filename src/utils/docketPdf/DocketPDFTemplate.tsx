import React from 'react';
import {Document, Page, View, Text, StyleSheet, Image, pdf} from '@react-pdf/renderer';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import sgMail from '@sendgrid/mail';
import AwsSecrets from '../getAwsSecrets';
dayjs.extend(utc);
dayjs.extend(timezone);
const styles = StyleSheet.create({
  page: {
    padding: '1.5cm',
  },
  docketNumberRow: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: '12px',
    marginBottom: '0.2cm',
  },
  containerRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: '12px',
    width: '100%',
  },
  noWasteOrderNumberAndDateRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: '12px',
  },
  containerColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0px',
  },
  boxRow: {
    fontSize: '12px',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  customerboxRow: {
    fontSize: '12px',
    display: 'flex',
    flexDirection: 'row',
  },
  customerLabel: {
    fontWeight: 'bold',
    width: 105,
  },
  customerValue: {
    marginLeft: '0.2cm',
    width: 400,
  },
  boxRowWasteDesc: {
    fontSize: '12px',
    display: 'flex',
    flexDirection: 'row',
    gap: 0,
  },
  wasteDesctptionLabel: {
    width: 190,
  },
  wasteDescvalue: {
    width: '100%',
  },
  wasteLabel: {
    width: 130,
  },
  boxRowFacilityRep: {
    fontSize: '12px',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '28px',
    padding: '6px',
  },
  boxColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    fontSize: '12px',
  },
  boxGeneralDescColumn: {
    display: 'flex',
    flexDirection: 'row',
    gap: '5px',
    fontSize: '12px',
    width: 350,
  },
  generalPickupLabe: {
    marginRight: 60,
  },
  headerLeft: {
    padding: 16,
    fontSize: 32,
    marginBottom: '0.5cm',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    width: '50%',
    height: '150px',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    border: '1px solid #DDDDDD',
  },
  headerRight: {
    fontSize: '12px',
    marginBottom: '0.5cm',
    width: '50%',
    display: 'flex',
    flexWrap: 'wrap',
    wordWrap: 'break-word',
    gap: '5px',
    flexDirection: 'column',
    padding: '8px',
    border: '1px solid #DDDDDD',
  },
  customerNameAndAddress: {
    marginBottom: '0.5cm',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '6px',
    border: '1px solid gray',
    width: '100%',
  },
  orderNumber: {
    marginBottom: '0.5cm',
    padding: '6px',
    border: '1px solid gray',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    width: '120px',
  },
  orderNumberFullWidth: {
    marginBottom: '0.5cm',
    padding: '6px',
    border: '1px solid gray',
    width: 250,
  },
  date: {
    marginBottom: '0.5cm',
    padding: '6px',
    border: '1px solid gray',
    width: '120px',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateFullWidth: {
    marginBottom: '0.5cm',
    padding: '6px',
    border: '1px solid gray',
    width: 250,
  },
  driverName: {
    marginBottom: '0.5cm',
    padding: '6px',
    border: '1px solid gray',
    width: '260px',
  },
  vehicleReg: {
    padding: '6px',
    border: '1px solid gray',
    width: '100%',
  },
  destinationFacility: {
    marginBottom: '0.5cm',
    padding: '6px',
    border: '1px solid gray',
    width: '100%',
  },
  signatureLabel: {
    fontWeight: 'bold',
  },
  signatureAndBlockLetter: {
    marginBottom: '0.5cm',
    display: 'flex',
    flexDirection: 'row',
    padding: '6px',
    border: '1px solid gray',
    width: '50%',
    fontSize: '12px',
    alignItems: 'center',
  },
  customerSignatureAndBlockLetter: {
    marginBottom: '0.5cm',
    display: 'flex',
    flexDirection: 'row',
    padding: '6px',
    border: '1px solid gray',
    width: '100%',
    fontSize: '12px',
    alignItems: 'center',
  },
  facilityRep: {
    marginBottom: '0.5cm',
    display: 'flex',
    flexDirection: 'row',
    padding: '6px',
    border: '1px solid gray',
    width: '50%',
    fontSize: '12px',
    alignItems: 'center',
  },
  signatureImage: {
    width: 176,
    height: 64,
    objectFit: 'contain',
  },
  wasteLoadPicture: {
    marginLeft: '0.2cm',
    maxWidth: 250,
    maxHeight: 250,
    objectFit: 'contain',
  },
  additionalInfoContainer: {
    marginBottom: '0.5cm',
    border: '1px solid gray',
    padding: '6px',
    fontSize: 12,
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
  },
  additionalInfoLabel: {
    width: 130,
  },
  additionalInfoDetail: {
    width: 370,
  },
  wasteDescription: {
    marginBottom: '0.5cm',
    border: '1px solid gray',
    padding: '6px',
  },
  excludedMaterialHeading: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: '20px',
  },
  excludedMaterialDefinition: {
    padding: '6px',
    border: '1px solid gray',
    margin: '10px 0 0px 0',
  },
  permitHolderName: {
    fontWeight: 'bold',
    width: '30%',
  },
  label: {
    fontWeight: 'bold',
  },
  driverLabel: {
    fontWeight: 'bold',
    width: '105px',
  },
  value: {
    marginLeft: '0.2cm',
  },
  permitHolderNameValue: {
    width: '70%',
  },
  driverValue: {
    width: '195px',
  },
  addressValue: {
    width: '70%',
    marginLeft: '0.7cm',
  },
  telephoneValue: {
    marginLeft: '0.4cm',
  },
  vatValue: {
    marginLeft: '0.6cm',
  },
  epaNumberValue: {
    marginLeft: '0.7cm',
  },
  permitNumberValue: {
    marginLeft: '0.5cm',
  },
  marginTopLarge: {
    marginTop: 15,
  },
  cursivefontValue: {
    fontFamily: 'Times-Italic',
    fontSize: 17,
    marginLeft: '0.2cm',
  },
});
const MyDocument = ({data}) => (
  <Document>
    <Page size='A4' style={styles.page}>
      <View style={styles.docketNumberRow} wrap={false}>
        <View />
      </View>
      <View style={styles.containerRow}>
        <View style={styles.headerLeft}>
          {data?.permitHolderLogo ? (
            <Image src={data?.permitHolderLogo} />
          ) : (
            <Image src='https://30mins-stage-images.s3.us-east-2.amazonaws.com/271223clqnoqm8u0000tku7fr4e4ixy.png' />
          )}
        </View>

        <View style={styles.headerRight}>
          {data?.permitHolderName && (
            <View style={styles.boxRow}>
              <Text style={styles.permitHolderName}>Name:</Text>
              <Text style={styles.permitHolderNameValue}>{data?.permitHolderName}</Text>
            </View>
          )}
          <View style={styles.boxRow}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.addressValue}>{data?.permitHolderAddress}</Text>
          </View>
          <View style={styles.boxRow}>
            <Text style={styles.label}>Telephone:</Text>
            <Text style={styles.telephoneValue}>{data?.permitHolderContactDetails}</Text>
          </View>
          <View style={styles.boxRow}>
            <Text style={styles.label}>Permit No:</Text>
            <Text style={styles.permitNumberValue}>{data?.permitNumber}</Text>
          </View>
        </View>
      </View>

      <View style={styles.customerNameAndAddress}>
        <View style={styles.customerboxRow}>
          <Text style={styles.customerLabel}>Customer Name:</Text>
          <Text style={styles.customerValue}>{data.customerName}</Text>
        </View>
        <View style={styles.customerboxRow}>
          <Text style={styles.customerLabel}>Customer Address:</Text>
          <Text style={styles.customerValue}>{`${
            data?.customerAddress ? `${data.customerAddress}, ` : ''
          } ${data?.customerStreet ? `${data.customerStreet}, ` : ''}${
            data?.customerCity ? `${data.customerCity}, ` : ''
          }${data?.customerCounty ? `${data.customerCounty}, ` : ''}${
            data?.customerEircode ? `${data.customerEircode}, ` : ''
          }${data?.customerCountry ? `${data.customerCountry}` : ''}`}</Text>
        </View>
      </View>
      {data?.isWaste ? (
        <View style={styles.containerRow}>
          <View style={styles.orderNumberFullWidth}>
            <View style={styles.boxRow}>
              <Text style={styles.label}>Docket Number:</Text>
              <Text style={styles.value}>{`${data?.individualDocketNumber}`}</Text>
            </View>
          </View>
          <View style={styles.dateFullWidth}>
            <View style={styles.boxRow}>
              <Text style={styles.label}>Date:</Text>
              <Text style={styles.value}>{dayjs(dayjs(data.date)).format('DD MMM YYYY')}</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.noWasteOrderNumberAndDateRow}>
          <View style={styles.orderNumber}>
            <View style={styles.boxRow}>
              <Text style={styles.label}>Order No:</Text>
              <Text style={styles.value}>{`${data?.individualDocketNumber}`}</Text>
            </View>
          </View>
          <View style={styles.date}>
            <View style={styles.boxRow}>
              <Text style={styles.label}>Date:</Text>
              <Text style={styles.value}>{dayjs(dayjs(data.date)).format('DD MMM YYYY')}</Text>
            </View>
          </View>
          <View style={styles.driverName}>
            <View style={styles.boxRow}>
              <Text style={styles.driverLabel}>Driver's Name:</Text>
              <Text style={styles.driverValue}>{data?.driverName}</Text>
            </View>
          </View>
        </View>
      )}
      <View style={styles.destinationFacility}>
        <View style={styles.boxRow}>
          <Text style={styles.label}>Destination Facility:</Text>
          <Text style={styles.value}>{`${
            data?.destinationFacilityAddress ? `${data.destinationFacilityAddress}, ` : ''
          } ${data?.destinationFacilityStreet ? `${data.destinationFacilityStreet}, ` : ''}${
            data?.destinationFacilityCity ? `${data.destinationFacilityCity}, ` : ''
          }${data?.destinationFacilityCounty ? `${data.destinationFacilityCounty}, ` : ''}${
            data?.destinationFacilityEircode ? `${data.destinationFacilityEircode}, ` : ''
          }${data?.destinationFacilityCountry ? `${data.destinationFacilityCountry}` : ''}`}</Text>
        </View>
      </View>
      {data?.isWaste ? (
        data?.wastes?.map((item, index) => (
          <View style={styles.wasteDescription} key={index}>
            <View style={styles.boxColumn} wrap={false}>
              <View style={styles.boxRowWasteDesc}>
                <Text style={styles.wasteDesctptionLabel}>Waste Description:</Text>
                <Text style={styles.wasteDescvalue}>
                  {item?.wasteDescription ? item?.wasteDescription : ''}
                </Text>
              </View>
              <View style={styles.boxRow}>
                <Text style={styles.wasteLabel}>Local Authority of Origin:</Text>
                <Text style={styles.value}>
                  {item?.localAuthorityOfOrigin ? item?.localAuthorityOfOrigin : ''}
                </Text>
              </View>
              <View style={styles.boxRow}>
                <Text style={styles.wasteLabel}>Waste LoW Code:</Text>
                <Text style={styles.value}>{`${
                  item?.wasteLoWCode ? item?.wasteLoWCode : ''
                }`}</Text>
              </View>
              <View style={styles.boxRow}>
                <Text style={styles.wasteLabel}>Hazardous:</Text>
                <Text style={styles.value}>{`${item?.isHazardous ? 'Yes' : 'No'}`}</Text>
              </View>
              <View style={styles.boxRow}>
                <Text style={styles.wasteLabel}>Weight:</Text>
                <Text style={styles.value}>{`${
                  item?.wasteQuantity?.amount ? item?.wasteQuantity?.amount : ''
                } ${item?.wasteQuantity?.unit ? item?.wasteQuantity?.unit : ''}`}</Text>
              </View>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.wasteDescription} wrap={false}>
          <View style={styles.boxGeneralDescColumn}>
            <Text style={styles.generalPickupLabe}>General Pickup Description:</Text>
            <Text style={styles.value}>{data?.generalPickupDescription}</Text>
          </View>
        </View>
      )}
      {data?.isWaste && data?.wastes?.length > 0 && (
        <View style={styles.containerRow}>
          <View style={styles.customerSignatureAndBlockLetter}>
            <Text style={styles.signatureLabel}>Customer Signature:</Text>
            {data?.customerSignature && (
              <Image style={styles.signatureImage} src={data?.customerSignature} />
            )}
          </View>
        </View>
      )}
      <View style={styles.vehicleReg} wrap={false}>
        <View style={styles.boxRow}>
          <Text style={styles.label}>Vehicle Reg:</Text>
          <Text style={styles.value}>{data.vehicleRegistration}</Text>
        </View>
      </View>
      <View style={styles.marginTopLarge} wrap={false}>
        <View style={styles.containerRow}>
          <View style={styles.signatureAndBlockLetter}>
            <Text style={styles.signatureLabel}>Signature:</Text>
            {data?.driverSignature.slice(0, 4) === 'data' ? (
              <Image style={styles.signatureImage} src={data?.driverSignature} />
            ) : (
              data?.driverSignature?.length < 50 && (
                <Text style={styles.cursivefontValue}>{data?.driverSignature}</Text>
              )
            )}
          </View>
          <View style={styles.facilityRep}>
            <Text style={styles.signatureLabel}>Facility Rep:</Text>
            {data?.wasteFacilityRepSignature.slice(0, 4) === 'data' ? (
              <Image style={styles.signatureImage} src={data?.wasteFacilityRepSignature} />
            ) : (
              data?.wasteFacilityRepSignature?.length < 50 && (
                <Text style={styles.cursivefontValue}>{data?.wasteFacilityRepSignature}</Text>
              )
            )}
          </View>
        </View>
        {data?.additionalInformation && (
          <View style={styles.additionalInfoContainer}>
            <Text style={styles.additionalInfoLabel}>Additional Information: </Text>
            <Text style={styles.additionalInfoDetail}>{data?.additionalInformation}</Text>
          </View>
        )}
      </View>
      <View wrap={false}>
        {data?.termsAndConditions && (
          <View style={styles.boxColumn}>
            <View style={styles.excludedMaterialHeading}>
              <Text>Terms & Conditions</Text>
            </View>
            <View style={styles.excludedMaterialDefinition}>
              <Text>{data?.termsAndConditions}</Text>
            </View>
          </View>
        )}
      </View>
    </Page>
  </Document>
);

async function GeneratePdfBase64(data, subject, filename, responseType) {
  try {
    const pdfDocument = <MyDocument data={data} />;
    const pdfStream = await pdf(pdfDocument).toBuffer();
    const buffers = [];
    for await (const data of pdfStream) {
      buffers.push(data);
    }
    const finalBuffer = Buffer.concat(buffers);
    if (responseType === 'pdfUrl') {
      return finalBuffer;
    } else {
      const ENV_VALUES = await AwsSecrets.getInstance();
      const apiKey = ENV_VALUES.SEND_GRID_API_KEY ? ENV_VALUES.SEND_GRID_API_KEY : '';
      sgMail.setApiKey(apiKey);
      const msg = {
        to: data?.customerEmail,
        from: 'hello@wastedocket.ie',
        subject: subject,
        html: `<strong>${
          data?.collectionPointAddress
            ? `Collection Point Address: ${data?.collectionPointAddress}`
            : 'Please find the docket for the pickup'
        }</strong>`,
        attachments: [
          {
            content: finalBuffer.toString('base64'),
            filename: filename,
            type: 'application/pdf',
            disposition: 'attachment',
          },
        ],
      };
      await sgMail.send(msg);
      return;
    }
  } catch (error) {
    console.error('Error:', error);
    throw new Error(error);
  }
}

export {GeneratePdfBase64};
