import jwt from 'jsonwebtoken';
import User from '../../../../MongoModels/User';
import Docket from '../../../../MongoModels/Docket';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import {AccountTypes} from '../../../../constants/enums';

export default async function getAllDocketsForAdminWithSorting(
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
        functionName: 'getAllDocketsForAdminWithSorting',
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
      functionName: 'getAllDocketsForAdminWithSorting',
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
      functionName: 'getAllDocketsForAdminWithSorting',
      functionParams: functionParams,
    });

    const {pageNumber, resultsPerPage, startDate, endDate, searchText, sortColumn, sortOrder} =
      searchParams;
    console.log(searchParams);

    const user = await User.findById(decodedToken.UserId);

    if (!user) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getAllDocketsForAdminWithSorting',
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

    if (user.accountType !== AccountTypes.ADMIN) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getAllFleetsForAdmin',
        functionParams: functionParams,
        additionalMessage: 'User is not an admin.',
        startLogId,
      });
      return {
        fleetData: null,
        response: {
          message: 'User is not an admin.',
          status: 404,
        },
      };
    }

    const regex = new RegExp(searchText, 'i');
    let matchClause;
    if (startDate && endDate) {
      matchClause = {
        $and: [
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
              {
                'destinationFacility.destinationFacilityData.destinationFacilityName': {
                  $regex: regex,
                },
              },
              {
                'destinationFacility.destinationFacilityData.destinationFacilityAuthroisationNumber':
                  {
                    $regex: regex,
                  },
              },
              {
                'destinationFacility.destinationFacilityData.destinationFacilityCity': {
                  $regex: regex,
                },
              },
              {
                'destinationFacility.destinationFacilityData.destinationFacilityAddress': {
                  $regex: regex,
                },
              },
              {
                'destinationFacility.destinationFacilityData.destinationFacilityCountry': {
                  $regex: regex,
                },
              },
              {
                'destinationFacility.destinationFacilityData.destinationFacilityEircode': {
                  $regex: regex,
                },
              },
            ],
          },
          {
            $or: [{'docketData.date': {$exists: true, $gte: startDate, $lte: endDate}}],
          },
        ],
      };
    } else {
      matchClause = {
        $and: [
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
              {
                'destinationFacility.destinationFacilityData.destinationFacilityName': {
                  $regex: regex,
                },
              },
              {
                'destinationFacility.destinationFacilityData.destinationFacilityAuthroisationNumber':
                  {
                    $regex: regex,
                  },
              },
              {
                'destinationFacility.destinationFacilityData.destinationFacilityCity': {
                  $regex: regex,
                },
              },
              {
                'destinationFacility.destinationFacilityData.destinationFacilityAddress': {
                  $regex: regex,
                },
              },
              {
                'destinationFacility.destinationFacilityData.destinationFacilityCountry': {
                  $regex: regex,
                },
              },
              {
                'destinationFacility.destinationFacilityData.destinationFacilityEircode': {
                  $regex: regex,
                },
              },
            ],
          },
        ],
      };
    }
    
    const queryCount = [
      {
        $lookup: {
          from: 'CustomerContacts',
          localField: 'customerContact',
          foreignField: '_id',
          as: 'customerContact',
        },
      },
      {
        $addFields: {
          customerContact: {
            $cond: [{$eq: ['$customerContact', []]}, {}, {$arrayElemAt: ['$customerContact', 0]}],
          },
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
        $addFields: {
          destinationFacility: {
            $cond: [
              {$eq: ['$destinationFacility', []]},
              {},
              {$arrayElemAt: ['$destinationFacility', 0]},
            ],
          },
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
      {
        $count: 'totalCount',
      },
    ];

    const [totalCountResult] = await Docket.aggregate(queryCount);
    const totalCount = totalCountResult ? totalCountResult.totalCount : 0;

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
        $addFields: {
          customerContact: {
            $cond: [{$eq: ['$customerContact', []]}, {}, {$arrayElemAt: ['$customerContact', 0]}],
          },
        },
      },
      {
        $unwind: {
          path: '$customerContact',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $addFields: {
          user: {$cond: [{$eq: ['$user', []]}, {}, {$arrayElemAt: ['$user', 0]}]},
        },
      },
      {
        $unwind: '$user',
      },
      {
        $lookup: {
          from: 'fleets',
          localField: 'fleet',
          foreignField: '_id',
          as: 'fleet',
        },
      },
      {
        $unwind: '$fleet',
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
        $addFields: {
          destinationFacility: {
            $cond: [
              {$eq: ['$destinationFacility', []]},
              {},
              {$arrayElemAt: ['$destinationFacility', 0]},
            ],
          },
        },
      },
      {
        $match: matchClause,
      },
    ];

    let sorts = {
      asc: 1,
      desc: -1,
    };
    let DocketData = await Docket.aggregate(query)
      .sort({
        [sortColumn]: sorts[sortOrder as 'asc' | 'desc'] as 1 | -1,
      })
      .collation({locale: 'en', strength: 2})
      .skip(pageNumber * resultsPerPage - resultsPerPage)
      .limit(resultsPerPage);

    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.INFO,
      functionName: 'getAllDocketsForAdminWithSorting',
      functionParams: functionParams,
      additionalMessage: 'Query succesful!',
      startLogId,
    });

    return {
      totalCount: totalCount,
      docketData: DocketData,
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
        functionName: 'getAllDocketsForAdminWithSorting',
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
      functionName: 'getAllDocketsForAdminWithSorting',
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
