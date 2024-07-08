import jwt from 'jsonwebtoken';
import User from '../../../../MongoModels/User';
import Fleet from '../../../../MongoModels/Fleet';
import {AccessToken} from '../../../../constants/types';
import createApiLog, {ApiLogLevels, ApiLogTypes} from '../../../../utils/createApiLog';
import AwsSecrets from '../../../../utils/getAwsSecrets';
import isUserOwnerOfFleet from '../../../../utils/isUserOwnerOfFleet';
import Suggestion from '../../../../MongoModels/Suggestion';
import {AccountTypes} from '../../../../constants/enums';

export default async function getSuggestions(
  _: any,
  {fleetId, searchParams, doFetchJustCount},
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
      console.log(`(getSuggestions) Invalid Permissions: Invalid JWT Token`);
      await createApiLog({
        type: ApiLogTypes.QUERY_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getSuggestions',
        functionParams: [
          {
            paramName: 'fleetId',
            paramValue: fleetId,
            paramType: typeof fleetId,
          },
          {
            paramName: 'doFetchJustCount',
            paramValue: doFetchJustCount,
            paramType: typeof doFetchJustCount,
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
      functionName: 'getSuggestions',
      functionParams: [
        {
          paramName: 'fleetId',
          paramValue: fleetId,
          paramType: typeof fleetId,
        },
        {
          paramName: 'doFetchJustCount',
          paramValue: doFetchJustCount,
          paramType: typeof doFetchJustCount,
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
    console.log('(getSuggestions) ', err.message);
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
      paramName: 'doFetchJustCount',
      paramValue: doFetchJustCount,
      paramType: typeof doFetchJustCount,
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
      functionName: 'getSuggestions',
      functionParams: functionParams,
    });

    const {pageNumber, resultsPerPage, startDate, endDate, searchText, sortColumn, sortOrder} =
      searchParams;

    const user = await User.findById(decodedToken.UserId).populate('fleets');

    if (!user) {
      console.log(`(getSuggestions) User Not Found ${JSON.stringify(user)}`);
      await createApiLog({
        type: ApiLogTypes.MUTATION_END,
        level: ApiLogLevels.ERROR,
        functionName: 'getSuggestions',
        functionParams: functionParams,
        additionalMessage: 'User not found',
        startLogId,
      });
      return {
        suggestions: null,
        response: {
          message: 'User not found',
          status: 404,
        },
      };
    }

    if (fleetId) {
      const fleet = await Fleet.findById(fleetId);
      if (!fleet) {
        console.log(
          `(getSuggestions) User: ${JSON.stringify(user)} Fleet not found ${JSON.stringify(fleet)}`
        );
        await createApiLog({
          type: ApiLogTypes.MUTATION_END,
          level: ApiLogLevels.ERROR,
          functionName: 'getSuggestions',
          functionParams: functionParams,
          additionalMessage: 'Fleet not found',
          startLogId,
        });
        return {
          suggestions: null,
          response: {
            message: 'Fleet not found',
            status: 404,
          },
        };
      }
      const isOwner = isUserOwnerOfFleet(fleet, user);
      if (!isOwner) {
        console.log(
          `(getSuggestions) User: ${JSON.stringify(
            user
          )} is not the owner of this fleet ${JSON.stringify(fleet)}`
        );
        await createApiLog({
          type: ApiLogTypes.MUTATION_END,
          level: ApiLogLevels.ERROR,
          functionName: 'getSuggestions',
          functionParams: functionParams,
          additionalMessage: 'User is not the owner of this fleet',
          startLogId,
        });
        return {
          suggestions: null,
          response: {
            message: 'User is not the owner of this fleet',
            status: 401,
          },
        };
      }
    } else {
      if (user.accountType !== AccountTypes.ADMIN) {
        await createApiLog({
          type: ApiLogTypes.MUTATION_END,
          level: ApiLogLevels.ERROR,
          functionName: 'getSuggestions',
          functionParams: [
            {
              paramName: 'userId',
              paramValue: decodedToken.UserId,
              paramType: typeof decodedToken.UserId,
            },
          ],
          additionalMessage: 'User is not an admin.',
          startLogId,
        });
        return {
          message: 'User is not an admin.',
          status: 403,
        };
      }
    }

    const regex = new RegExp(searchText, 'i');
    let matchClause;
    matchClause = {
      $and: [
        fleetId ? {fleet: fleetId} : {},
        {
          $or: [{email: {$regex: regex}}, {name: {$regex: regex}}, {suggestion: {$regex: regex}}],
        },
        startDate && endDate
          ? {
              $or: [{createdAt: {$exists: true, $gte: startDate, $lte: endDate}}],
            }
          : {},
      ],
    };

    let sorts = {
      asc: 1,
      desc: -1,
    };

    const totalCount = await Suggestion.count(matchClause);
    let suggestionData;
    if (!doFetchJustCount) {
      if (pageNumber && resultsPerPage) {
        suggestionData = await Suggestion.find(matchClause)
          .populate('fleet')
          .sort({
            [sortColumn]: sorts[sortOrder as 'asc' | 'desc'] as 1 | -1,
          })
          .collation({locale: 'en', strength: 2})
          .skip(pageNumber * resultsPerPage - resultsPerPage)
          .limit(resultsPerPage);

        console.log(`(getSuggestions) suggestionData: ${JSON.stringify(suggestionData)}`);
      } else {
        suggestionData = await Suggestion.find(matchClause)
          .populate('fleet')
          .sort({
            [sortColumn]: sorts[sortOrder as 'asc' | 'desc'] as 1 | -1,
          })
          .collation({locale: 'en', strength: 2});
        console.log(`(getSuggestions) suggestionData: ${JSON.stringify(suggestionData)}`);
      }
    }

    await createApiLog({
      type: ApiLogTypes.MUTATION_END,
      level: ApiLogLevels.INFO,
      functionName: 'getSuggestions',
      functionParams: functionParams,
      additionalMessage: 'Query succesful!',
      startLogId,
    });

    return {
      totalCount: totalCount,
      suggestions: suggestionData,
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
        functionName: 'getSuggestions',
        functionParams: functionParams,
        additionalMessage: 'Invalid Permissions: Invalid JWT Token',
        startLogId,
      });

      return {
        suggestions: null,
        response: {
          message: 'Not Authenticated',
          status: 401,
        },
      };
    }

    await createApiLog({
      type: ApiLogTypes.QUERY_END,
      level: ApiLogLevels.ERROR,
      functionName: 'getSuggestions',
      functionParams: functionParams,
      additionalMessage: err.message,
      startLogId,
    });
    console.log(`(getSuggestions) User: ${decodedToken.UserId} ${err.message}`);
    return {
      suggestions: null,
      response: {
        message: err.message,
        status: 500,
      },
    };
  }
}
