import jwt from 'jsonwebtoken';
import User from '../../../../MongoModels/User';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import Fleet from '../../../../MongoModels/Fleet';
import DestinationFacility from '../../../../MongoModels/DestinationFacility';

export default async function getDestinationFacility(
  _: any,
  {
    facilityInput,
    fleetId,
  }: {
    fleetId: string;
    facilityInput: {
      paginationArgs: {pageNumber: number; itemsPerPage: number};
      searchText: string;
      isPlainText: string;
      filteredFields: [string];
      searchKeyword: string;
    };
  },
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
        functionName: 'getDestinationFacility',
        functionParams: [
          {
            paramName: 'facilityInput',
            paramValue: facilityInput,
            paramType: typeof facilityInput,
          },
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
      functionName: 'getDestinationFacility',
      functionParams: [
        {
          paramName: 'facilityInput',
          paramValue: facilityInput,
          paramType: typeof facilityInput,
        },
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
      paramName: 'facilityInput',
      paramValue: facilityInput,
      paramType: typeof facilityInput,
    },
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
      functionName: 'getDestinationFacility',
      functionParams: functionParams,
    });

    const user = await User.findById(decodedToken.UserId)
      .populate('fleets')
      .populate('invitations')
      .exec();

    if (!user) {
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getDestinationFacility',
        functionParams: functionParams,
        additionalMessage: 'User not found',
        startLogId,
      });
      return {
        destinationFacility: null,
        response: {
          message: 'User not found',
          status: 404,
        },
      };
    }
    const fleet = await Fleet.findById(fleetId);
    await User.findByIdAndUpdate(user._id, {
      $set: {selectedFleet: fleet._id},
    });
    const {paginationArgs, searchText, isPlainText, filteredFields} = facilityInput;

    let searchQuery = {};
    let projectionQuery = {};
    let sortQuery;

    if (searchText) {
      const searchRegex = new RegExp(`^${searchText}`, isPlainText ? 'i' : undefined);
      const fieldsToSearch = facilityInput?.searchKeyword
        ? [facilityInput?.searchKeyword]
        : filteredFields?.length
        ? filteredFields
        : [
            'destinationFacilityData.destinationFacilityName',
            'destinationFacilityData.destinationFacilityAuthorisationNumber',
            'destinationFacilityData.destinationFacilityAddress',
            'destinationFacilityData.destinationFacilityStreet',
            'destinationFacilityData.destinationFacilityCity',
            'destinationFacilityData.destinationFacilityCounty',
            'destinationFacilityData.destinationFacilityEircode',
            'destinationFacilityData.destinationFacilityCountry',
            // 'destinationFacilityData.destinationFacilityLatitude',
            // 'destinationFacilityData.destinationFacilityLongitude',
            // 'destinationFacilityData.destinationFacilityId',
          ];

      searchQuery = {
        $or: fieldsToSearch.map(field => ({[field]: searchRegex})),
      };

      projectionQuery = {};

      sortQuery = {};
    }

    let facility;
    if (paginationArgs) {
      const {pageNumber, itemsPerPage} = paginationArgs;
      const skip = (pageNumber - 1) * itemsPerPage;
      facility = await DestinationFacility.find({
        $and: [{fleet: fleetId}, searchQuery],
      })
        .populate('fleet')
        .populate('user')
        .select(projectionQuery)
        .sort(sortQuery)
        .skip(skip)
        .limit(itemsPerPage)
        .exec();
    } else {
      facility = await DestinationFacility.find({
        $and: [{fleet: fleetId}, searchQuery],
      })
        .populate('fleet')
        .populate('user')
        .select(projectionQuery)
        .sort(sortQuery)
        .exec();
    }

    facility = facility.map(facilityDoc => {
      const facilityObject = facilityDoc.toObject();

      const {_id: innerId, ...destinationFacilityData} = facilityObject.destinationFacilityData;

      return {
        ...facilityObject,
        ...destinationFacilityData,
        _id: facilityObject._id,
      };
    });

    const totalFacilityCount = await DestinationFacility.countDocuments({
      $and: [{fleet: fleetId}, searchQuery],
    }).exec();

    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.INFO,
      functionName: 'getDestinationFacility',
      functionParams: functionParams,
      additionalMessage: 'Query succesful!',
      startLogId,
    });
    return {
      totalCount: totalFacilityCount,
      destinationFacilityData: facility,
      response: {
        message: 'Query Successfull!',
        status: 200,
      },
    };
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getDestinationFacility',
        functionParams: functionParams,
        additionalMessage: 'Invalid Permissions: Invalid JWT Token',
        startLogId,
      });

      return {
        destinationFacility: null,
        response: {
          message: 'Not Authenticated',
          status: 401,
        },
      };
    }

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.ERROR,
      functionName: 'getDestinationFacility',
      functionParams: functionParams,
      additionalMessage: err.message,
      startLogId,
    });

    return {
      destinationFacility: null,
      response: {
        message: err.message,
        status: 500,
      },
    };
  }
}
