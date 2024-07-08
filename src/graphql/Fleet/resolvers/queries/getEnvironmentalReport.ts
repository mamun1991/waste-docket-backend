import jwt from 'jsonwebtoken';
import User from '../../../../MongoModels/User';
import Fleet from '../../../../MongoModels/Fleet';
import Docket from '../../../../MongoModels/Docket';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import isUserOwnerOrMemberOfFleet from '../../../../utils/isUserOwnerOrMemberOfFleet';

export default async function getEnvironmentalReport(
  _: any,
  {fleetId, searchParams},
  context: any
) {
  let startLogId: String;
  const {token} = context;
  let accessTokenSecret: string;
  let decodedToken: AccessToken;
  const ENV_VALUES = await AwsSecrets.getInstance();
  try {
    accessTokenSecret = ENV_VALUES.JWT_ACCESS_TOKEN_SECRET;
    decodedToken = jwt.verify(token, accessTokenSecret) as unknown as AccessToken;
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getEnvironmentalReport',
        functionParams: [
          {
            paramName: 'fleetId',
            paramValue: fleetId,
            paramType: typeof fleetId,
          },
          {
            paramName: 'searchParams',
            paramValue: searchParams,
            paramType: typeof searchParams,
          },
          {
            paramName: 'token',
            paramValue: 'HIDDEN_TOKEN',
            paramType: typeof token,
          },
        ],
        additionalMessage: 'Invalid Permissions: Invalid JWT Token',
        startLogId,
      });

      return {
        response: {
          message: 'Not Authenticated',
          status: 401,
        },
      };
    }

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.ERROR,
      functionName: 'getEnvironmentalReport',
      functionParams: [
        {
          paramName: 'fleetId',
          paramValue: fleetId,
          paramType: typeof fleetId,
        },
        {
          paramName: 'token',
          paramValue: 'HIDDEN_TOKEN',
          paramType: typeof token,
        },
      ],
      additionalMessage: err.message,
      startLogId,
    });

    return {
      response: {
        message: err.message,
        status: 500,
      },
    };
  }

  const functionParams = [
    {
      paramName: 'fleetId',
      paramValue: fleetId,
      paramType: typeof fleetId,
    },
    {
      paramName: 'token',
      paramValue: 'HIDDEN_TOKEN',
      paramType: typeof token,
    },
  ];
  try {
    startLogId = await createApiLog({
      type: ApiLogTypes.QUERY_START,
      level: ApiLogLevels.INFO,
      functionName: 'getEnvironmentalReport',
      functionParams: functionParams,
    });

    const {startDate, endDate, searchText} = searchParams;

    const user = await User.findById(decodedToken.UserId);

    if (!user) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getEnvironmentalReport',
        functionParams: functionParams,
        additionalMessage: 'User not found',
        startLogId,
      });
      return {
        docketData: null,
        response: {
          message: 'User not found',
          status: 404,
        },
      };
    }

    const fleet = await Fleet.findById(fleetId);

    if (!fleet) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getEnvironmentalReport',
        functionParams: functionParams,
        additionalMessage: 'Fleets not found',
        startLogId,
      });
      return {
        docketData: null,
        membersData: null,
        response: {
          message: 'Fleets not found',
          status: 404,
        },
      };
    }

    const isOwnerOrMember = isUserOwnerOrMemberOfFleet(fleet, user);

    if (!isOwnerOrMember) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getEnvironmentalReport',
        functionParams: functionParams,
        additionalMessage: 'User is not a member or owner of this fleet',
        startLogId,
      });
      return {
        docketData: null,
        response: {
          message: 'User is not a member or owner of this fleet',
          status: 404,
        },
      };
    }

    const regex = new RegExp(searchText, 'i');
    let matchClause;

    if (startDate && endDate) {
      matchClause = {
        $and: [
          {fleet: fleet._id},
          {
            $or: [
              {creatorEmail: {$regex: regex}},
              {'docketData.jobId': {$regex: regex}},
              {'docketData.individualDocketNumber': {$regex: regex}},
              {'docketData.prefix': {$regex: regex}},
              {'docketData.longitude': {$regex: regex}},
              {'docketData.latitude': {$regex: regex}},
              {'docketData.vehicleRegistration': {$regex: regex}},
              {'docketData.generalPickupDescription': {$regex: regex}},
              {'docketData.wasteDescription': {$regex: regex}},
              {'docketData.wasteLoWCode': {$regex: regex}},
              {'docketData.localAuthorityOfOrigin': {$regex: regex}},
              {'docketData.collectionPointName': {$regex: regex}},
              {'docketData.collectionPointAddress': {$regex: regex}},
              {'docketData.collectionPointStreet': {$regex: regex}},
              {'docketData.collectionPointCity': {$regex: regex}},
              {'docketData.collectionPointCounty': {$regex: regex}},
              {'docketData.collectionPointEircode': {$regex: regex}},
              {'docketData.collectionPointCountry': {$regex: regex}},
              {'docketData.destinationFacilityLatitude': {$regex: regex}},
              {'docketData.destinationFacilityLongitude': {$regex: regex}},
              {'docketData.destinationFacilityName': {$regex: regex}},
              {'docketData.destinationFacilityAuthorisationNumber': {$regex: regex}},
              {'docketData.destinationFacilityAddress': {$regex: regex}},
              {'docketData.destinationFacilityStreet': {$regex: regex}},
              {'docketData.destinationFacilityCity': {$regex: regex}},
              {'docketData.destinationFacilityCounty': {$regex: regex}},
              {'docketData.destinationFacilityEircode': {$regex: regex}},
              {'docketData.destinationFacilityCountry': {$regex: regex}},
              {'docketData.driverSignature': {$regex: regex}},
              {'docketData.customerSignature': {$regex: regex}},
              {'docketData.wasteFacilityRepSignature': {$regex: regex}},
              {'docketData.portOfExport': {$regex: regex}},
              {'docketData.countryOfDestination': {$regex: regex}},
              {'docketData.facilityAtDestination': {$regex: regex}},
              {'docketData.tfsReferenceNumber': {$regex: regex}},
              {'docketData.additionalInformation': {$regex: regex}},
              {'customerContact.customerName': {$regex: regex}},
              {'customerContact.customerAddress': {$regex: regex}},
              {'customerContact.customerStreet': {$regex: regex}},
              {'customerContact.customerCity': {$regex: regex}},
              {'customerContact.customerCounty': {$regex: regex}},
              {'customerContact.customeEircode': {$regex: regex}},
              {'customerContact.customerCountry': {$regex: regex}},
              {'customerContact.customerEmail': {$regex: regex}},
              {'customerContact.customerId': {$regex: regex}},
            ],
          },
          {
            $or: [{'docketData.date': {$exists: true, $gte: startDate, $lte: endDate}}],
          },
        ],
      };
      if (fleet.ownerEmail === user.personalDetails.email) {
        matchClause.$and.unshift({fleetOwnerEmail: user.personalDetails.email});
      } else {
        matchClause.$and.unshift({user: user._id});
      }
    }

    const query = [
      {
        $lookup: {
          from: 'CustomerContacts',
          localField: 'customerContact',
          foreignField: '_id',
          as: 'customerContact',
        },
      },
      {
        $unwind: '$customerContact',
      },
      {
        $lookup: {
          from: 'destinationFacility',
          localField: 'destinationFacility',
          foreignField: '_id',
          as: 'destinationFacility',
        },
      },
      {
        $unwind: {
          path: '$destinationFacility',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: matchClause,
      },
    ];
    const wasteCodes = ['20 01 02', '20 01 08', '20 03 01 RESDOM', '20 03 01 MDRDOM'];
    const DocketData = await Docket.aggregate(query);
    const [tab1Data, tab2Data, tab3Data] = DocketData.reduce(
      (acc, item) => {
        if (item?.docketData?.isWaste) {
          const wasteData = item.docketData.wastes.map(waste => ({
            wasteLoWCode: waste?.wasteLoWCode,
            localAuthorityOfOrigin: waste.localAuthorityOfOrigin,
            quantity: `${waste.wasteQuantity.amount}${waste.wasteQuantity.unit || ''}`,
            goingToFacility: `${
              item?.destinationFacility?.destinationFacilityData.destinationFacilityAddress
                ? `${item.destinationFacility?.destinationFacilityData.destinationFacilityAddress}, `
                : ''
            } ${
              item?.destinationFacility?.destinationFacilityData.destinationFacilityStreet
                ? `${item.destinationFacility?.destinationFacilityData.destinationFacilityStreet}, `
                : ''
            }${
              item?.destinationFacility?.destinationFacilityData.destinationFacilityCity
                ? `${item.destinationFacility?.destinationFacilityData.destinationFacilityCity}, `
                : ''
            }${
              item?.destinationFacility?.destinationFacilityData.destinationFacilityCounty
                ? `${item.destinationFacility?.destinationFacilityData.destinationFacilityCounty}, `
                : ''
            }${
              item?.destinationFacility?.destinationFacilityData.destinationFacilityEircode
                ? `${item.destinationFacility?.destinationFacilityData.destinationFacilityEircode}, `
                : ''
            }${
              item?.destinationFacility?.destinationFacilityData.destinationFacilityCountry
                ? item.destinationFacility?.destinationFacilityData.destinationFacilityCountry
                : ''
            }`,
          }));
          if (!item?.docketData?.collectedFromWasteFacility) {
            acc[0].push(...wasteData.filter(waste => !wasteCodes.includes(waste.wasteLoWCode)));
          } else {
            acc[1].push(
              ...wasteData.map(wasteItem => ({
                collectedFromFacility: item?.docketData?.collectedFromWasteFacility,
                ...wasteItem,
              }))
            );
          }
          acc[2].push(...wasteData.filter(waste => wasteCodes.includes(waste.wasteLoWCode)));
        }
        return acc;
      },
      [[], [], []]
    );
    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.INFO,
      functionName: 'getEnvironmentalReport',
      functionParams: functionParams,
      additionalMessage: 'Query succesful!',
      startLogId,
    });

    return {
      tab1Data,
      tab2Data,
      tab3Data,
      response: {
        message: 'Query Successful!',
        status: 200,
      },
    };
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getEnvironmentalReport',
        functionParams: functionParams,
        additionalMessage: 'Invalid Permissions: Invalid JWT Token',
        startLogId,
      });

      return {
        docketData: null,
        response: {
          message: 'Not Authenticated',
          status: 401,
        },
      };
    }

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.ERROR,
      functionName: 'getEnvironmentalReport',
      functionParams: functionParams,
      additionalMessage: err.message,
      startLogId,
    });

    return {
      docketData: null,
      response: {
        message: err.message,
        status: 500,
      },
    };
  }
}
