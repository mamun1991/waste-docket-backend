import jwt from 'jsonwebtoken';
import User from '../../../../MongoModels/User';
import Fleet from '../../../../MongoModels/Fleet';
import Docket from '../../../../MongoModels/Docket';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import isUserOwnerOrMemberOfFleet from '../../../../utils/isUserOwnerOrMemberOfFleet';

export default async function getDocketsByFleetIdWithSorting(
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
      console.log(`(getDocketsByFleetIdWithSorting) Invalid Permissions: Invalid JWT Token`);
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getDocketsByFleetIdWithSorting',
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
      functionName: 'getDocketsByFleetIdWithSorting',
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
    console.log(`(getDocketsByFleetIdWithSorting) User: ${decodedToken.UserId}`, err.message);
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
      functionName: 'getDocketsByFleetIdWithSorting',
      functionParams: functionParams,
    });

    const {pageNumber, resultsPerPage, startDate, endDate, searchText, sortColumn, sortOrder} =
      searchParams;

    const user = await User.findById(decodedToken.UserId);

    if (!user) {
      console.log(`(getDocketsByFleetIdWithSorting) User Not Found ${JSON.stringify(user)}`);
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getDocketsByFleetIdWithSorting',
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
      console.log(`(getDocketsByFleetIdWithSorting) Fleets not found ${JSON.stringify(fleet)}`);
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getDocketsByFleetIdWithSorting',
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
      console.log(`(getDocketsByFleetIdWithSorting) User is not a member or owner of this fleet`);
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getDocketsByFleetIdWithSorting',
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
    await User.findByIdAndUpdate(user._id, {
      $set: {selectedFleet: fleet._id},
    });

    const regex = new RegExp(searchText, 'i');
    let matchClause;

    if (startDate && endDate) {
      matchClause = {
        $and: [
          {user: user._id},
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
            $or: [
              {
                $and: [{'docketData.date': startDate}, {'docketData.time': {$gte: '03:00'}}],
              },
              {
                $and: [{'docketData.date': {$gt: startDate, $lt: endDate}}],
              },
              {
                $and: [{'docketData.date': endDate}, {'docketData.time': {$lt: '03:00'}}],
              },
              {
                $and: [
                  {
                    'docketData.date': {
                      $eq: new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000)
                        .toISOString()
                        .split('T')[0],
                    },
                  },
                  {'docketData.time': {$lt: '03:00'}},
                ],
              },
            ],
          },
        ],
      };
    } else {
      matchClause = {
        $and: [
          {user: user._id},
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
        ],
      };
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
    let sorts = {
      asc: 1,
      desc: -1,
    };
    const totalCountResult = await Docket.aggregate(query);
    const totalCount = totalCountResult ? totalCountResult?.length : 0;
    let DocketData;
    if (pageNumber && resultsPerPage) {
      DocketData = await Docket.aggregate(query)
        .sort({
          [sortColumn]: sorts[sortOrder as 'asc' | 'desc'] as 1 | -1,
        })
        .collation({locale: 'en', strength: 2})
        .skip(pageNumber * resultsPerPage - resultsPerPage)
        .limit(resultsPerPage);
      console.log(
        `(getDocketsByFleetIdWithSorting) User: ${JSON.stringify(
          user
        )} DocketData: ${JSON.stringify(DocketData)}`
      );
    } else {
      DocketData = await Docket.aggregate(query)
        .sort({
          [sortColumn]: sorts[sortOrder as 'asc' | 'desc'] as 1 | -1,
        })
        .collation({locale: 'en', strength: 2});
      console.log(
        `(getDocketsByFleetIdWithSorting) User: ${JSON.stringify(
          user
        )} DocketData: ${JSON.stringify(DocketData)}`
      );
    }

    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.INFO,
      functionName: 'getDocketsByFleetIdWithSorting',
      functionParams: functionParams,
      additionalMessage: 'Query succesful!',
      startLogId,
    });

    return {
      totalCount: totalCount,
      docketData: DocketData,
      fleet: fleet,
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
        functionName: 'getDocketsByFleetIdWithSorting',
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
      functionName: 'getDocketsByFleetIdWithSorting',
      functionParams: functionParams,
      additionalMessage: err.message,
      startLogId,
    });
    console.log(`(getDocketsByFleetIdWithSorting) User: ${decodedToken.UserId}`, err.message);
    return {
      docketData: null,
      response: {
        message: err.message,
        status: 500,
      },
    };
  }
}
