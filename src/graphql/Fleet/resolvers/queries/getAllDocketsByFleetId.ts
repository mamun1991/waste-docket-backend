import jwt from 'jsonwebtoken';
import User from '../../../../MongoModels/User';
import Fleet from '../../../../MongoModels/Fleet';
import Docket from '../../../../MongoModels/Docket';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import isUserOwnerOfFleet from '../../../../utils/isUserOwnerOfFleet';

export default async function getAllDocketsByFleetId(
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
      console.log(`(getAllDocketsByFleetId) Invalid Permissions: Invalid JWT Token`);
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getAllDocketsByFleetId',
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
      functionName: 'getAllDocketsByFleetId',
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
    console.log('(getAllDocketsByFleetId) ', err.message);
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
      functionName: 'getAllDocketsByFleetId',
      functionParams: functionParams,
    });

    const {pageNumber, resultsPerPage, startDate, endDate, searchText} = searchParams;

    const user = await User.findById(decodedToken.UserId).populate('fleets');

    if (!user) {
      console.log(`(getAllDocketsByFleetId) User Not Found ${JSON.stringify(user)}`);
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getAllDocketsByFleetId',
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
      console.log(
        `(getAllDocketsByFleetId) User: ${JSON.stringify(user)} Fleet not found ${JSON.stringify(
          fleet
        )}`
      );
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getAllDocketsByFleetId',
        functionParams: functionParams,
        additionalMessage: 'Fleet not found',
        startLogId,
      });
      return {
        docketData: null,
        membersData: null,
        response: {
          message: 'Fleet not found',
          status: 404,
        },
      };
    }

    const isOwner = isUserOwnerOfFleet(fleet, user);

    if (!isOwner) {
      console.log(
        `(getAllDocketsByFleetId) User: ${JSON.stringify(
          user
        )} is not the owner of this fleet ${JSON.stringify(fleet)}`
      );
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getAllDocketsByFleetId',
        functionParams: functionParams,
        additionalMessage: 'User is not the owner of this fleet',
        startLogId,
      });
      return {
        docketData: null,
        response: {
          message: 'User is not the owner of this fleet',
          status: 401,
        },
      };
    }
    const regex = new RegExp(searchText, 'i');
    let matchClause;
    if (startDate && endDate) {
      matchClause = {
        $and: [
          {fleet: fleet._id},
          {fleetOwnerEmail: user.personalDetails.email},
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
          {fleet: fleet._id},
          {fleetOwnerEmail: user.personalDetails.email},
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
        ],
      };
    }

    // Define the dynamic $project stage for null checks on all fields
    const projectStage = {
      $project: {
        fleet: {$ifNull: ['$fleet', null]},
        user: {$ifNull: ['$user', null]},
        customerContact: {$ifNull: ['$customerContact', {}]},
        destinationFacility: {$ifNull: ['$destinationFacility', {}]},
        creatorEmail: {$ifNull: ['$creatorEmail', null]},
        fleetOwnerEmail: {$ifNull: ['$fleetOwnerEmail', null]},
        docketData: {
          $cond: [
            {$eq: ['$docketData', null]},
            null,
            {
              jobId: {$ifNull: ['$docketData.jobId', null]},
              individualDocketNumber: {$ifNull: ['$docketData.individualDocketNumber', null]},
              prefix: {$ifNull: ['$docketData.prefix', null]},
              docketNumber: {$ifNull: ['$docketData.docketNumber', null]},
              gpsOn: {$ifNull: ['$docketData.gpsOn', null]},
              longitude: {$ifNull: ['$docketData.longitude', null]},
              latitude: {$ifNull: ['$docketData.latitude', null]},
              date: {$ifNull: ['$docketData.date', null]},
              time: {$ifNull: ['$docketData.time', null]},
              vehicleRegistration: {$ifNull: ['$docketData.vehicleRegistration', null]},
              isWaste: {$ifNull: ['$docketData.isWaste', null]},
              generalPickupDescription: {$ifNull: ['$docketData.generalPickupDescription', null]},
              nonWasteLoadPictures: {$ifNull: ['$docketData.nonWasteLoadPictures', null]},
              wastes: {
                $map: {
                  input: '$docketData.wastes',
                  as: 'waste',
                  in: {
                    wasteDescription: {$ifNull: ['$$waste.wasteDescription', null]},
                    wasteLoWCode: {$ifNull: ['$$waste.wasteLoWCode', null]},
                    isHazardous: {$ifNull: ['$$waste.isHazardous', null]},
                    localAuthorityOfOrigin: {$ifNull: ['$$waste.localAuthorityOfOrigin', null]},
                    wasteQuantity: {
                      unit: {$ifNull: ['$$waste.wasteQuantity.unit', null]},
                      amount: {$ifNull: ['$$waste.wasteQuantity.amount', null]},
                    },
                    wasteLoadPicture: {$ifNull: ['$$waste.wasteLoadPicture', null]},
                  },
                },
              },
              collectedFromWasteFacility: {
                $ifNull: ['$docketData.collectedFromWasteFacility', null],
              },
              collectionPointName: {$ifNull: ['$docketData.collectionPointName', null]},
              collectionPointAddress: {$ifNull: ['$docketData.collectionPointAddress', null]},
              collectionPointStreet: {$ifNull: ['$docketData.collectionPointStreet', null]},
              collectionPointCity: {$ifNull: ['$docketData.collectionPointCity', null]},
              collectionPointCounty: {$ifNull: ['$docketData.collectionPointCounty', null]},
              collectionPointEircode: {$ifNull: ['$docketData.collectionPointEircode', null]},
              collectionPointCountry: {$ifNull: ['$docketData.collectionPointCountry', null]},
              driverSignature: {$ifNull: ['$docketData.driverSignature', null]},
              customerSignature: {$ifNull: ['$docketData.customerSignature', null]},
              wasteFacilityRepSignature: {$ifNull: ['$docketData.wasteFacilityRepSignature', null]},
              isLoadForExport: {$ifNull: ['$docketData.isLoadForExport', null]},
              portOfExport: {$ifNull: ['$docketData.portOfExport', null]},
              countryOfDestination: {$ifNull: ['$docketData.countryOfDestination', null]},
              facilityAtDestination: {$ifNull: ['$docketData.facilityAtDestination', null]},
              tfsReferenceNumber: {$ifNull: ['$docketData.tfsReferenceNumber', null]},
              additionalInformation: {$ifNull: ['$docketData.additionalInformation', null]},
            },
          ],
        },
      },
    };
    const query = [
      {
        $lookup: {
          from: 'CustomerContacts',
          let: {customerContactId: '$customerContact'},
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$_id', '$$customerContactId'],
                },
              },
            },
            {
              $limit: 1,
            },
          ],
          as: 'customerContact',
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
          let: {userId: '$user'},
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$_id', '$$userId'],
                },
              },
            },
            {
              $limit: 1,
            },
          ],
          as: 'user',
        },
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'destinationFacility',
          let: {destinationFacilityId: '$destinationFacility'},
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$_id', '$$destinationFacilityId'],
                },
              },
            },
            {
              $limit: 1,
            },
          ],
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
      projectStage,
    ];

    await User.findByIdAndUpdate(user._id, {
      $set: {selectedFleet: fleet._id},
    });

    const totalCountResult = await Docket.aggregate(query);
    const totalCount = totalCountResult ? totalCountResult?.length : 0;
    let DocketData;
    if (pageNumber && resultsPerPage) {
      DocketData = await Docket.aggregate(query)
        .skip(pageNumber * resultsPerPage - resultsPerPage)
        .limit(resultsPerPage);

      console.log(`(getAllDocketsByFleetId) DocketData: ${JSON.stringify(DocketData)}`);
    } else {
      DocketData = await Docket.aggregate(query);
      console.log(`(getAllDocketsByFleetId) DocketData: ${JSON.stringify(DocketData)}`);
    }

    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.INFO,
      functionName: 'getAllDocketsByFleetId',
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
        functionName: 'getAllDocketsByFleetId',
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
      functionName: 'getAllDocketsByFleetId',
      functionParams: functionParams,
      additionalMessage: err.message,
      startLogId,
    });
    console.log(`(getAllDocketsByFleetId) User: ${decodedToken.UserId} ${err.message}`);
    return {
      docketData: null,
      response: {
        message: err.message,
        status: 500,
      },
    };
  }
}
